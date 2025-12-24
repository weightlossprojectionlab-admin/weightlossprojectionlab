/**
 * API Route: Health Progress Reports
 *
 * GET /api/health/reports?patientId=xxx&period=weekly
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateProgressReport } from '@/lib/health-outcomes'
import { logger } from '@/lib/logger'
import { verifyAuthToken } from '@/lib/rbac-middleware'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const period = (searchParams.get('period') || 'weekly') as 'weekly' | 'monthly' | 'quarterly'

    // Validate params
    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId is required' },
        { status: 400 }
      )
    }

    // Validate period
    if (!['weekly', 'monthly', 'quarterly'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be: weekly, monthly, or quarterly' },
        { status: 400 }
      )
    }

    // Verify user authorization
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    logger.info('[API /health/reports] Generating health report', {
      patientId,
      period,
      userId: authResult.userId
    })

    const report = await generateProgressReport(patientId, authResult.userId, period)

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error) {
    logger.error('[API /health/reports] Error generating report', error as Error, {
      url: request.url,
    })

    return NextResponse.json(
      { error: 'Failed to generate health report' },
      { status: 500 }
    )
  }
}
