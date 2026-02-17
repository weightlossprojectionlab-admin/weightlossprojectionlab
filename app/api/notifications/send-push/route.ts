import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * Send a push notification via Firebase Cloud Messaging (Admin SDK)
 * POST /api/notifications/send-push
 *
 * Called internally by lib/notification-service.ts sendPushNotification()
 * Body: { token: string, notification: { title, body }, data?: Record<string, string> }
 *
 * This is an internal server-to-server route — no user auth header required
 * since it's only called from server-side code (cron jobs, API routes).
 * The FCM token itself is the authorization — only the server knows valid tokens.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, notification, data } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'FCM token is required' },
        { status: 400 }
      )
    }

    if (!notification?.title) {
      return NextResponse.json(
        { success: false, error: 'notification.title is required' },
        { status: 400 }
      )
    }

    // Import Firebase Admin SDK
    const { default: admin } = await import('firebase-admin')
    const { adminApp } = await import('@/lib/firebase-admin')

    // Ensure messaging is initialized
    let messaging
    try {
      messaging = admin.messaging(adminApp)
    } catch {
      messaging = admin.messaging()
    }

    const message: admin.messaging.Message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body || '',
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          requireInteraction: false,
        },
        fcmOptions: {
          link: data?.actionUrl || '/',
        },
      },
      // Pass any extra data fields to the service worker
      ...(data && { data }),
    }

    const messageId = await messaging.send(message)

    logger.info('[send-push] FCM message sent', { messageId, tokenPrefix: token.substring(0, 20) })

    return NextResponse.json({ success: true, messageId })
  } catch (error: any) {
    // FCM errors for invalid/expired tokens — log but don't crash
    if (error?.errorInfo?.code === 'messaging/registration-token-not-registered' ||
        error?.errorInfo?.code === 'messaging/invalid-registration-token') {
      logger.warn('[send-push] Invalid/expired FCM token', { error: error?.errorInfo?.code })
      return NextResponse.json(
        { success: false, error: 'FCM token is invalid or expired', code: error?.errorInfo?.code },
        { status: 410 } // 410 Gone — caller should delete this token
      )
    }

    return errorResponse(error, { route: '/api/notifications/send-push', operation: 'create' })
  }
}
