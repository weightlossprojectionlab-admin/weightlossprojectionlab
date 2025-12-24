/**
 * API Route: Nutrition-Vitals Correlations
 *
 * GET /api/health/correlations?patientId=xxx&vitalType=blood_pressure&days=30
 * POST /api/health/correlations
 */

import { NextRequest, NextResponse } from 'next/server'
import { correlateNutritionWithVitals } from '@/lib/nutrition-vitals-correlation'
import { logger } from '@/lib/logger'
import { verifyAuthToken } from '@/lib/rbac-middleware'
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

    // Verify user authorization
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    logger.info('[API /health/correlations] Fetching correlation', {
      patientId,
      vitalType,
      days,
      userId: authResult.userId
    })

    // Generate correlation
    const correlation = await correlateNutritionWithVitals(
      patientId,
      authResult.userId,
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
  } catch (error) {
    logger.error('[API /health/correlations] Error', error as Error, {
      url: request.url,
    })

    return NextResponse.json(
      { error: 'Failed to fetch correlation data' },
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

    // Verify user authorization
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    logger.info('[API /health/correlations] Creating correlation', {
      patientId,
      vitalType,
      timeRangeDays,
      userId: authResult.userId
    })

    const correlation = await correlateNutritionWithVitals(
      patientId,
      authResult.userId,
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
  } catch (error) {
    logger.error('[API /health/correlations] Error creating correlation', error as Error)

    return NextResponse.json(
      { error: 'Failed to create correlation data' },
      { status: 500 }
    )
  }
}
