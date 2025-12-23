import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import {
  HouseholdDuty,
  DutyCompletion,
  CompleteDutyRequest
} from '@/types/household-duties'
import { logger } from '@/lib/logger'
import { notifyDutyCompleted } from '@/lib/duty-notification-service'

/**
 * POST /api/household-duties/[dutyId]/complete
 * Mark a household duty as completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dutyId: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { dutyId } = await params
    const body: CompleteDutyRequest = await request.json()

    const db = getAdminDb()
    const dutyDoc = await db.collection('household_duties').doc(dutyId).get()

    if (!dutyDoc.exists) {
      return NextResponse.json(
        { error: 'Duty not found' },
        { status: 404 }
      )
    }

    const duty = dutyDoc.data() as HouseholdDuty

    // Verify user is assigned to this duty or is the creator
    if (!duty.assignedTo.includes(authResult.userId) && duty.userId !== authResult.userId) {
      return NextResponse.json(
        { error: 'You are not assigned to this duty' },
        { status: 403 }
      )
    }

    const now = new Date().toISOString()

    // Create completion record
    const completion: Omit<DutyCompletion, 'id'> = {
      dutyId,
      patientId: duty.forPatientId,
      completedBy: authResult.userId,
      completedAt: now,
      duration: body.duration,
      rating: body.rating,
      feedback: body.feedback,
      issuesEncountered: body.issuesEncountered,
      photos: body.photos,
      subtasksCompleted: body.subtasksCompleted,
      notes: body.notes,
      createdAt: now
    }

    await db.collection('duty_completions').add(completion)

    // Calculate next due date
    const nextDueDate = calculateNextDueDate(duty.frequency, duty.customSchedule)

    // Update duty status
    const updates: Partial<HouseholdDuty> = {
      status: 'completed',
      lastCompletedAt: now,
      lastCompletedBy: authResult.userId,
      completionCount: (duty.completionCount || 0) + 1,
      lastModified: now,
      nextDueDate,
      // Reset to pending if there's a next due date
      ...(nextDueDate ? { status: 'pending' } : {})
    }

    await db.collection('household_duties').doc(dutyId).update(updates)

    const updatedDuty: HouseholdDuty = {
      ...duty,
      id: dutyId,
      ...updates
    }

    logger.info('Household duty completed', {
      dutyId,
      completedBy: authResult.userId,
      nextDueDate
    })

    // Get completedBy user name for notification
    const completedByUser = await db.collection('users').doc(authResult.userId).get()
    const completedByName = completedByUser.data()?.displayName || completedByUser.data()?.email || 'Someone'

    // Send completion notifications (non-blocking)
    notifyDutyCompleted(updatedDuty, completedByName).catch(error => {
      logger.error('Failed to send duty completed notification', error as Error, { dutyId })
    })

    return NextResponse.json({
      duty: updatedDuty,
      completion
    })
  } catch (error) {
    const { dutyId } = await params
    logger.error('Error completing household duty', error as Error, { dutyId })
    return NextResponse.json(
      { error: 'Failed to complete household duty' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/household-duties/[dutyId]/complete
 * Get completion history for a duty
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dutyId: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult || !authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { dutyId } = await params
    const db = getAdminDb()

    // Verify user has access to this duty
    const dutyDoc = await db.collection('household_duties').doc(dutyId).get()
    if (!dutyDoc.exists) {
      return NextResponse.json(
        { error: 'Duty not found' },
        { status: 404 }
      )
    }

    const duty = dutyDoc.data() as HouseholdDuty
    if (duty.userId !== authResult.userId && !duty.assignedTo.includes(authResult.userId)) {
      return NextResponse.json(
        { error: 'You do not have access to this duty' },
        { status: 403 }
      )
    }

    // Fetch completion history
    const completionsSnapshot = await db.collection('duty_completions')
      .where('dutyId', '==', dutyId)
      .orderBy('completedAt', 'desc')
      .limit(50)
      .get()

    const completions: DutyCompletion[] = []
    completionsSnapshot.forEach(doc => {
      completions.push({ id: doc.id, ...doc.data() } as DutyCompletion)
    })

    return NextResponse.json({
      completions,
      total: completions.length
    })
  } catch (error) {
    const { dutyId } = await params
    logger.error('Error fetching duty completion history', error as Error, { dutyId })
    return NextResponse.json(
      { error: 'Failed to fetch completion history' },
      { status: 500 }
    )
  }
}

// ==================== HELPER FUNCTIONS ====================

function calculateNextDueDate(
  frequency: string,
  customSchedule?: HouseholdDuty['customSchedule']
): string | undefined {
  const now = new Date()

  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

    case 'biweekly':
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()

    case 'monthly':
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return nextMonth.toISOString()

    case 'custom':
      if (customSchedule?.interval) {
        return new Date(now.getTime() + customSchedule.interval * 24 * 60 * 60 * 1000).toISOString()
      }
      return undefined

    case 'as_needed':
    default:
      return undefined
  }
}
