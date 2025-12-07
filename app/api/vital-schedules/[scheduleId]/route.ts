/**
 * Individual Vital Schedule API Route
 *
 * GET /api/vital-schedules/[scheduleId] - Get schedule details
 * PATCH /api/vital-schedules/[scheduleId] - Update schedule
 * DELETE /api/vital-schedules/[scheduleId] - Delete schedule
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'
import {
  getSchedule,
  updateSchedule,
  deleteSchedule
} from '@/lib/vital-schedule-service'
import { UpdateScheduleParams } from '@/types/vital-schedules'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: {
    scheduleId: string
  }
}

/**
 * Get schedule details
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
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

    const { scheduleId } = params

    // Get schedule
    const schedule = await getSchedule(scheduleId)

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (schedule.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this schedule' },
        { status: 403 }
      )
    }

    logger.info('[API] Retrieved vital schedule', {
      userId,
      scheduleId
    })

    return NextResponse.json({
      success: true,
      schedule
    })

  } catch (error) {
    logger.error('[API] Failed to get vital schedule', error)
    return NextResponse.json(
      { error: 'Failed to get schedule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Update schedule
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
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

    const { scheduleId } = params

    // Get existing schedule
    const schedule = await getSchedule(scheduleId)

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (schedule.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this schedule' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate time format if specificTimes provided
    if (body.specificTimes) {
      if (!Array.isArray(body.specificTimes) || body.specificTimes.length === 0) {
        return NextResponse.json(
          { error: 'specificTimes must be a non-empty array' },
          { status: 400 }
        )
      }

      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
      for (const time of body.specificTimes) {
        if (!timeRegex.test(time)) {
          return NextResponse.json(
            { error: `Invalid time format: ${time}. Use HH:mm format (e.g., "08:00")` },
            { status: 400 }
          )
        }
      }
    }

    // Create update params
    const updates: UpdateScheduleParams = {}

    // Only include fields that are provided
    if (body.frequency !== undefined) updates.frequency = body.frequency
    if (body.specificTimes !== undefined) updates.specificTimes = body.specificTimes
    if (body.daysOfWeek !== undefined) updates.daysOfWeek = body.daysOfWeek
    if (body.timezone !== undefined) updates.timezone = body.timezone
    if (body.notificationChannels !== undefined) updates.notificationChannels = body.notificationChannels
    if (body.quietHours !== undefined) updates.quietHours = body.quietHours
    if (body.advanceReminderMinutes !== undefined) updates.advanceReminderMinutes = body.advanceReminderMinutes
    if (body.complianceTarget !== undefined) updates.complianceTarget = body.complianceTarget
    if (body.complianceWindow !== undefined) updates.complianceWindow = body.complianceWindow
    if (body.active !== undefined) updates.active = body.active
    if (body.doctorNotes !== undefined) updates.doctorNotes = body.doctorNotes

    // Update schedule
    await updateSchedule(scheduleId, updates, userId)

    // Get updated schedule
    const updatedSchedule = await getSchedule(scheduleId)

    logger.info('[API] Vital schedule updated', {
      userId,
      scheduleId,
      updates: Object.keys(updates)
    })

    return NextResponse.json({
      success: true,
      schedule: updatedSchedule
    })

  } catch (error) {
    logger.error('[API] Failed to update vital schedule', error)
    return NextResponse.json(
      { error: 'Failed to update schedule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Delete schedule
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
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

    const { scheduleId } = params

    // Get schedule
    const schedule = await getSchedule(scheduleId)

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (schedule.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this schedule' },
        { status: 403 }
      )
    }

    // Delete schedule
    await deleteSchedule(scheduleId)

    logger.info('[API] Vital schedule deleted', {
      userId,
      scheduleId,
      patientId: schedule.patientId,
      vitalType: schedule.vitalType
    })

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully'
    })

  } catch (error) {
    logger.error('[API] Failed to delete vital schedule', error)
    return NextResponse.json(
      { error: 'Failed to delete schedule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
