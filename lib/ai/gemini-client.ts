/**
 * Shared Gemini client.
 *
 * Replaces the 14+ duplicated copies of `new GoogleGenerativeAI(...)`
 * across the codebase, each with its own `process.env.GEMINI_API_KEY || ''`
 * empty-string fallback footgun. One place to:
 *   - check the key (validateGeminiConfig)
 *   - default the model
 *   - log every call to api_usage_logs (kind:'gemini') via T3.10
 *   - run JSON.parse + optional Zod validation in the same step
 *
 * Pattern (the migration target for all PHI pipelines):
 *
 *   const data = await generateGeminiJSON({
 *     fnName: 'classifyMedicationConditions',
 *     prompt,
 *     geminiSchema: classifierSchema,         // Gemini SDK SchemaType
 *     validateSchema: ZodResponseSchema,      // optional Zod gate
 *     inputSize: medications.length,
 *     metadata: { ...structuralOnlyContext },
 *   })
 *
 * generateGeminiJSON throws on hard failure (network, missing key,
 * malformed JSON, schema-validation failure) so callers branch in
 * try/catch. The invocation log captures success/failure with
 * structural metadata only — never the prompt or response.
 *
 * SERVER-ONLY. Reads GEMINI_API_KEY (server-only env). Never import
 * from a client component — adds firebase-admin -> child_process to
 * the bundle graph and breaks builds. Route client requests through
 * an /api/* endpoint.
 */

import {
  GoogleGenerativeAI,
  type ResponseSchema,
} from '@google/generative-ai'
import type { ZodSchema } from 'zod'
import { logger } from '@/lib/logger'
import { logGeminiInvocation } from '@/lib/gemini-invocations'

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'

/** Lazy SDK singleton. Initialized on first use after the key check. */
let genAIInstance: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (genAIInstance) return genAIInstance
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    throw new Error('[gemini-client] GEMINI_API_KEY is missing')
  }
  genAIInstance = new GoogleGenerativeAI(key)
  return genAIInstance
}

/**
 * True when GEMINI_API_KEY is set. Cheap to call from request
 * handlers to short-circuit before the lazy SDK init throws.
 */
export function validateGeminiConfig(): { valid: boolean; error?: string } {
  if (!process.env.GEMINI_API_KEY) {
    return {
      valid: false,
      error: 'GEMINI_API_KEY not configured in environment variables',
    }
  }
  return { valid: true }
}

export interface GeminiImagePart {
  /**
   * Base64 image data. Can be a raw base64 string OR a data URL
   * (`data:image/jpeg;base64,...`); the data-URL prefix is stripped
   * automatically.
   */
  data: string
  /** Defaults to 'image/jpeg' when omitted. */
  mimeType?: string
}

export interface GenerateGeminiJSONOpts<T> {
  /** Function or route name for the invocation log (e.g., 'classifyIngredientAllergens'). */
  fnName: string
  /** Prompt text passed to model.generateContent. */
  prompt: string
  /** Optional image parts for vision calls (medication-OCR, weight-OCR, document-OCR). */
  images?: GeminiImagePart[]
  /** Override the default model. */
  model?: string
  /** Gemini SDK schema (SchemaType-based). When set, the SDK enforces shape during generation. */
  geminiSchema?: ResponseSchema
  /** Zod schema for runtime validation after JSON.parse. Throws on validation failure. */
  validateSchema?: ZodSchema<T>
  /** Sampling temperature. Default 0.1 for medical/structured outputs. */
  temperature?: number
  /** Cap on response token count. Default unset (uses Gemini's default). Long-form
   *  document extraction needs ~4096; structured tag classification needs ~512. */
  maxOutputTokens?: number
  /** Function-specific input scale (chars, item count, etc.) — recorded in the invocation log. */
  inputSize?: number
  /** Function-specific structural metadata for the invocation log. MUST NOT contain PHI. */
  metadata?: Record<string, unknown>
}

/**
 * Run a Gemini JSON generation: call model, parse response, optionally
 * validate via Zod, and log the invocation.
 *
 * Throws on:
 *   - missing GEMINI_API_KEY
 *   - Gemini network / rate-limit / 5xx error
 *   - JSON.parse failure
 *   - Zod validation failure (when validateSchema is provided)
 *
 * On all failure paths, an invocation log entry with success:false is
 * written before the error is re-thrown.
 */
export async function generateGeminiJSON<T = unknown>(
  opts: GenerateGeminiJSONOpts<T>,
): Promise<T> {
  const {
    fnName,
    prompt,
    images,
    model: modelId = DEFAULT_GEMINI_MODEL,
    geminiSchema,
    validateSchema,
    temperature = 0.1,
    maxOutputTokens,
    inputSize,
    metadata,
  } = opts

  const startedAt = Date.now()

  try {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({
      model: modelId,
      generationConfig: {
        responseMimeType: 'application/json',
        ...(geminiSchema ? { responseSchema: geminiSchema } : {}),
        ...(maxOutputTokens ? { maxOutputTokens } : {}),
        temperature,
      },
    })

    // Build the request as a parts array when images are provided
    // (vision call), otherwise pass the prompt string directly. Both
    // forms are accepted by model.generateContent; the parts form is
    // required for inlineData.
    const result = images && images.length > 0
      ? await model.generateContent([
          prompt,
          ...images.map((img) => ({
            inlineData: {
              data: img.data.replace(/^data:image\/\w+;base64,/, ''),
              mimeType: img.mimeType ?? 'image/jpeg',
            },
          })),
        ])
      : await model.generateContent(prompt)

    const text = result.response.text()
    const parsed: unknown = JSON.parse(text)

    if (validateSchema) {
      const validation = validateSchema.safeParse(parsed)
      if (!validation.success) {
        // Throw a structured error with summary issues; caller logs
        // structural-only metadata before re-throwing if it wants.
        const summary = validation.error.issues.slice(0, 5).map((i) => ({
          path: i.path.join('.'),
          code: i.code,
        }))
        const err = new Error(
          `[gemini-client] ${fnName} output failed schema validation (${validation.error.issues.length} issues)`,
        )
        ;(err as Error & { issues?: unknown }).issues = summary
        throw err
      }
      await logGeminiInvocation({
        fnName,
        model: modelId,
        latencyMs: Date.now() - startedAt,
        success: true,
        inputSize,
        metadata,
      })
      return validation.data
    }

    await logGeminiInvocation({
      fnName,
      model: modelId,
      latencyMs: Date.now() - startedAt,
      success: true,
      inputSize,
      metadata,
    })
    return parsed as T
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err)
    await logGeminiInvocation({
      fnName,
      model: modelId,
      latencyMs: Date.now() - startedAt,
      success: false,
      error: errMessage,
      inputSize,
      metadata,
    })
    logger.error(`[gemini-client] ${fnName} call failed`, err as Error, {
      model: modelId,
    })
    throw err
  }
}
