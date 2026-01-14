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

    // Create completion record (only include patientId if it exists)
    const completion: Partial<DutyCompletion> = {
      dutyId,
      completedBy: authResult.userId,
      completedAt: now,
      createdAt: now
    }

    // Only add optional fields if they have values
    if (duty.forPatientId) completion.patientId = duty.forPatientId
    if (body.duration) completion.duration = body.duration
    if (body.rating) completion.rating = body.rating
    if (body.feedback) completion.feedback = body.feedback
    if (body.issuesEncountered) completion.issuesEncountered = body.issuesEncountered
    if (body.photos) completion.photos = body.photos
    if (body.subtasksCompleted) completion.subtasksCompleted = body.subtasksCompleted
    if (body.notes) completion.notes = body.notes

    // Use Firestore transaction to prevent race conditions on completionCount
    // Multiple users could complete the same duty simultaneously
    const updatedDuty = await db.runTransaction(async (transaction) => {
      const dutyRef = db.collection('household_duties').doc(dutyId)
      const freshDutyDoc = await transaction.get(dutyRef)

      if (!freshDutyDoc.exists) {
        throw new Error('Duty not found during transaction')
      }

      const freshDuty = freshDutyDoc.data() as HouseholdDuty

      // Calculate next due date
      const nextDueDate = calculateNextDueDate(freshDuty.frequency, freshDuty.customSchedule)

      // Update duty status with atomic increment
      const updates: Partial<HouseholdDuty> = {
        status: 'completed',
        lastCompletedAt: now,
        lastCompletedBy: authResult.userId,
        completionCount: (freshDuty.completionCount || 0) + 1,
        lastModified: now,
        nextDueDate,
        // Reset to pending if there's a next due date
        ...(nextDueDate ? { status: 'pending' } : {})
      }

      transaction.update(dutyRef, updates)

      // Create completion record
      const completionRef = db.collection('duty_completions').doc()
      transaction.set(completionRef, completion)

      return {
        ...freshDuty,
        id: dutyId,
        ...updates
      } as HouseholdDuty
    })

    logger.info('Household duty completed', {
      dutyId,
      completedBy: authResult.userId,
      nextDueDate: updatedDuty.nextDueDate
    })

    // Get completedBy user name for notification
    const completedByUser = await db.collection('users').doc(authResult.userId).get()
    const completedByName = completedByUser.data()?.displayName || completedByUser.data()?.email || 'Someone'

    // Mark corresponding action_item as completed
    try {
      const actionItemsSnapshot = await db.collection('action_items')
        .where('sourceReportId', '==', dutyId)
        .where('userId', '==', authResult.userId)
        .where('completed', '==', false)
        .get()

      const batch = db.batch()
      actionItemsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          completed: true,
          completedAt: now,
          completedBy: authResult.userId,
          lastModified: now
        })
      })
      await batch.commit()

      logger.info('Marked action_items as completed', {
        dutyId,
        actionItemCount: actionItemsSnapshot.size
      })
    } catch (error) {
      logger.error('Failed to update action_items', error as Error, { dutyId })
    }

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
