/**
 * Emergency Alert System for Critical Health Events
 *
 * Sends urgent push notifications to all family members and caregivers
 * when dangerous vital signs are detected.
 *
 * Features:
 * - Instant push notifications with custom alert sounds
 * - SMS fallback for critical situations
 * - Family member-specific alert tones
 * - Emergency contact notifications
 */

import { logger } from '@/lib/logger'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'

export interface EmergencyAlert {
  type: 'critical_vitals' | 'fall_detected' | 'medication_error' | 'no_response'
  severity: 'urgent' | 'emergency' // urgent = notify, emergency = notify + call
  familyMemberId: string
  familyMemberName: string
  vitalType?: string
  vitalValue?: string
  readings?: {
    bloodPressure?: string
    temperature?: string
    heartRate?: string
    oxygenSaturation?: string
    bloodSugar?: string
  }
  message: string
  guidance: string
  reportedBy: {
    uid: string
    name: string
    role: string
  }
  timestamp: Date
  location?: string
  requiresEmergencyServices?: boolean
}

export interface NotificationRecipient {
  userId: string
  name: string
  role: string
  phoneNumber?: string
  email?: string
  notificationPreferences: {
    pushEnabled: boolean
    smsEnabled: boolean
    emailEnabled: boolean
    criticalAlertsOnly: boolean
    customAlertSound?: string // Family member-specific alert tone
  }
}

/**
 * Send emergency alert to all family members and caregivers
 */
export async function sendEmergencyAlert(alert: EmergencyAlert): Promise<{
  success: boolean
  notificationsSent: number
  errors: string[]
}> {
  const errors: string[] = []
  let notificationsSent = 0

  try {
    logger.info('[EmergencyAlerts] Sending emergency alert', {
      type: alert.type,
      severity: alert.severity,
      familyMemberId: alert.familyMemberId
    })

    // 1. Get all family members and caregivers for this patient
    const recipients = await getAlertRecipients(alert.familyMemberId, alert.reportedBy.uid)

    if (recipients.length === 0) {
      logger.warn('[EmergencyAlerts] No recipients found for emergency alert')
      return { success: false, notificationsSent: 0, errors: ['No recipients found'] }
    }

    // 2. Create notification records in Firestore
    const notifications = await Promise.allSettled(
      recipients.map(async (recipient) => {
        try {
          // Determine alert sound based on family member and severity
          const alertSound = getAlertSound(
            alert.familyMemberId,
            alert.severity,
            recipient.notificationPreferences.customAlertSound
          )

          // Create high-priority notification
          const notificationRef = await addDoc(collection(db, 'notifications'), {
            userId: recipient.userId,
            type: alert.type,
            priority: alert.severity === 'emergency' ? 'urgent' : 'high',
            title: getAlertTitle(alert),
            message: alert.message,
            guidance: alert.guidance,
            metadata: {
              familyMemberId: alert.familyMemberId,
              familyMemberName: alert.familyMemberName,
              vitalType: alert.vitalType,
              vitalValue: alert.vitalValue,
              readings: alert.readings,
              reportedBy: alert.reportedBy,
              requiresEmergencyServices: alert.requiresEmergencyServices,
              alertSound,
              vibrationPattern: alert.severity === 'emergency' ? 'SOS' : 'urgent'
            },
            read: false,
            createdAt: serverTimestamp(),
            expiresAt: null // Emergency alerts don't expire
          })

          // 3. Send push notification via Firebase Cloud Messaging
          if (recipient.notificationPreferences.pushEnabled) {
            await sendPushNotification(recipient.userId, {
              title: getAlertTitle(alert),
              body: alert.message,
              sound: alertSound,
              priority: 'high',
              badge: 1,
              data: {
                type: alert.type,
                familyMemberId: alert.familyMemberId,
                notificationId: notificationRef.id,
                action: 'view_patient'
              }
            })
          }

          // 4. Send SMS for emergency-level alerts (if enabled)
          if (
            alert.severity === 'emergency' &&
            recipient.notificationPreferences.smsEnabled &&
            recipient.phoneNumber
          ) {
            await sendSMS(recipient.phoneNumber, {
              message: `🚨 EMERGENCY: ${alert.familyMemberName} - ${alert.message}. ${alert.guidance}`,
              from: 'WPL_ALERTS'
            })
          }

          // 5. Send email notification (if enabled)
          if (recipient.notificationPreferences.emailEnabled && recipient.email) {
            await sendEmailAlert(recipient.email, {
              subject: `🚨 ${alert.severity === 'emergency' ? 'EMERGENCY' : 'URGENT'} Alert: ${alert.familyMemberName}`,
              familyMemberName: alert.familyMemberName,
              message: alert.message,
              guidance: alert.guidance,
              readings: alert.readings,
              reportedBy: alert.reportedBy,
              timestamp: alert.timestamp
            })
          }

          notificationsSent++
          logger.info('[EmergencyAlerts] Notification sent', {
            recipient: recipient.name,
            methods: {
              push: recipient.notificationPreferences.pushEnabled,
              sms: alert.severity === 'emergency' && recipient.notificationPreferences.smsEnabled,
              email: recipient.notificationPreferences.emailEnabled
            }
          })
        } catch (error: any) {
          logger.error('[EmergencyAlerts] Failed to send notification', error instanceof Error ? error : undefined, {
            recipient: recipient.name
          })
          errors.push(`Failed to notify ${recipient.name}: ${error.message}`)
        }
      })
    )

    // 6. Log emergency alert in audit trail
    await addDoc(collection(db, 'emergency_alerts'), {
      ...alert,
      timestamp: serverTimestamp(),
      recipientCount: recipients.length,
      notificationsSent,
      errors: errors.length > 0 ? errors : null
    })

    return {
      success: notificationsSent > 0,
      notificationsSent,
      errors
    }
  } catch (error: any) {
    logger.error('[EmergencyAlerts] Failed to send emergency alert', error)
    return {
      success: false,
      notificationsSent: 0,
      errors: [error.message]
    }
  }
}

/**
 * Get all family members and caregivers who should receive alerts
 */
async function getAlertRecipients(
  familyMemberId: string,
  excludeUserId: string
): Promise<NotificationRecipient[]> {
  const recipients: NotificationRecipient[] = []

  try {
    // Get the patient/family member record to find the account owner
    const patientDoc = await getDocs(
      query(collection(db, 'patients'), where('id', '==', familyMemberId))
    )

    if (patientDoc.empty) {
      logger.warn('[EmergencyAlerts] Patient not found', { familyMemberId })
      return recipients
    }

    const patient = patientDoc.docs[0].data()
    const accountOwnerId = patient.userId

    // 1. Get account owner
    if (accountOwnerId !== excludeUserId) {
      const ownerData = await getUserNotificationPreferences(accountOwnerId)
      if (ownerData) {
        recipients.push({
          userId: accountOwnerId,
          name: ownerData.name || 'Account Owner',
          role: 'owner',
          phoneNumber: ownerData.phoneNumber,
          email: ownerData.email,
          notificationPreferences: ownerData.notificationPreferences
        })
      }
    }

    // 2. Get all caregivers with access to this family member
    const caregiverQuery = query(
      collection(db, 'users', accountOwnerId, 'familyMembers'),
      where('status', '==', 'accepted')
    )
    const caregiverDocs = await getDocs(caregiverQuery)

    for (const doc of caregiverDocs.docs) {
      const caregiver = doc.data()
      if (caregiver.userId !== excludeUserId) {
        const caregiverData = await getUserNotificationPreferences(caregiver.userId)
        if (caregiverData) {
          recipients.push({
            userId: caregiver.userId,
            name: caregiverData.name || caregiver.name || 'Caregiver',
            role: caregiver.role || 'caregiver',
            phoneNumber: caregiverData.phoneNumber,
            email: caregiverData.email,
            notificationPreferences: caregiverData.notificationPreferences
          })
        }
      }
    }

    // 3. Get emergency contacts (if configured)
    const emergencyContactsQuery = query(
      collection(db, 'users', accountOwnerId, 'emergencyContacts'),
      where('enabled', '==', true)
    )
    const emergencyDocs = await getDocs(emergencyContactsQuery)

    for (const doc of emergencyDocs.docs) {
      const contact = doc.data()
      recipients.push({
        userId: contact.id,
        name: contact.name,
        role: 'emergency_contact',
        phoneNumber: contact.phoneNumber,
        email: contact.email,
        notificationPreferences: {
          pushEnabled: false,
          smsEnabled: true, // Emergency contacts always get SMS
          emailEnabled: contact.emailEnabled || false,
          criticalAlertsOnly: true,
          customAlertSound: 'emergency_default'
        }
      })
    }

    logger.info('[EmergencyAlerts] Found recipients', {
      count: recipients.length,
      roles: recipients.map((r) => r.role)
    })

    return recipients
  } catch (error: any) {
    logger.error('[EmergencyAlerts] Failed to get alert recipients', error)
    return recipients
  }
}

/**
 * Get user's notification preferences
 */
async function getUserNotificationPreferences(userId: string): Promise<{
  name?: string
  phoneNumber?: string
  email?: string
  notificationPreferences: NotificationRecipient['notificationPreferences']
} | null> {
  try {
    // Get user profile
    const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)))

    if (userDoc.empty) {
      return null
    }

    const user = userDoc.docs[0].data()

    // Get notification preferences (or use defaults)
    const prefsDoc = await getDocs(
      query(collection(db, 'users', userId, 'notificationPreferences'))
    )

    const prefs = prefsDoc.empty ? null : prefsDoc.docs[0].data()

    return {
      name: user.displayName || user.name,
      phoneNumber: user.phoneNumber,
      email: user.email,
      notificationPreferences: {
        pushEnabled: prefs?.pushEnabled !== false, // Default ON
        smsEnabled: prefs?.smsEnabled === true, // Default OFF (requires opt-in)
        emailEnabled: prefs?.emailEnabled === true, // Default OFF
        criticalAlertsOnly: prefs?.criticalAlertsOnly === true,
        customAlertSound: prefs?.customAlertSound
      }
    }
  } catch (error) {
    logger.error('[EmergencyAlerts] Failed to get user preferences', error instanceof Error ? error : undefined, { userId })
    return null
  }
}

/**
 * Get appropriate alert sound based on family member and severity
 */
function getAlertSound(
  familyMemberId: string,
  severity: 'urgent' | 'emergency',
  customSound?: string
): string {
  if (customSound) {
    return customSound
  }

  // Family member-specific alert sounds can be configured
  // For now, use severity-based sounds
  return severity === 'emergency' ? 'emergency_siren.mp3' : 'urgent_beep.mp3'
}

/**
 * Generate alert title based on alert type and severity
 */
function getAlertTitle(alert: EmergencyAlert): string {
  const prefix = alert.severity === 'emergency' ? '🚨 EMERGENCY' : '⚠️ URGENT ALERT'

  switch (alert.type) {
    case 'critical_vitals':
      return `${prefix}: ${alert.familyMemberName} - Critical Vitals`
    case 'fall_detected':
      return `${prefix}: ${alert.familyMemberName} - Fall Detected`
    case 'medication_error':
      return `${prefix}: ${alert.familyMemberName} - Medication Issue`
    case 'no_response':
      return `${prefix}: ${alert.familyMemberName} - No Response`
    default:
      return `${prefix}: ${alert.familyMemberName}`
  }
}

/**
 * Send push notification via Firebase Cloud Messaging
 */
async function sendPushNotification(
  userId: string,
  notification: {
    title: string
    body: string
    sound: string
    priority: string
    badge: number
    data: Record<string, any>
  }
): Promise<void> {
  try {
    // Get user's FCM tokens
    const tokensQuery = query(
      collection(db, 'notification_tokens'),
      where('userId', '==', userId)
    )
    const tokenDocs = await getDocs(tokensQuery)

    if (tokenDocs.empty) {
      logger.warn('[EmergencyAlerts] No FCM tokens found for user', { userId })
      return
    }

    const tokens = tokenDocs.docs.map((doc) => doc.data().token)

    // TODO: Send via Firebase Admin SDK (server-side)
    // This should be done in an API route or Cloud Function
    logger.info('[EmergencyAlerts] Push notification queued', {
      userId,
      tokensCount: tokens.length,
      title: notification.title
    })

    // For now, we'll create a pending notification that the server will pick up
    await addDoc(collection(db, 'pending_push_notifications'), {
      userId,
      tokens,
      notification,
      createdAt: serverTimestamp(),
      status: 'pending'
    })
  } catch (error) {
    logger.error('[EmergencyAlerts] Failed to send push notification', error instanceof Error ? error : undefined, { userId })
    throw error
  }
}

/**
 * Send SMS alert (requires Twilio or similar service)
 */
async function sendSMS(
  phoneNumber: string,
  message: { message: string; from: string }
): Promise<void> {
  try {
    // TODO: Integrate with Twilio or similar SMS service
    logger.info('[EmergencyAlerts] SMS queued', {
      phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
      messageLength: message.message.length
    })

    // For now, queue for server-side processing
    await addDoc(collection(db, 'pending_sms'), {
      phoneNumber,
      message: message.message,
      from: message.from,
      createdAt: serverTimestamp(),
      status: 'pending'
    })
  } catch (error) {
    logger.error('[EmergencyAlerts] Failed to send SMS', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Send email alert
 */
async function sendEmailAlert(
  email: string,
  details: {
    subject: string
    familyMemberName: string
    message: string
    guidance: string
    readings?: any
    reportedBy: any
    timestamp: Date
  }
): Promise<void> {
  try {
    // TODO: Integrate with SendGrid, AWS SES, or similar email service
    logger.info('[EmergencyAlerts] Email queued', { email, subject: details.subject })

    // For now, queue for server-side processing
    await addDoc(collection(db, 'pending_emails'), {
      to: email,
      subject: details.subject,
      template: 'emergency_alert',
      data: details,
      createdAt: serverTimestamp(),
      status: 'pending'
    })
  } catch (error) {
    logger.error('[EmergencyAlerts] Failed to send email', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Helper to quickly send critical vital alert
 */
export async function sendCriticalVitalAlert(
  familyMemberId: string,
  familyMemberName: string,
  readings: EmergencyAlert['readings'],
  vitalType: string,
  vitalValue: string,
  guidance: string,
  reportedBy: EmergencyAlert['reportedBy'],
  requiresEmergencyServices: boolean = false
): Promise<{ success: boolean; notificationsSent: number }> {
  const alert: EmergencyAlert = {
    type: 'critical_vitals',
    severity: requiresEmergencyServices ? 'emergency' : 'urgent',
    familyMemberId,
    familyMemberName,
    vitalType,
    vitalValue,
    readings,
    message: `${familyMemberName} has a critical ${vitalType} reading: ${vitalValue}`,
    guidance,
    reportedBy,
    timestamp: new Date(),
    requiresEmergencyServices
  }

  const result = await sendEmergencyAlert(alert)
  return { success: result.success, notificationsSent: result.notificationsSent }
}
