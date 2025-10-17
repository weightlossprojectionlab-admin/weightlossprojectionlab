// AI Model Router
// PRD Reference: ai_and_data_governance (PRD v1.3.7)
// TODO: Link to PRD v1.3.7 § ai_and_data_governance

import { AIModel, AIContext, ModelTier, DataSensitivity } from '@/types/ai';

/**
 * Available AI models with their characteristics
 */
export const AI_MODELS: Record<string, AIModel> = {
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    tier: 'fast',
    provider: 'openai',
    costPerToken: 0.000002,  // $0.002 per 1K tokens
    maxContextLength: 16385,
    supportedFeatures: ['chat', 'completion', 'json_mode'],
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4 Omni Mini',
    tier: 'balanced',
    provider: 'openai',
    costPerToken: 0.00015,  // $0.15 per 1M input tokens
    maxContextLength: 128000,
    supportedFeatures: ['chat', 'completion', 'json_mode', 'vision'],
  },
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    tier: 'accurate',
    provider: 'openai',
    costPerToken: 0.00003,  // $0.03 per 1K tokens
    maxContextLength: 8192,
    supportedFeatures: ['chat', 'completion', 'json_mode'],
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    tier: 'accurate',
    provider: 'openai',
    costPerToken: 0.00001,  // $0.01 per 1K tokens
    maxContextLength: 128000,
    supportedFeatures: ['chat', 'completion', 'json_mode', 'vision'],
  },
};

/**
 * Model selection matrix based on data sensitivity and requirements
 */
const MODEL_SELECTION_MATRIX: Record<
  DataSensitivity,
  Record<ModelTier, string>
> = {
  Public: {
    fast: 'gpt-3.5-turbo',
    balanced: 'gpt-4o-mini',
    accurate: 'gpt-4-turbo',
  },
  PII: {
    fast: 'gpt-4o-mini',  // Upgrade to balanced for PII
    balanced: 'gpt-4o-mini',
    accurate: 'gpt-4-turbo',
  },
  PHI: {
    fast: 'gpt-4o-mini',  // Never use fast model for health data
    balanced: 'gpt-4-turbo',
    accurate: 'gpt-4-turbo',
  },
  Financial: {
    fast: 'gpt-4-turbo',  // Always use accurate for financial
    balanced: 'gpt-4-turbo',
    accurate: 'gpt-4-turbo',
  },
};

/**
 * Select appropriate AI model based on context
 *
 * PRD Reference: Model router (low-risk → fast model, sensitive → high-accuracy)
 *
 * @param context - AI context with requirements
 * @returns Selected AI model
 */
export function selectModel(context: AIContext): AIModel {
  const {
    dataSensitivity,
    requiresHighAccuracy,
    maxLatencyMs,
  } = context;

  // Determine tier based on requirements
  let tier: ModelTier;

  if (requiresHighAccuracy) {
    tier = 'accurate';
  } else if (maxLatencyMs && maxLatencyMs < 3000) {
    // Low latency requirement
    tier = 'fast';
  } else {
    tier = 'balanced';
  }

  // Override tier based on data sensitivity
  if (dataSensitivity === 'Financial' || dataSensitivity === 'PHI') {
    // Always use at least balanced for sensitive data
    if (tier === 'fast') {
      tier = 'balanced';
    }
  }

  // Get model ID from matrix
  const modelId = MODEL_SELECTION_MATRIX[dataSensitivity][tier];
  const model = AI_MODELS[modelId];

  if (!model) {
    // Fallback to safe default
    console.warn(`Model not found for ${dataSensitivity}/${tier}, falling back to gpt-4o-mini`);
    return AI_MODELS['gpt-4o-mini'];
  }

  return model;
}

/**
 * Get model by ID
 */
export function getModel(modelId: string): AIModel | null {
  return AI_MODELS[modelId] || null;
}

/**
 * Get all models for a tier
 */
export function getModelsByTier(tier: ModelTier): AIModel[] {
  return Object.values(AI_MODELS).filter((m) => m.tier === tier);
}

/**
 * Estimate cost for a request
 *
 * @param modelId - Model ID
 * @param estimatedTokens - Estimated total tokens (input + output)
 * @returns Estimated cost in USD
 */
export function estimateCost(modelId: string, estimatedTokens: number): number {
  const model = getModel(modelId);
  if (!model) return 0;

  return model.costPerToken * estimatedTokens;
}

/**
 * Get recommended model for a template preference
 * Falls back to environment variables if set
 */
export function getRecommendedModel(
  templatePreference: ModelTier,
  dataSensitivity: DataSensitivity
): string {
  // Check for environment variable overrides
  const envOverride = {
    fast: process.env.OPENAI_MODEL_FAST,
    balanced: process.env.OPENAI_MODEL_BALANCED,
    accurate: process.env.OPENAI_MODEL_ACCURATE,
  }[templatePreference];

  if (envOverride && AI_MODELS[envOverride]) {
    return envOverride;
  }

  // Use selection matrix
  return MODEL_SELECTION_MATRIX[dataSensitivity][templatePreference];
}
