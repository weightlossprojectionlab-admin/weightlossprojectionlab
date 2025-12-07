/**
 * API Route: Health Progress Reports
 *
 * GET /api/health/reports?patientId=xxx&period=weekly
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateProgressReport } from '@/lib/health-outcomes'
import { logger } from '@/lib/logger'

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

    // TODO: Verify user authorization
    // const userId = await getUserIdFromSession(request)
    // await verifyPatientAccess(userId, patientId)

    logger.info('[API /health/reports] Generating health report', {
      patientId,
      period,
    })

    const userId = 'temp-user-id' // TODO: Get from session
    const report = await generateProgressReport(patientId, userId, period)

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error: any) {
    logger.error('[API /health/reports] Error generating report', error, {
      url: request.url,
    })

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
