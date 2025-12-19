/**
 * Patient Compliance API Route
 *
 * GET /api/patients/[patientId]/compliance - Get compliance reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'
import { calculateCompliance, getComplianceTrends } from '@/lib/vital-schedule-service'
import { VitalType } from '@/types/medical'
import { logger } from '@/lib/logger'

/**
 * Get compliance reports for a patient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing token' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(token)
    const userId = decodedToken.uid

    const { patientId } = params

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const vitalType = searchParams.get('vitalType') as VitalType
    const periodType = searchParams.get('periodType') as 'daily' | 'weekly' | 'monthly'
    const trendDays = searchParams.get('trendDays')

    // Validate parameters
    if (!vitalType) {
      return NextResponse.json(
        { error: 'Missing vitalType query parameter' },
        { status: 400 }
      )
    }

    const validVitalTypes = ['blood_pressure', 'blood_sugar', 'temperature', 'pulse_ox', 'heart_rate']
    if (!validVitalTypes.includes(vitalType)) {
      return NextResponse.json(
        { error: `Invalid vitalType. Must be one of: ${validVitalTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // If trend data requested
    if (trendDays) {
      const days = parseInt(trendDays, 10)
      if (isNaN(days) || days <= 0 || days > 90) {
        return NextResponse.json(
          { error: 'trendDays must be between 1 and 90' },
          { status: 400 }
        )
      }

      const trends = await getComplianceTrends(patientId, vitalType, days)

      logger.info('[API] Retrieved compliance trends', {
        userId,
        patientId,
        vitalType,
        days
      })

      return NextResponse.json({
        success: true,
        trends
      })
    }

    // Calculate compliance report
    const period = periodType || 'weekly'

    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json(
        { error: 'periodType must be daily, weekly, or monthly' },
        { status: 400 }
      )
    }

    const report = await calculateCompliance(patientId, vitalType, period)

    if (!report) {
      return NextResponse.json(
        { error: 'No active schedule found for this vital type' },
        { status: 404 }
      )
    }

    logger.info('[API] Calculated compliance report', {
      userId,
      patientId,
      vitalType,
      periodType: period,
      complianceRate: report.complianceRate
    })

    return NextResponse.json({
      success: true,
      report
    })

  } catch (error) {
    logger.error('[API] Failed to get compliance report', error)
    return NextResponse.json(
      { error: 'Failed to get compliance', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
