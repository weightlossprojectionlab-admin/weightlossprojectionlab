import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'
import { adminDb } from '@/lib/firebase-admin'
import { dispatchUserPush } from '@/lib/notifications/dispatch'
import type { Message } from 'firebase-admin/messaging'

/**
 * Send a push notification via Firebase Cloud Messaging (Admin SDK).
 *
 * POST /api/notifications/send-push
 *
 * Body shape (one of):
 *   { userId, notification: { title, body }, data?, link? }    ← preferred
 *   { token, notification: { title, body }, data?, userId? }    ← legacy
 *
 * - When `userId` is provided we delegate to the shared dispatch helper which
 *   fetches the token, sends, and prunes stale tokens consistently with the
 *   rest of the platform (vital test reminders, duty notifications, etc.).
 * - When only `token` is provided, we send directly. If `userId` is *also*
 *   provided alongside `token`, we still delete `notification_tokens/{userId}`
 *   on stale-token errors so the next request re-registers cleanly.
 *
 * This is an internal server-to-server route — no user auth header required
 * since it's only called from server-side code (cron jobs, API routes).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, userId, notification, data, link } = body

    if (!notification?.title) {
      return NextResponse.json(
        { success: false, error: 'notification.title is required' },
        { status: 400 }
      )
    }

    // Preferred path: caller knows the userId, delegate to shared dispatch
    if (userId && !token) {
      const result = await dispatchUserPush({
        userId,
        title: notification.title,
        body: notification.body || '',
        link: link || data?.actionUrl || '/',
        tagPrefix: 'send-push',
        data,
      })

      if (result.ok) {
        logger.info('[send-push] FCM message sent (via userId)', { messageId: result.messageId, userId })
        return NextResponse.json({ success: true, messageId: result.messageId })
      }
      if (result.staleToken) {
        return NextResponse.json(
          { success: false, error: 'FCM token is invalid or expired', code: result.code },
          { status: 410 }
        )
      }
      if (result.code === 'NO_TOKEN') {
        return NextResponse.json(
          { success: false, error: 'No notification token registered for this user', code: result.code },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { success: false, error: result.reason ?? 'Failed to send', code: result.code },
        { status: 500 }
      )
    }

    // Legacy path: caller passed a raw token (e.g. nudges cron during transition)
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Either userId or token is required' },
        { status: 400 }
      )
    }

    const { default: admin } = await import('firebase-admin')
    const messaging = admin.messaging()

    const message: Message = {
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
          link: link || data?.actionUrl || '/',
        },
      },
      ...(data && { data }),
    }

    try {
      const messageId = await messaging.send(message)
      logger.info('[send-push] FCM message sent (via token)', { messageId, tokenPrefix: token.substring(0, 20) })
      return NextResponse.json({ success: true, messageId })
    } catch (error: any) {
      const code = error?.errorInfo?.code
      const isStale =
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'

      if (isStale) {
        logger.warn('[send-push] Invalid/expired FCM token', { code, userId })
        // If the caller gave us userId alongside the raw token, prune the
        // notification_tokens doc so the next request re-registers cleanly.
        // This was missing previously and caused stale tokens to linger.
        if (userId) {
          try {
            await adminDb.collection('notification_tokens').doc(userId).delete()
            logger.info('[send-push] Pruned stale notification_tokens doc', { userId })
          } catch (deleteError) {
            logger.error('[send-push] Failed to delete stale token doc', deleteError as Error, { userId })
          }
        }
        return NextResponse.json(
          { success: false, error: 'FCM token is invalid or expired', code },
          { status: 410 }
        )
      }

      return errorResponse(error, { route: '/api/notifications/send-push', operation: 'create' })
    }
  } catch (error) {
    return errorResponse(error, { route: '/api/notifications/send-push', operation: 'create' })
  }
}
