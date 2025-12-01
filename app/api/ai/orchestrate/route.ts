// AI Orchestration API Route
// PRD Reference: Phase 3 - AI Orchestration Layer
// TODO: Link to PRD v1.3.7 § ai_and_data_governance

import { NextRequest, NextResponse } from 'next/server';
import { orchestrateAI } from '@/lib/ai/orchestrator';
import { AIOrchestrationRequest } from '@/types/ai';
import { logger } from '@/lib/logger';
import { adminAuth } from '@/lib/firebase-admin';
import { aiRateLimit, dailyRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit';
import { ErrorHandler } from '@/lib/utils/error-handler';
import { errorResponse } from '@/lib/api-response'

/**
 * POST /api/ai/orchestrate
 * Main AI orchestration endpoint
 *
 * Request body:
 * {
 *   templateId: string;
 *   variables: Record<string, any>;
 *   userId: string;
 *   dataSensitivity: 'Public' | 'PII' | 'PHI' | 'Financial';
 *   requiresHighAccuracy?: boolean;
 *   maxLatencyMs?: number;
 * }
 *
 * Response:
 * {
 *   decisionId: string;
 *   result: string;
 *   confidence: number;
 *   rationale: string;
 *   model: string;
 *   modelTier: ModelTier;
 *   latencyMs: number;
 *   policyReference: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the Firebase ID token
    let userId: string;
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
      logger.debug('Authenticated user', { uid: userId });
    } catch (authError) {
    return errorResponse(authError, {
      route: '/api/ai/orchestrate',
      operation: 'create'
    })
  }
}

/**
 * GET /api/ai/orchestrate
 * Get API documentation/health check
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/ai/orchestrate',
    version: '1.0.0',
    methods: ['POST'],
    description: 'AI orchestration endpoint with prompt templates, PII redaction, and model routing',
    requiredFields: ['templateId', 'variables', 'userId', 'dataSensitivity'],
    optionalFields: ['requiresHighAccuracy', 'maxLatencyMs'],
  });
}
