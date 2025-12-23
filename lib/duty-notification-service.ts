/**
 * Household Duty Notification Service
 *
 * Handles notifications for household duty assignments, completions, and reminders.
 * Leverages existing notification infrastructure (DRY principle).
 */

import { HouseholdDuty } from '@/types/household-duties'
import { createNotification } from './notification-service'
import { DutyMetadata } from '@/types/notifications'
import { getAdminDb } from './firebase-admin'
import { logger } from './logger'

// ==================== HELPER FUNCTIONS ====================

/**
 * Get household name from Firestore
 */
async function getHouseholdName(householdId: string): Promise<string> {
  try {
    const db = getAdminDb()
    const doc = await db.collection('households').doc(householdId).get()
    return doc.data()?.name || 'Your Household'
  } catch (error) {
    logger.error('[DutyNotification] Error fetching household name', error as Error, { householdId })
    return 'Your Household'
  }
}

/**
 * Get patient name from Firestore
 */
async function getPatientName(patientId: string): Promise<string> {
  try {
    const db = getAdminDb()
    // Try to find patient across all user subcollections
    const usersSnapshot = await db.collection('users').get()

    for (const userDoc of usersSnapshot.docs) {
      const patientDoc = await db.collection('users').doc(userDoc.id).collection('patients').doc(patientId).get()
      if (patientDoc.exists) {
        return patientDoc.data()?.name || 'Patient'
      }
    }

    return 'Patient'
  } catch (error) {
    logger.error('[DutyNotification] Error fetching patient name', error as Error, { patientId })
    return 'Patient'
  }
}

/**
 * Get user name from Firestore
 */
async function getUserName(userId: string): Promise<string> {
  try {
    const db = getAdminDb()
    const doc = await db.collection('users').doc(userId).get()
    return doc.data()?.displayName || doc.data()?.email || 'Someone'
  } catch (error) {
    logger.error('[DutyNotification] Error fetching user name', error as Error, { userId })
    return 'Someone'
  }
}

/**
 * Build duty metadata for notifications
 */
async function buildDutyMetadata(duty: HouseholdDuty, actionByName: string): Promise<DutyMetadata> {
  const [householdName, forPatientName] = await Promise.all([
    getHouseholdName(duty.householdId),
    duty.forPatientId ? getPatientName(duty.forPatientId) : Promise.resolve(undefined)
  ])

  return {
    dutyId: duty.id!,
    dutyName: duty.name,
    dutyCategory: duty.category,
    householdId: duty.householdId,
    householdName,
    forPatientId: duty.forPatientId,
    forPatientName,
    assignedTo: duty.assignedTo,
    assignedBy: duty.assignedBy,
    assignedByName: actionByName,
    priority: duty.priority,
    frequency: duty.frequency,
    nextDueDate: duty.nextDueDate,
    estimatedDuration: duty.estimatedDuration,
    actionBy: actionByName,
    actionByUserId: duty.assignedBy
  }
}

/**
 * Get action URL based on duty category
 * Routes grocery shopping duties to shopping list, others to duty details
 */
function getDutyActionUrl(duty: HouseholdDuty): string {
  // Handle both 'grocery_shopping' and legacy 'shopping' category
  if (duty.category === 'grocery_shopping' || duty.category === 'shopping') {
    // Patient-specific grocery shopping → member's shopping list
    if (duty.forPatientId) {
      return `/shopping?memberId=${duty.forPatientId}`
    }
    // Household-level grocery shopping → household shopping list
    return `/shopping?householdId=${duty.householdId}`
  }

  // Default: duty details page
  return `/households/${duty.householdId}/duties`
}

/**
 * Get action label based on duty category
 * Provides context-aware button text for notifications
 */
async function getDutyActionLabel(duty: HouseholdDuty): Promise<string> {
  // Handle both 'grocery_shopping' and legacy 'shopping' category
  if (duty.category === 'grocery_shopping' || duty.category === 'shopping') {
    if (duty.forPatientId) {
      const patientName = await getPatientName(duty.forPatientId)
      return `View ${patientName}'s Shopping List`
    }
    return 'View Household Shopping List'
  }

  return 'View Duty'
}

// ==================== NOTIFICATION FUNCTIONS ====================

/**
 * Send notification when duty is assigned to caregivers
 */
export async function notifyDutyAssigned(duty: HouseholdDuty, assignedByName: string): Promise<void> {
  try {
    const metadata = await buildDutyMetadata(duty, assignedByName)

    // Determine priority
    const notificationPriority =
      duty.priority === 'urgent' ? 'urgent' :
      duty.priority === 'high' ? 'high' :
      'normal'

    // Send to each assigned caregiver
    for (const caregiverId of duty.assignedTo) {
      // Skip notification to the person who assigned it
      if (caregiverId === duty.assignedBy) continue

      await createNotification({
        userId: caregiverId,
        patientId: duty.forPatientId,
        type: 'duty_assigned',
        priority: notificationPriority,
        title: `New Duty: ${duty.name}`,
        message: `${assignedByName} assigned you a ${duty.priority} priority duty${duty.forPatientId ? ` for ${metadata.forPatientName}` : ''}.`,
        metadata,
        actionUrl: getDutyActionUrl(duty),
        actionLabel: await getDutyActionLabel(duty),
        expiresInDays: 30
      })
    }

    logger.info('[DutyNotification] Duty assigned notifications sent', {
      dutyId: duty.id,
      recipientCount: duty.assignedTo.filter(id => id !== duty.assignedBy).length
    })
  } catch (error) {
    logger.error('[DutyNotification] Failed to send duty assigned notification', error as Error, {
      dutyId: duty.id
    })
    // Don't throw - notification failure shouldn't block duty creation
  }
}

/**
 * Send notification when duty is completed
 */
export async function notifyDutyCompleted(duty: HouseholdDuty, completedByName: string): Promise<void> {
  if (!duty.notifyOnCompletion) return

  try {
    const metadata = await buildDutyMetadata(duty, completedByName)
    metadata.completedBy = duty.lastCompletedBy
    metadata.completedByName = completedByName

    // Notify household owner and other caregivers (except completer)
    const recipientIds = [duty.userId, ...duty.assignedTo].filter(id => id !== duty.lastCompletedBy)

    for (const recipientId of recipientIds) {
      await createNotification({
        userId: recipientId,
        patientId: duty.forPatientId,
        type: 'duty_completed',
        priority: 'low',
        title: `Duty Completed: ${duty.name}`,
        message: `${completedByName} completed "${duty.name}"${duty.nextDueDate ? `. Next due: ${new Date(duty.nextDueDate).toLocaleDateString()}` : ''}.`,
        metadata,
        actionUrl: getDutyActionUrl(duty),
        actionLabel: 'View Details',
        expiresInDays: 7
      })
    }

    logger.info('[DutyNotification] Duty completed notifications sent', { dutyId: duty.id })
  } catch (error) {
    logger.error('[DutyNotification] Failed to send duty completed notification', error as Error, { dutyId: duty.id })
  }
}

/**
 * Send reminder notification for upcoming duty
 */
export async function notifyDutyReminder(duty: HouseholdDuty): Promise<void> {
  if (!duty.reminderEnabled) return

  try {
    const assignedByName = await getUserName(duty.assignedBy)
    const metadata = await buildDutyMetadata(duty, assignedByName)

    const dueTimeString = getDueTimeString(duty.nextDueDate!)

    for (const caregiverId of duty.assignedTo) {
      await createNotification({
        userId: caregiverId,
        patientId: duty.forPatientId,
        type: 'duty_reminder',
        priority: duty.priority === 'urgent' ? 'urgent' : 'high',
        title: `Reminder: ${duty.name}`,
        message: `Due ${dueTimeString}${duty.forPatientId ? ` for ${metadata.forPatientName}` : ''}`,
        metadata,
        actionUrl: getDutyActionUrl(duty),
        actionLabel: await getDutyActionLabel(duty)
      })
    }

    logger.info('[DutyNotification] Duty reminder notifications sent', { dutyId: duty.id })
  } catch (error) {
    logger.error('[DutyNotification] Failed to send duty reminder notification', error as Error, { dutyId: duty.id })
  }
}

/**
 * Send overdue notification
 */
export async function notifyDutyOverdue(duty: HouseholdDuty): Promise<void> {
  if (!duty.notifyOnOverdue) return

  try {
    const assignedByName = await getUserName(duty.assignedBy)
    const metadata = await buildDutyMetadata(duty, assignedByName)

    for (const caregiverId of duty.assignedTo) {
      await createNotification({
        userId: caregiverId,
        patientId: duty.forPatientId,
        type: 'duty_overdue',
        priority: 'urgent',
        title: `Overdue: ${duty.name}`,
        message: `This duty was due ${getDueTimeString(duty.nextDueDate!)}`,
        metadata,
        actionUrl: getDutyActionUrl(duty),
        actionLabel: (duty.category === 'grocery_shopping' || duty.category === 'shopping')
          ? await getDutyActionLabel(duty)
          : 'Complete Now'
      })
    }

    logger.info('[DutyNotification] Duty overdue notifications sent', { dutyId: duty.id })
  } catch (error) {
    logger.error('[DutyNotification] Failed to send duty overdue notification', error as Error, { dutyId: duty.id })
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get human-readable due time string
 */
function getDueTimeString(dueDate: string): string {
  const due = new Date(dueDate)
  const now = new Date()
  const diffHours = Math.abs(due.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (diffHours < 1) return 'in less than 1 hour'
  if (diffHours < 24) return `in ${Math.round(diffHours)} hours`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays === 1) return 'tomorrow'
  if (diffDays < 7) return `in ${diffDays} days`

  return `on ${due.toLocaleDateString()}`
}
