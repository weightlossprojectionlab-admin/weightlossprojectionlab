import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * Send a test notification to the authenticated user
 * POST /api/notifications/test
 */
export async function POST(request: NextRequest) {
  try {
    logger.debug('[Test Notification] Starting...')

    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('[Test Notification] No auth header')
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]

    // Import Firebase Admin
    let adminAuth, adminDb, admin
    try {
      const firebaseAdmin = await import('@/lib/firebase-admin')
      adminAuth = firebaseAdmin.adminAuth
      adminDb = firebaseAdmin.adminDb
      admin = await import('firebase-admin')
      logger.debug('[Test Notification] Firebase Admin imported')
    } catch (error) {
      return errorResponse(error, {
        route: '/api/notifications/test',
        operation: 'create'
      })
    }

    // Verify token
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken)
      logger.debug('[Test Notification] Token verified', { userId: decodedToken.uid })
    } catch (error) {
      return errorResponse(error, {
        route: '/api/notifications/test',
        operation: 'create'
      })
    }

    const userId = decodedToken.uid

    // Fetch FCM token from notification_tokens collection (correct path)
    const tokenDoc = await adminDb.collection('notification_tokens').doc(userId).get()

    if (!tokenDoc.exists || !tokenDoc.data()?.token) {
      logger.warn('[Test Notification] No notification token found', { userId })
      return NextResponse.json(
        {
          error: 'No notification token found. Please enable notifications in your Profile settings first.',
          hint: 'Go to Profile → Notifications and click "Enable Notifications"'
        },
        { status: 400 }
      )
    }

    const fcmToken = tokenDoc.data()!.token

    // Parse optional body for notification type
    let notificationType = 'general'
    try {
      const body = await request.json()
      notificationType = body?.type || 'general'
    } catch {
      // No body or invalid JSON — use general
    }

    // Type-specific notification messages
    const notificationMessages: Record<string, { title: string; body: string; link: string }> = {
      weight_reminder: {
        title: '⚖️ Time to weigh in!',
        body: 'Log your weight today to stay on track with your goals.',
        link: '/dashboard',
      },
      meal_reminder: {
        title: '🍽️ Meal reminder',
        body: 'Don\'t forget to log your meal to track your nutrition.',
        link: '/dashboard',
      },
      medication_reminder: {
        title: '💊 Medication reminder',
        body: 'Time to take your medication.',
        link: '/dashboard',
      },
      appointment_reminder: {
        title: '📅 Appointment reminder',
        body: 'You have an upcoming appointment.',
        link: '/dashboard',
      },
      general: {
        title: '🎉 Test Notification',
        body: 'Your notifications are working! You\'ll receive helpful reminders to stay on track.',
        link: '/dashboard',
      },
    }

    const notif = notificationMessages[notificationType] ?? notificationMessages.general

    // Send test notification using FCM Admin SDK
    const message = {
      notification: {
        title: notif.title,
        body: notif.body,
      },
      token: fcmToken,
      webpush: {
        fcmOptions: {
          link: notif.link,
        }
      }
    }

    logger.debug('[Test Notification] Sending message...', { fcmToken: fcmToken.substring(0, 20) + '...' })

    let response
    try {
      response = await admin.messaging().send(message)
      logger.info('[Test Notification] Successfully sent', {
        userId,
        messageId: response
      })
    } catch (error: any) {
      const code = error?.errorInfo?.code ?? error?.code
      if (code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token') {
        logger.warn('[Test Notification] Stale FCM token — deleting', { userId, code })
        try {
          await adminDb.collection('notification_tokens').doc(userId).delete()
        } catch (deleteError) {
          logger.error('[Test Notification] Failed to delete stale token', deleteError as Error, { userId })
        }
        return NextResponse.json(
          {
            error: 'Notifications were disconnected on this device. Re-enable notifications in your Profile to get a fresh device token.',
            code: 'STALE_FCM_TOKEN',
            hint: 'Go to Profile → Notifications and click "Enable Notifications" again'
          },
          { status: 410 }
        )
      }
      return errorResponse(error, {
        route: '/api/notifications/test',
        operation: 'create'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully! Check your device.',
      messageId: response
    })

  } catch (error) {
    return errorResponse(error, {
      route: '/api/notifications/test',
      operation: 'create'
    })
  }
}
