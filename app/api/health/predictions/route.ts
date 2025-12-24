/**
 * API Route: Health Predictions
 *
 * GET /api/health/predictions?patientId=xxx&vitalType=blood_pressure&daysAhead=30
 */

import { NextRequest, NextResponse } from 'next/server'
import { predictFutureVitals } from '@/lib/health-analytics'
import { logger } from '@/lib/logger'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import type { VitalType } from '@/types/medical'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const vitalType = searchParams.get('vitalType') as VitalType | null
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30')

    // Validate params
    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId is required' },
        { status: 400 }
      )
    }

    if (!vitalType) {
      return NextResponse.json(
        { error: 'vitalType is required' },
        { status: 400 }
      )
    }

    // Validate vital type
    const validVitalTypes: VitalType[] = ['blood_pressure', 'blood_sugar', 'weight', 'temperature', 'pulse_oximeter']
    if (!validVitalTypes.includes(vitalType)) {
      return NextResponse.json(
        { error: 'Invalid vitalType' },
        { status: 400 }
      )
    }

    // Validate daysAhead
    if (daysAhead < 1 || daysAhead > 90) {
      return NextResponse.json(
        { error: 'daysAhead must be between 1 and 90' },
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

    logger.info('[API /health/predictions] Generating prediction', {
      patientId,
      vitalType,
      daysAhead,
      userId: authResult.userId
    })

    const prediction = await predictFutureVitals(
      patientId,
      authResult.userId,
      vitalType,
      daysAhead
    )

    return NextResponse.json({
      success: true,
      data: prediction,
    })
  } catch (error) {
    logger.error('[API /health/predictions] Error generating prediction', error as Error, {
      url: request.url,
    })

    return NextResponse.json(
      { error: 'Failed to generate prediction' },
      { status: 500 }
    )
  }
}
