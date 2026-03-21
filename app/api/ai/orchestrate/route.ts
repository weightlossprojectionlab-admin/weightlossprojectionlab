// AI Orchestration API Route
// PRD Reference: Phase 3 - AI Orchestration Layer
// TODO: Link to PRD v1.3.7 § ai_and_data_governance

import { NextRequest, NextResponse } from 'next/server';
import { orchestrateAI } from '@/lib/ai/orchestrator';
import { AIOrchestrationRequest } from '@/types/ai';
import { logger } from '@/lib/logger';
import { aiRateLimit, dailyRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit';
import { verifyAuthToken } from '@/lib/rbac-middleware';
import { errorResponse, unauthorizedResponse } from '@/lib/api-response';

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
    const authResult = await verifyAuthToken(authHeader);
    if (!authResult) {
      return unauthorizedResponse();
    }
    const userId = authResult.userId;
    logger.debug('Authenticated user', { uid: userId });

    // Check rate limits (both per-minute and daily)
    const [minuteLimit, dayLimit] = await Promise.all([
      aiRateLimit?.limit(userId),
      dailyRateLimit?.limit(userId)
    ]);

    if (minuteLimit && !minuteLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit: 10 requests per minute. Please try again in a moment.' },
        {
          status: 429,
          headers: getRateLimitHeaders(minuteLimit)
        }
      );
    }

    if (dayLimit && !dayLimit.success) {
      return NextResponse.json(
        { error: 'Daily limit reached (500 requests). Please try again tomorrow.' },
        {
          status: 429,
          headers: getRateLimitHeaders(dayLimit)
        }
      );
    }

    const body = (await request.json()) as AIOrchestrationRequest;

    // Validate required fields
    if (!body.templateId || !body.dataSensitivity) {
      return NextResponse.json(
        { error: 'Missing required fields: templateId, dataSensitivity' },
        { status: 400 }
      );
    }

    if (!body.variables || typeof body.variables !== 'object') {
      return NextResponse.json(
        { error: 'Variables must be an object' },
        { status: 400 }
      );
    }

    // Use authenticated userId instead of body.userId for security
    const orchestrationRequest: AIOrchestrationRequest = {
      ...body,
      userId // Override with authenticated userId
    };

    logger.debug('Processing AI orchestration', {
      userId,
      templateId: body.templateId,
      dataSensitivity: body.dataSensitivity
    });

    // Call orchestrator
    const result = await orchestrateAI(orchestrationRequest);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return errorResponse(error, { route: '/api/ai/orchestrate', operation: 'orchestrate' });
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
