// AI Orchestration API Route
// PRD Reference: Phase 3 - AI Orchestration Layer
// TODO: Link to PRD v1.3.7 § ai_and_data_governance

import { NextRequest, NextResponse } from 'next/server';
import { orchestrateAI } from '@/lib/ai/orchestrator';
import { AIOrchestrationRequest } from '@/types/ai';

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
    const body = (await request.json()) as AIOrchestrationRequest;

    // Validate required fields
    if (!body.templateId || !body.userId || !body.dataSensitivity) {
      return NextResponse.json(
        { error: 'Missing required fields: templateId, userId, dataSensitivity' },
        { status: 400 }
      );
    }

    if (!body.variables || typeof body.variables !== 'object') {
      return NextResponse.json(
        { error: 'Variables must be an object' },
        { status: 400 }
      );
    }

    // TODO: Add authentication check
    // const session = await getServerSession(authOptions);
    // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Call orchestrator
    const result = await orchestrateAI(body);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[API /ai/orchestrate] Error:', error);

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
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
