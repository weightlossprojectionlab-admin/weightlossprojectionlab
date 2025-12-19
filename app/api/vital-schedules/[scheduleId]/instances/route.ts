/**
 * Schedule Instances API Route
 *
 * GET /api/vital-schedules/[scheduleId]/instances - Get schedule instances with filters
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'
import { getSchedule } from '@/lib/vital-schedule-service'
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ScheduledVitalInstance } from '@/types/vital-schedules'
import { logger } from '@/lib/logger'
import { format, parseISO, startOfDay, endOfDay } from 'date-fns'

/**
 * Get schedule instances with optional filters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
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

    const { scheduleId } = await params

    // Get schedule to verify ownership
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, completed, missed, etc.
    const dateStart = searchParams.get('dateStart') // YYYY-MM-DD
    const dateEnd = searchParams.get('dateEnd') // YYYY-MM-DD
    const limitParam = searchParams.get('limit')

    // Build query
    const instancesRef = collection(db, 'vitalSchedules', scheduleId, 'instances')
    let q = query(instancesRef, orderBy('scheduledFor', 'desc'))

    // Apply filters
    if (status) {
      q = query(q, where('status', '==', status))
    }

    if (dateStart) {
      try {
        const startDate = startOfDay(parseISO(dateStart))
        q = query(q, where('scheduledFor', '>=', startDate.toISOString()))
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid dateStart format. Use YYYY-MM-DD' },
          { status: 400 }
        )
      }
    }

    if (dateEnd) {
      try {
        const endDate = endOfDay(parseISO(dateEnd))
        q = query(q, where('scheduledFor', '<=', endDate.toISOString()))
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid dateEnd format. Use YYYY-MM-DD' },
          { status: 400 }
        )
      }
    }

    // Execute query
    const snapshot = await getDocs(q)
    let instances: ScheduledVitalInstance[] = []

    snapshot.forEach((doc) => {
      instances.push({
        id: doc.id,
        ...doc.data()
      } as ScheduledVitalInstance)
    })

    // Apply limit if specified
    if (limitParam) {
      const limitNum = parseInt(limitParam, 10)
      if (!isNaN(limitNum) && limitNum > 0) {
        instances = instances.slice(0, limitNum)
      }
    }

    logger.info('[API] Retrieved schedule instances', {
      userId,
      scheduleId,
      count: instances.length,
      filters: { status, dateStart, dateEnd }
    })

    return NextResponse.json({
      success: true,
      instances,
      count: instances.length
    })

  } catch (error) {
    logger.error('[API] Failed to get schedule instances', error)
    return NextResponse.json(
      { error: 'Failed to get instances', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
