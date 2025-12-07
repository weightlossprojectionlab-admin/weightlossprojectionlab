/**
 * API Route: Nutrition-Vitals Correlations
 *
 * GET /api/health/correlations?patientId=xxx&vitalType=blood_pressure&days=30
 * POST /api/health/correlations
 */

import { NextRequest, NextResponse } from 'next/server'
import { correlateNutritionWithVitals } from '@/lib/nutrition-vitals-correlation'
import { logger } from '@/lib/logger'
import type { VitalType } from '@/types/medical'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const vitalType = searchParams.get('vitalType') as VitalType | null
    const days = parseInt(searchParams.get('days') || '30')

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

    // TODO: Verify user authorization to access this patient's data
    // const userId = await getUserIdFromSession(request)
    // await verifyPatientAccess(userId, patientId)

    logger.info('[API /health/correlations] Fetching correlation', {
      patientId,
      vitalType,
      days,
    })

    // Generate correlation
    const userId = 'temp-user-id' // TODO: Get from session
    const correlation = await correlateNutritionWithVitals(
      patientId,
      userId,
      vitalType,
      days
    )

    if (!correlation) {
      return NextResponse.json(
        {
          message: 'Insufficient data for correlation analysis',
          requirement: 'Need at least 2 vitals, 3 meals, and 14 days of data',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: correlation,
    })
  } catch (error: any) {
    logger.error('[API /health/correlations] Error', error, {
      url: request.url,
    })

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, vitalType, timeRangeDays = 30 } = body

    // Validate
    if (!patientId || !vitalType) {
      return NextResponse.json(
        { error: 'patientId and vitalType are required' },
        { status: 400 }
      )
    }

    // TODO: Verify user authorization
    // const userId = await getUserIdFromSession(request)
    // await verifyPatientAccess(userId, patientId)

    logger.info('[API /health/correlations] Creating correlation', {
      patientId,
      vitalType,
      timeRangeDays,
    })

    const userId = 'temp-user-id' // TODO: Get from session
    const correlation = await correlateNutritionWithVitals(
      patientId,
      userId,
      vitalType,
      timeRangeDays
    )

    if (!correlation) {
      return NextResponse.json(
        {
          message: 'Insufficient data for correlation analysis',
          requirement: 'Need at least 2 vitals, 3 meals, and 14 days of data',
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: correlation,
    })
  } catch (error: any) {
    logger.error('[API /health/correlations] Error creating correlation', error)

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
