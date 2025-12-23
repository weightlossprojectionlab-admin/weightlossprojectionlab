/**
 * Household Duty Completion Service
 *
 * Shared service for completing household duties.
 * Follows DRY principle by consolidating completion logic.
 */

import { getAdminDb } from './firebase-admin'
import { HouseholdDuty, DutyCompletion } from '@/types/household-duties'
import { logger } from './logger'
import { notifyDutyCompleted } from './duty-notification-service'

export interface CompleteDutyRequest {
  completedBy: string
  completedByName: string
  duration?: number
  rating?: number
  feedback?: string
  issuesEncountered?: string[]
  photos?: string[]
  subtasksCompleted?: string[]
  notes?: string
}

export interface CompleteDutyResult {
  success: boolean
  duty?: HouseholdDuty
  completion?: DutyCompletion
  error?: string
}

/**
 * Complete a household duty with validation and audit logging
 * @param dutyId - ID of the duty to complete
 * @param request - Completion details
 * @returns Result object with duty and completion data
 */
export async function completeDuty(
  dutyId: string,
  request: CompleteDutyRequest
): Promise<CompleteDutyResult> {
  const db = getAdminDb()
  const now = new Date().toISOString()

  try {
    // Fetch duty
    const dutyDoc = await db.collection('household_duties').doc(dutyId).get()

    if (!dutyDoc.exists) {
      return {
        success: false,
        error: 'Duty not found'
      }
    }

    const duty = dutyDoc.data() as HouseholdDuty

    // Verify user is assigned to this duty or is the creator
    if (!duty.assignedTo.includes(request.completedBy) && duty.userId !== request.completedBy) {
      return {
        success: false,
        error: 'User not assigned to this duty'
      }
    }

    // Check if already completed (idempotency)
    if (duty.status === 'completed' && duty.lastCompletedAt) {
      const timeSinceLastCompletion = Date.now() - new Date(duty.lastCompletedAt).getTime()
      // Allow re-completion only if more than 1 hour has passed
      if (timeSinceLastCompletion < 60 * 60 * 1000) {
        logger.info('[DutyCompletion] Duty already recently completed, skipping', {
          dutyId,
          lastCompletedAt: duty.lastCompletedAt
        })
        return {
          success: true,
          duty: { ...duty, id: dutyId }
        }
      }
    }

    // Create completion record (only include fields with values)
    const completion: Partial<DutyCompletion> = {
      dutyId,
      completedBy: request.completedBy,
      completedAt: now,
      createdAt: now
    }

    // Only add optional fields if they have values
    if (duty.forPatientId) completion.patientId = duty.forPatientId
    if (request.duration) completion.duration = request.duration
    if (request.rating) completion.rating = request.rating
    if (request.feedback) completion.feedback = request.feedback
    if (request.issuesEncountered) completion.issuesEncountered = request.issuesEncountered
    if (request.photos) completion.photos = request.photos
    if (request.subtasksCompleted) completion.subtasksCompleted = request.subtasksCompleted
    if (request.notes) completion.notes = request.notes

    // Add completion record
    const completionRef = await db.collection('duty_completions').add(completion)
    const completionWithId: DutyCompletion = {
      id: completionRef.id,
      ...completion
    } as DutyCompletion

    // Calculate next due date
    const nextDueDate = calculateNextDueDate(duty.frequency, duty.customSchedule)

    // Update duty status
    const updates: Partial<HouseholdDuty> = {
      status: 'completed',
      lastCompletedAt: now,
      lastCompletedBy: request.completedBy,
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

    logger.info('[DutyCompletion] Household duty completed', {
      dutyId,
      completedBy: request.completedBy,
      nextDueDate,
      category: duty.category
    })

    // Mark corresponding action_item as completed
    try {
      const actionItemsSnapshot = await db.collection('action_items')
        .where('sourceReportId', '==', dutyId)
        .where('userId', '==', request.completedBy)
        .where('completed', '==', false)
        .get()

      const batch = db.batch()
      actionItemsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          completed: true,
          completedAt: now,
          completedBy: request.completedBy,
          lastModified: now
        })
      })
      await batch.commit()

      logger.info('[DutyCompletion] Marked action_items as completed', {
        dutyId,
        actionItemCount: actionItemsSnapshot.size
      })
    } catch (error) {
      logger.error('[DutyCompletion] Failed to update action_items', error as Error, { dutyId })
    }

    // Send completion notifications (non-blocking)
    notifyDutyCompleted(updatedDuty, request.completedByName).catch(error => {
      logger.error('[DutyCompletion] Failed to send duty completed notification', error as Error, { dutyId })
    })

    return {
      success: true,
      duty: updatedDuty,
      completion: completionWithId
    }
  } catch (error) {
    logger.error('[DutyCompletion] Error completing household duty', error as Error, { dutyId })
    return {
      success: false,
      error: 'Failed to complete household duty'
    }
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
