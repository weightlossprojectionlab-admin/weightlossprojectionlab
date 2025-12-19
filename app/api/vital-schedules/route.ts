/**
 * Vital Schedules API Route
 *
 * POST /api/vital-schedules - Create new schedule
 * GET /api/vital-schedules?patientId={id} - Get schedules for patient
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'
import { createSchedule, getPatientSchedules, getActiveSchedules } from '@/lib/vital-schedule-service'
import { CreateScheduleParams } from '@/types/vital-schedules'
import { logger } from '@/lib/logger'

/**
 * Create a new vital monitoring schedule
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['patientId', 'patientName', 'vitalType', 'frequency', 'specificTimes', 'timezone']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate specificTimes array
    if (!Array.isArray(body.specificTimes) || body.specificTimes.length === 0) {
      return NextResponse.json(
        { error: 'specificTimes must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    for (const time of body.specificTimes) {
      if (!timeRegex.test(time)) {
        return NextResponse.json(
          { error: `Invalid time format: ${time}. Use HH:mm format (e.g., "08:00")` },
          { status: 400 }
        )
      }
    }

    // Set default notification channels if not provided
    const notificationChannels = body.notificationChannels || {
      app: true,
      email: true,
      sms: false,
      voice: []
    }

    // Create schedule params
    const params: CreateScheduleParams = {
      userId,
      patientId: body.patientId,
      patientName: body.patientName,
      vitalType: body.vitalType,
      frequency: body.frequency,
      specificTimes: body.specificTimes,
      daysOfWeek: body.daysOfWeek,
      timezone: body.timezone,
      notificationChannels,
      quietHours: body.quietHours,
      advanceReminderMinutes: body.advanceReminderMinutes || 15,
      complianceTarget: body.complianceTarget || 90,
      complianceWindow: body.complianceWindow || 2,
      condition: body.condition,
      doctorRecommended: body.doctorRecommended || false,
      doctorNotes: body.doctorNotes
    }

    // Create schedule
    const schedule = await createSchedule(params)

    logger.info('[API] Vital schedule created', {
      userId,
      scheduleId: schedule.id,
      patientId: body.patientId,
      vitalType: body.vitalType
    })

    return NextResponse.json({
      success: true,
      schedule
    }, { status: 201 })

  } catch (error) {
    logger.error('[API] Failed to create vital schedule', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Failed to create schedule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Get schedules for a patient
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const activeOnly = searchParams.get('activeOnly') === 'true'

    if (!patientId) {
      return NextResponse.json(
        { error: 'Missing patientId query parameter' },
        { status: 400 }
      )
    }

    // Get schedules
    const schedules = activeOnly
      ? await getActiveSchedules(patientId)
      : await getPatientSchedules(patientId)

    // Filter to only schedules owned by this user (security check)
    const userSchedules = schedules.filter(s => s.userId === userId)

    logger.info('[API] Retrieved vital schedules', {
      userId,
      patientId,
      count: userSchedules.length,
      activeOnly
    })

    return NextResponse.json({
      success: true,
      schedules: userSchedules
    })

  } catch (error) {
    logger.error('[API] Failed to get vital schedules', error instanceof Error ? error : undefined)
    return NextResponse.json(
      { error: 'Failed to get schedules', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
