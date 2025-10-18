// AI Orchestration Types
// PRD Reference: ai_and_data_governance

import { Timestamp } from 'firebase/firestore';

export type ModelTier = 'fast' | 'accurate' | 'balanced';
export type DataSensitivity = 'Public' | 'PII' | 'PHI' | 'Financial';
export type PromptCategory = 'coaching' | 'moderation' | 'nutrition' | 'support';

export interface PromptTemplate {
  id: string;
  name: string;
  category: PromptCategory;
  template: string;
  variables: string[];
  piiFields: string[];  // Fields to redact before AI processing
  modelPreference: ModelTier;
  maxTokens?: number;
  temperature?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIModel {
  id: string;
  name: string;
  tier: ModelTier;
  provider: 'openai' | 'anthropic' | 'custom';
  costPerToken: number;
  maxContextLength: number;
  supportedFeatures: string[];
}

export interface AIContext {
  userId: string;
  templateId: string;
  variables: Record<string, any>;
  dataSensitivity: DataSensitivity;
  requiresHighAccuracy?: boolean;
  maxLatencyMs?: number;
}

export interface AIDecisionLog {
  decisionId: string;
  timestamp: Timestamp;
  decision: string;
  confidence: number;        // 0.0-1.0
  rationale: string;
  policyReference: string;   // PRD v1.3.7 section path
  model: string;
  modelTier: ModelTier;
  executedBy: 'AISA' | 'system';
  userId?: string;
  templateId: string;
  dataSensitivity: DataSensitivity;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  reversalReason?: string;
  metadata?: Record<string, any>;
}

export interface AIOrchestrationRequest {
  templateId: string;
  variables: Record<string, any>;
  userId: string;
  dataSensitivity: DataSensitivity;
  requiresHighAccuracy?: boolean;
  maxLatencyMs?: number;
}

export interface AIOrchestrationResponse {
  decisionId: string;
  result: string;
  confidence: number;
  rationale: string;
  model: string;
  modelTier: ModelTier;
  latencyMs: number;
  policyReference: string;
}

export interface PII_RedactionResult {
  redactedText: string;
  redactions: {
    type: 'email' | 'phone' | 'ssn' | 'name' | 'address' | 'creditCard' | 'ipAddress';
    original: string;
    replacement: string;
    position: number;
  }[];
}
