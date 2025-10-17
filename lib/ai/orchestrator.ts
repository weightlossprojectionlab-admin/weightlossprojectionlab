// AI Orchestration Layer
// PRD Reference: Phase 3 - AI Orchestration Layer
// TODO: Link to PRD v1.3.7 § Phase 3

import {
  AIContext,
  AIOrchestrationRequest,
  AIOrchestrationResponse,
  DataSensitivity,
} from '@/types/ai';
import { getTemplate, renderTemplate, validateVariables } from './promptTemplates';
import { selectModel, getRecommendedModel } from './modelRouter';
import { redactPII, redactFields } from './piiRedaction';
import { logAIDecision } from './decisionLogger';

/**
 * Main AI orchestration function
 * Handles: template rendering, PII redaction, model selection, API call, logging
 *
 * PRD Reference: Phase 3 - AI Orchestration Layer with prompt templates,
 * PII redaction, model router, decision logs
 *
 * @param request - Orchestration request
 * @returns AI response with decision metadata
 */
export async function orchestrateAI(
  request: AIOrchestrationRequest
): Promise<AIOrchestrationResponse> {
  const startTime = Date.now();

  try {
    // 1. Load and validate template
    const template = getTemplate(request.templateId);
    if (!template) {
      throw new Error(`Template not found: ${request.templateId}`);
    }

    const validation = validateVariables(request.templateId, request.variables);
    if (!validation.valid) {
      throw new Error(`Missing variables: ${validation.missing.join(', ')}`);
    }

    // 2. Redact PII from variables if needed
    let processedVariables = { ...request.variables };
    if (template.piiFields.length > 0) {
      processedVariables = redactFields(processedVariables, template.piiFields);
    }

    // 3. Render prompt with variables
    const prompt = renderTemplate(request.templateId, processedVariables);
    if (!prompt) {
      throw new Error('Failed to render template');
    }

    // 4. Select appropriate model
    const context: AIContext = {
      userId: request.userId,
      templateId: request.templateId,
      variables: request.variables,
      dataSensitivity: request.dataSensitivity,
      requiresHighAccuracy: request.requiresHighAccuracy,
      maxLatencyMs: request.maxLatencyMs,
    };

    const selectedModel = selectModel(context);

    // 5. Call OpenAI API
    const apiResponse = await callOpenAI({
      model: selectedModel.id,
      prompt,
      maxTokens: template.maxTokens,
      temperature: template.temperature,
    });

    const latencyMs = Date.now() - startTime;

    // 6. Parse response and extract confidence/rationale
    const parsed = parseAIResponse(apiResponse.content, template.category);

    // 7. Log decision
    const decisionId = await logAIDecision({
      decision: parsed.decision,
      confidence: parsed.confidence,
      rationale: parsed.rationale,
      policyReference: `PRD v1.3.7 § ${template.category}`,
      model: selectedModel.id,
      modelTier: selectedModel.tier,
      executedBy: 'AISA',
      userId: request.userId,
      templateId: request.templateId,
      dataSensitivity: request.dataSensitivity,
      inputTokens: apiResponse.inputTokens,
      outputTokens: apiResponse.outputTokens,
      latencyMs,
    });

    return {
      decisionId,
      result: parsed.decision,
      confidence: parsed.confidence,
      rationale: parsed.rationale,
      model: selectedModel.id,
      modelTier: selectedModel.tier,
      latencyMs,
      policyReference: `PRD v1.3.7 § ${template.category}`,
    };
  } catch (error) {
    console.error('[AI Orchestrator] Error:', error);
    throw error;
  }
}

/**
 * Call OpenAI API
 * Wrapper function for OpenAI calls with error handling
 */
async function callOpenAI(params: {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<{
  content: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          {
            role: 'system',
            content: 'You are AISA, an AI assistant for the Weight Loss Progress Lab (WLPL) application.',
          },
          {
            role: 'user',
            content: params.prompt,
          },
        ],
        max_tokens: params.maxTokens || 500,
        temperature: params.temperature || 0.7,
        response_format: { type: 'json_object' },  // Request JSON mode
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0]?.message?.content || '{}',
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    };
  } catch (error) {
    console.error('[AI Orchestrator] OpenAI API call failed:', error);
    throw error;
  }
}

/**
 * Parse AI response and extract decision/confidence/rationale
 * Different templates may return different JSON structures
 */
function parseAIResponse(
  content: string,
  category: string
): {
  decision: string;
  confidence: number;
  rationale: string;
} {
  try {
    const parsed = JSON.parse(content);

    // Default structure
    let decision = JSON.stringify(parsed);
    let confidence = 0.8;  // Default confidence
    let rationale = 'AI-generated response';

    // Extract fields based on common patterns
    if ('decision' in parsed) {
      decision = typeof parsed.decision === 'string'
        ? parsed.decision
        : JSON.stringify(parsed.decision);
    }

    if ('confidence' in parsed && typeof parsed.confidence === 'number') {
      confidence = Math.max(0, Math.min(1, parsed.confidence));
    }

    if ('rationale' in parsed && typeof parsed.rationale === 'string') {
      rationale = parsed.rationale;
    } else if ('reason' in parsed && typeof parsed.reason === 'string') {
      rationale = parsed.reason;
    }

    return { decision, confidence, rationale };
  } catch (error) {
    // Fallback for non-JSON responses
    console.warn('[AI Orchestrator] Failed to parse JSON response:', error);
    return {
      decision: content,
      confidence: 0.5,  // Low confidence for unparseable responses
      rationale: 'Response format unexpected',
    };
  }
}

/**
 * Batch orchestration for multiple requests
 * Useful for processing multiple nudges or assessments
 */
export async function orchestrateBatch(
  requests: AIOrchestrationRequest[]
): Promise<AIOrchestrationResponse[]> {
  const results = await Promise.allSettled(
    requests.map((req) => orchestrateAI(req))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<AIOrchestrationResponse> => r.status === 'fulfilled')
    .map((r) => r.value);
}
