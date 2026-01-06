/**
 * Notification Service
 *
 * Context-aware notification system for family members.
 * Handles email and push notifications with comprehensive error handling and logging.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  updateDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { sendEmail } from '@/lib/email-service'
import { logger } from '@/lib/logger'
import { getNotificationToken } from '@/lib/nudge-system'
import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationMetadata,
  NotificationPreferences,
  CreateNotificationParams,
  SendNotificationResult,
  BatchNotificationResult,
  NotificationFilter,
  NotificationStats,
  MedicationMetadata,
  VitalMetadata,
  MealMetadata,
  WeightMetadata,
  DocumentMetadata,
  AppointmentMetadata,
  HealthReportMetadata,
  FamilyMetadata,
  PatientMetadata
} from '@/types/notifications'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notifications'
import type { FamilyMember, PatientProfile } from '@/types/medical'

// ============================================================================
// CORE NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Create a notification record in Firestore
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<Notification> {
  try {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()

    // Calculate expiration date if specified
    let expiresAt: string | undefined
    if (params.expiresInDays && params.expiresInDays > 0) {
      const expirationDate = new Date()
      expirationDate.setDate(expirationDate.getDate() + params.expiresInDays)
      expiresAt = expirationDate.toISOString()
    }

    const notification: Notification = {
      id: notificationId,
      userId: params.userId,
      patientId: params.patientId,
      type: params.type,
      priority: params.priority || 'normal',
      status: 'pending',
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl,
      actionLabel: params.actionLabel,
      metadata: params.metadata,
      read: false,
      emailSent: false,
      pushSent: false,
      createdAt: now,
      updatedAt: now,
      expiresAt
    }

    // Save to Firestore
    await setDoc(doc(db, 'notifications', notificationId), notification)

    logger.info('[NotificationService] Notification created', {
      notificationId,
      userId: params.userId,
      type: params.type
    })

    return notification
  } catch (error) {
    logger.error('[NotificationService] Error creating notification', error as Error, {
      userId: params.userId,
      type: params.type
    })
    throw error
  }
}

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  try {
    const prefsDoc = await getDoc(doc(db, 'notification_preferences', userId))

    if (prefsDoc.exists()) {
      return prefsDoc.data() as NotificationPreferences
    }

    // Return default preferences if not set
    return DEFAULT_NOTIFICATION_PREFERENCES
  } catch (error) {
    logger.error('[NotificationService] Error getting notification preferences', error as Error, {
      userId
    })
    // Return default preferences on error
    return DEFAULT_NOTIFICATION_PREFERENCES
  }
}

/**
 * Update notification preferences for a user
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const prefsRef = doc(db, 'notification_preferences', userId)
    const existing = await getDoc(prefsRef)

    if (existing.exists()) {
      await updateDoc(prefsRef, preferences as any)
    } else {
      await setDoc(prefsRef, {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...preferences
      })
    }

    logger.info('[NotificationService] Notification preferences updated', { userId })
  } catch (error) {
    logger.error('[NotificationService] Error updating notification preferences', error as Error, {
      userId
    })
    throw error
  }
}

/**
 * Check if notification should be sent based on quiet hours
 */
function isInQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quietHours?.enabled) {
    return false
  }

  const now = new Date()
  const currentHour = now.getHours()
  const { startHour, endHour } = preferences.quietHours

  // Handle quiet hours that span midnight
  if (startHour > endHour) {
    return currentHour >= startHour || currentHour < endHour
  }

  return currentHour >= startHour && currentHour < endHour
}

/**
 * Check if user wants to receive notification via specific channel
 */
function shouldSendNotification(
  type: NotificationType,
  channel: 'email' | 'push',
  preferences: NotificationPreferences
): boolean {
  // Check if notifications are globally enabled
  if (!preferences.globallyEnabled) {
    return false
  }

  // Check channel-specific preference
  const typePreferences = preferences[type]
  if (!typePreferences) {
    return true // Default to sending if no preference set
  }

  // For push notifications, check quiet hours
  if (channel === 'push' && isInQuietHours(preferences)) {
    return false
  }

  return typePreferences[channel]
}

// ============================================================================
// EMAIL NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Send email notification
 */
export async function sendEmailNotification(
  notification: Notification,
  recipientEmail: string,
  recipientName: string
): Promise<boolean> {
  try {
    const html = generateEmailHtml(notification, recipientName)
    const text = generateEmailText(notification, recipientName)

    await sendEmail({
      to: recipientEmail,
      subject: notification.title,
      html,
      text
    })

    // Update notification record
    await updateDoc(doc(db, 'notifications', notification.id), {
      emailSent: true,
      emailSentAt: new Date().toISOString(),
      status: 'sent',
      updatedAt: new Date().toISOString()
    })

    logger.info('[NotificationService] Email notification sent', {
      notificationId: notification.id,
      recipientEmail,
      type: notification.type
    })

    return true
  } catch (error) {
    logger.error('[NotificationService] Error sending email notification', error as Error, {
      notificationId: notification.id,
      recipientEmail
    })
    return false
  }
}

/**
 * Generate HTML email content
 */
function generateEmailHtml(notification: Notification, recipientName: string): string {
  const priorityColors = {
    low: '#10b981',
    normal: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444'
  }

  const priorityColor = priorityColors[notification.priority]
  const message = generateContextAwareMessage(notification.type, notification.metadata)
  const actionButton = notification.actionUrl
    ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${notification.actionUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          ${notification.actionLabel || 'View Details'}
        </a>
      </div>
    `
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${notification.title}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">WPL Family Health</h1>
        <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Notification</p>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <div style="border-left: 4px solid ${priorityColor}; padding-left: 15px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin: 0 0 10px 0;">${notification.title}</h2>
          <p style="color: #6b7280; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${notification.priority.toUpperCase()} PRIORITY
          </p>
        </div>

        <p style="margin: 0 0 10px 0;">Hi ${recipientName},</p>

        <p style="margin: 20px 0; font-size: 16px; line-height: 1.8;">
          ${message}
        </p>

        ${actionButton}

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          This notification was sent on ${new Date(notification.createdAt).toLocaleString()}.
        </p>

        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          You can manage your notification preferences in the app settings.
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p style="margin: 0;">
          © ${new Date().getFullYear()} Weight Loss Projection Lab. All rights reserved.
        </p>
        <p style="margin: 10px 0 0 0;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate plain text email content
 */
function generateEmailText(notification: Notification, recipientName: string): string {
  const message = generateContextAwareMessage(notification.type, notification.metadata)

  return `
WPL Family Health Notification

${notification.title}
Priority: ${notification.priority.toUpperCase()}

Hi ${recipientName},

${message}

${notification.actionUrl ? `View Details: ${notification.actionUrl}\n` : ''}

---
Sent: ${new Date(notification.createdAt).toLocaleString()}

You can manage your notification preferences in the app settings.

© ${new Date().getFullYear()} Weight Loss Projection Lab
  `.trim()
}

// ============================================================================
// PUSH NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Send push notification using Firebase Cloud Messaging
 */
export async function sendPushNotification(
  notification: Notification,
  userId: string
): Promise<boolean> {
  try {
    // Get user's FCM token
    const token = await getNotificationToken(userId)
    if (!token) {
      logger.warn('[NotificationService] No FCM token found for user', { userId })
      return false
    }

    // Send via Firebase Admin SDK (server-side)
    // Note: This requires Firebase Admin SDK which should be called from an API route
    const response = await fetch('/api/notifications/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        notification: {
          title: notification.title,
          body: generateContextAwareMessage(notification.type, notification.metadata)
        },
        data: {
          notificationId: notification.id,
          type: notification.type,
          actionUrl: notification.actionUrl || '',
          priority: notification.priority
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Push notification failed: ${response.statusText}`)
    }

    // Update notification record
    await updateDoc(doc(db, 'notifications', notification.id), {
      pushSent: true,
      pushSentAt: new Date().toISOString(),
      status: 'sent',
      updatedAt: new Date().toISOString()
    })

    logger.info('[NotificationService] Push notification sent', {
      notificationId: notification.id,
      userId,
      type: notification.type
    })

    return true
  } catch (error) {
    logger.error('[NotificationService] Error sending push notification', error as Error, {
      notificationId: notification.id,
      userId
    })
    return false
  }
}

// ============================================================================
// CONTEXT-AWARE MESSAGE GENERATION
// ============================================================================

/**
 * Generate human-readable message based on notification type and metadata
 */
export function generateContextAwareMessage(
  type: NotificationType,
  metadata: NotificationMetadata
): string {
  switch (type) {
    case 'medication_added': {
      const meta = metadata as MedicationMetadata
      return `${meta.actionBy} added a new medication for ${meta.patientName}: ${meta.medicationName}${
        meta.strength ? ` (${meta.strength})` : ''
      }${meta.prescribedFor ? ` for ${meta.prescribedFor}` : ''}.`
    }

    case 'medication_updated': {
      const meta = metadata as MedicationMetadata
      return `${meta.actionBy} updated medication information for ${meta.patientName}: ${meta.medicationName}.`
    }

    case 'medication_deleted': {
      const meta = metadata as MedicationMetadata
      return `${meta.actionBy} removed ${meta.medicationName} from ${meta.patientName}'s medications.`
    }

    case 'vital_logged': {
      const meta = metadata as VitalMetadata
      return `${meta.actionBy} logged ${meta.vitalType.replace('_', ' ')} for ${meta.patientName}: ${meta.value}.${
        meta.isAbnormal ? ` ⚠️ ${meta.abnormalReason}` : ''
      }`
    }

    case 'meal_logged': {
      const meta = metadata as MealMetadata
      return `${meta.actionBy} logged ${meta.mealType} for ${meta.patientName}${
        meta.calories ? ` (${meta.calories} calories)` : ''
      }.${meta.foodItems && meta.foodItems.length > 0 ? ` Items: ${meta.foodItems.join(', ')}` : ''}`
    }

    case 'weight_logged': {
      const meta = metadata as WeightMetadata
      return `${meta.actionBy} logged weight for ${meta.patientName}: ${meta.weight} ${meta.unit}.${
        meta.changeFromPrevious
          ? ` ${meta.trendDirection === 'down' ? '↓' : meta.trendDirection === 'up' ? '↑' : '→'} ${Math.abs(
              meta.changeFromPrevious
            ).toFixed(1)} ${meta.unit} from previous`
          : ''
      }${meta.goalProgress ? ` (${meta.goalProgress.toFixed(0)}% to goal)` : ''}`
    }

    case 'document_uploaded': {
      const meta = metadata as DocumentMetadata
      return `${meta.actionBy} uploaded a new ${meta.documentCategory.replace(
        /-/g,
        ' '
      )} document for ${meta.patientName}: ${meta.documentName}.`
    }

    case 'appointment_scheduled': {
      const meta = metadata as AppointmentMetadata
      return `${meta.actionBy} scheduled a ${meta.appointmentType} appointment for ${
        meta.patientName
      } with ${meta.providerName} on ${new Date(meta.appointmentDateTime).toLocaleDateString()} at ${new Date(
        meta.appointmentDateTime
      ).toLocaleTimeString()}.${meta.requiresDriver ? ' 🚗 Transportation needed.' : ''}`
    }

    case 'appointment_updated': {
      const meta = metadata as AppointmentMetadata
      return `${meta.actionBy} updated the appointment for ${meta.patientName} with ${meta.providerName}.${
        meta.reason ? ` Reason: ${meta.reason}` : ''
      }`
    }

    case 'appointment_cancelled': {
      const meta = metadata as AppointmentMetadata
      return `${meta.actionBy} cancelled the appointment for ${meta.patientName} with ${meta.providerName}.${
        meta.reason ? ` Reason: ${meta.reason}` : ''
      }`
    }

    case 'health_report_generated': {
      const meta = metadata as HealthReportMetadata
      return `${meta.generatedBy} generated a ${meta.reportType} health report for ${meta.patientName} covering ${
        new Date(meta.dateRange.start).toLocaleDateString()
      } to ${new Date(meta.dateRange.end).toLocaleDateString()}.`
    }

    case 'family_member_invited': {
      const meta = metadata as FamilyMetadata
      return `${meta.actionBy} invited ${meta.familyMemberName} to join the family health circle${
        meta.patientsShared && meta.patientsShared.length > 0
          ? ` with access to ${meta.patientsShared.length} patient(s)`
          : ''
      }.`
    }

    case 'family_member_joined': {
      const meta = metadata as FamilyMetadata
      return `${meta.familyMemberName} accepted the invitation and joined your family health circle.`
    }

    case 'patient_added': {
      const meta = metadata as PatientMetadata
      return `${meta.actionBy} added ${meta.patientName} (${meta.relationship}) as a ${meta.patientType} patient to the family.`
    }

    case 'vital_alert': {
      const meta = metadata as VitalMetadata
      return `⚠️ Alert: ${meta.patientName}'s ${meta.vitalType.replace('_', ' ')} reading of ${meta.value} is ${
        meta.abnormalReason || 'abnormal'
      }. Please review.`
    }

    case 'medication_reminder': {
      const meta = metadata as MedicationMetadata
      return `⏰ Reminder: Time for ${meta.patientName} to take ${meta.medicationName}${
        meta.frequency ? ` - ${meta.frequency}` : ''
      }.`
    }

    case 'appointment_reminder': {
      const meta = metadata as AppointmentMetadata
      return `⏰ Reminder: ${meta.patientName} has an appointment with ${meta.providerName} on ${new Date(
        meta.appointmentDateTime
      ).toLocaleDateString()} at ${new Date(meta.appointmentDateTime).toLocaleTimeString()}.${
        meta.requiresDriver && meta.assignedDriverName
          ? ` Driver: ${meta.assignedDriverName}`
          : meta.requiresDriver
          ? ' 🚗 Transportation needed.'
          : ''
      }`
    }

    default:
      return `You have a new notification about ${(metadata as any).patientName || 'a patient'}.`
  }
}

// ============================================================================
// FAMILY MEMBER FUNCTIONS
// ============================================================================

/**
 * Get all family members with access to a patient
 */
export async function getPatientFamilyMembers(patientId: string): Promise<FamilyMember[]> {
  try {
    // Get patient document to find the owner
    const patientDoc = await getDoc(doc(db, 'patients', patientId))
    if (!patientDoc.exists()) {
      logger.warn('[NotificationService] Patient not found', { patientId })
      return []
    }

    const patient = patientDoc.data() as PatientProfile
    const ownerId = patient.userId

    // Get all family members who have access to this patient
    const familyQuery = query(
      collection(db, 'family_members'),
      where('patientsAccess', 'array-contains', patientId),
      where('status', '==', 'accepted')
    )

    const familySnap = await getDocs(familyQuery)
    const familyMembers: FamilyMember[] = []

    familySnap.forEach((doc) => {
      familyMembers.push({ id: doc.id, ...doc.data() } as FamilyMember)
    })

    logger.info('[NotificationService] Found family members with patient access', {
      patientId,
      count: familyMembers.length
    })

    return familyMembers
  } catch (error) {
    logger.error('[NotificationService] Error getting patient family members', error as Error, {
      patientId
    })
    return []
  }
}

/**
 * Get patient owner (primary account holder)
 */
export async function getPatientOwner(patientId: string): Promise<{ userId: string; email: string; name: string } | null> {
  try {
    const patientDoc = await getDoc(doc(db, 'patients', patientId))
    if (!patientDoc.exists()) {
      return null
    }

    const patient = patientDoc.data() as PatientProfile
    const ownerDoc = await getDoc(doc(db, 'users', patient.userId))

    if (!ownerDoc.exists()) {
      return null
    }

    const owner = ownerDoc.data()
    return {
      userId: patient.userId,
      email: owner.email,
      name: owner.name || owner.email
    }
  } catch (error) {
    logger.error('[NotificationService] Error getting patient owner', error as Error, {
      patientId
    })
    return null
  }
}

// ============================================================================
// ORCHESTRATION FUNCTIONS
// ============================================================================

/**
 * Send notification to all family members with access to a patient
 */
export async function sendNotificationToFamilyMembers(
  params: CreateNotificationParams & { excludeUserId?: string }
): Promise<BatchNotificationResult> {
  const results: BatchNotificationResult = {
    totalRecipients: 0,
    successCount: 0,
    failureCount: 0,
    results: []
  }

  try {
    if (!params.patientId) {
      throw new Error('patientId is required for family notifications')
    }

    // Get all family members with access to this patient
    const familyMembers = await getPatientFamilyMembers(params.patientId)

    // Also get patient owner
    const owner = await getPatientOwner(params.patientId)

    // Combine owner and family members, excluding the user who triggered the action
    const allRecipients: Array<{ userId: string; email: string; name: string }> = []

    if (owner && owner.userId !== params.excludeUserId) {
      allRecipients.push(owner)
    }

    familyMembers.forEach((member) => {
      if (member.userId !== params.excludeUserId && member.status === 'accepted') {
        allRecipients.push({
          userId: member.userId,
          email: member.email,
          name: member.name
        })
      }
    })

    results.totalRecipients = allRecipients.length

    logger.info('[NotificationService] Sending notification to family members', {
      patientId: params.patientId,
      type: params.type,
      recipientCount: allRecipients.length
    })

    // Send notification to each recipient
    for (const recipient of allRecipients) {
      try {
        // Create notification record
        const notification = await createNotification({
          ...params,
          userId: recipient.userId
        })

        // Get recipient's notification preferences
        const preferences = await getNotificationPreferences(recipient.userId)

        let emailSent = false
        let pushSent = false
        let error: string | undefined

        // Send email if enabled
        if (shouldSendNotification(params.type, 'email', preferences)) {
          emailSent = await sendEmailNotification(notification, recipient.email, recipient.name)
        }

        // Send push if enabled
        if (shouldSendNotification(params.type, 'push', preferences)) {
          pushSent = await sendPushNotification(notification, recipient.userId)
        }

        // Update result
        if (emailSent || pushSent) {
          results.successCount++
          results.results.push({
            userId: recipient.userId,
            userName: recipient.name,
            success: true
          })
        } else {
          results.failureCount++
          results.results.push({
            userId: recipient.userId,
            userName: recipient.name,
            success: false,
            error: 'No notifications sent (disabled in preferences or failed)'
          })
        }
      } catch (error) {
        logger.error('[NotificationService] Error sending notification to recipient', error as Error, {
          userId: recipient.userId,
          type: params.type
        })
        results.failureCount++
        results.results.push({
          userId: recipient.userId,
          userName: recipient.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    logger.info('[NotificationService] Family notification batch complete', {
      patientId: params.patientId,
      type: params.type,
      total: results.totalRecipients,
      success: results.successCount,
      failure: results.failureCount
    })

    return results
  } catch (error) {
    logger.error('[NotificationService] Error in sendNotificationToFamilyMembers', error as Error, {
      patientId: params.patientId,
      type: params.type
    })
    throw error
  }
}

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      readAt: new Date().toISOString(),
      status: 'read',
      updatedAt: new Date().toISOString()
    })

    logger.info('[NotificationService] Notification marked as read', { notificationId })
  } catch (error) {
    logger.error('[NotificationService] Error marking notification as read', error as Error, {
      notificationId
    })
    throw error
  }
}

/**
 * Mark multiple notifications as read
 */
export async function markMultipleAsRead(notificationIds: string[]): Promise<void> {
  try {
    const batch = writeBatch(db)
    const now = new Date().toISOString()

    notificationIds.forEach((id) => {
      batch.update(doc(db, 'notifications', id), {
        read: true,
        readAt: now,
        status: 'read',
        updatedAt: now
      })
    })

    await batch.commit()

    logger.info('[NotificationService] Multiple notifications marked as read', {
      count: notificationIds.length
    })
  } catch (error) {
    logger.error('[NotificationService] Error marking multiple notifications as read', error as Error)
    throw error
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  filter?: NotificationFilter
): Promise<Notification[]> {
  try {
    let q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    if (filter?.limit) {
      q = query(q, firestoreLimit(filter.limit))
    }

    const snapshot = await getDocs(q)
    const notifications: Notification[] = []

    snapshot.forEach((doc) => {
      const data = doc.data() as Notification

      // Apply additional filters
      if (filter?.read !== undefined && data.read !== filter.read) {
        return
      }
      if (filter?.type && (Array.isArray(filter.type) ? !filter.type.includes(data.type) : data.type !== filter.type)) {
        return
      }
      if (filter?.priority && (Array.isArray(filter.priority) ? !filter.priority.includes(data.priority) : data.priority !== filter.priority)) {
        return
      }

      notifications.push(data)
    })

    return notifications
  } catch (error) {
    logger.error('[NotificationService] Error getting user notifications', error as Error, {
      userId
    })
    return []
  }
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(userId: string): Promise<NotificationStats> {
  try {
    const notifications = await getUserNotifications(userId)

    const stats: NotificationStats = {
      total: notifications.length,
      unread: 0,
      byType: {} as Record<NotificationType, number>,
      byPriority: {} as Record<NotificationPriority, number>,
      recentCount: 0
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    notifications.forEach((notif) => {
      // Count unread
      if (!notif.read) {
        stats.unread++
      }

      // Count by type
      stats.byType[notif.type] = (stats.byType[notif.type] || 0) + 1

      // Count by priority
      stats.byPriority[notif.priority] = (stats.byPriority[notif.priority] || 0) + 1

      // Count recent (last 7 days)
      if (new Date(notif.createdAt) >= sevenDaysAgo) {
        stats.recentCount++
      }
    })

    return stats
  } catch (error) {
    logger.error('[NotificationService] Error getting notification stats', error as Error, {
      userId
    })
    throw error
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      status: 'deleted',
      updatedAt: new Date().toISOString()
    })

    logger.info('[NotificationService] Notification deleted', { notificationId })
  } catch (error) {
    logger.error('[NotificationService] Error deleting notification', error as Error, {
      notificationId
    })
    throw error
  }
}
