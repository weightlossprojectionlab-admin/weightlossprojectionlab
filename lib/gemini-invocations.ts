/**
 * Gemini invocation log — writes one Firestore doc per AI call.
 *
 * Lands in the existing `api_usage_logs` collection alongside
 * barcode-lookup telemetry. Disambiguated by `kind: 'gemini'` so
 * existing barcode-lookup queries (filter by `source` ∈
 * {'cache','openfoodfacts','usda'}) are unaffected.
 *
 * Why share the collection: it's already the per-call external-API
 * outcome bucket. A separate `gemini_invocations` collection would
 * fragment the "what did we spend on third-party APIs today" view.
 *
 * Privacy: NEVER log the prompt, response, or any patient PHI. Only
 * structural metadata (function name, model, latency, success,
 * sizes, recipe-level taxonomy tags). Callers must not pass user
 * data through `metadata`.
 *
 * Best-effort: telemetry failures are caught + logged but never
 * thrown back to the caller — a Firestore outage must not break the
 * Gemini call's own success/failure semantics.
 *
 * SERVER-ONLY — uses adminDb.
 */
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

export interface GeminiInvocationLog {
  /** Function or route that issued the Gemini call (e.g., 'classifyIngredientAllergens'). */
  fnName: string
  /** Model identifier as passed to getGenerativeModel (e.g., 'gemini-2.5-flash'). */
  model: string
  /** Wall-clock duration in ms from request start to response parse (or thrown error). */
  latencyMs: number
  /** True when the Gemini call returned and parsed cleanly; false on any thrown error. */
  success: boolean
  /** Stringified error message on failure. No stack, no PHI. */
  error?: string
  /** Caller-defined input scale (chars, ingredient count, etc.). Document per caller. */
  inputSize?: number
  /** Caller-defined output scale. */
  outputSize?: number
  /** Authenticated user that triggered the call, if available. */
  userId?: string
  /** Function-specific structural context. MUST NOT contain PHI or raw user input. */
  metadata?: Record<string, unknown>
}

export async function logGeminiInvocation(log: GeminiInvocationLog): Promise<void> {
  try {
    await adminDb.collection('api_usage_logs').add({
      ...log,
      kind: 'gemini',
      source: 'gemini',
      timestamp: new Date(),
    })
  } catch (err) {
    logger.error('Failed to log Gemini invocation', err as Error, {
      fnName: log.fnName,
      model: log.model,
    })
  }
}
