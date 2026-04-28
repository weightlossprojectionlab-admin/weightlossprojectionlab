import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'
import { adminAuth } from '@/lib/firebase-admin'
import { sendVitalReminder } from '@/lib/notifications/dispatch'
import type { VitalType } from '@/types/medical'

/**
 * Send a test notification to the authenticated user.
 *
 * POST /api/notifications/test
 * Body: { type?: string, vitalType?: VitalType, patientId?: string }
 *
 * Thin wrapper around sendVitalReminder() — see lib/notifications/dispatch.ts
 * for the actual FCM + bell-mirror flow. The dispatch module is the single
 * source of truth used by this route, the future vital-reminder cron, and
 * eventually the appointment + medication paths.
 */
export async function POST(request: NextRequest) {
  try {
    logger.debug('[Test Notification] Starting...')

    // Verify auth
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('[Test Notification] No auth header')
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 })
    }
    const idToken = authHeader.split('Bearer ')[1]

    let userId: string
    try {
      const decoded = await adminAuth.verifyIdToken(idToken)
      userId = decoded.uid
    } catch (error) {
      return errorResponse(error, { route: '/api/notifications/test', operation: 'create' })
    }

    // Parse body
    let requestedPatientId: string | undefined
    let requestedVitalType: VitalType | undefined
    let requestedChannels: ('push' | 'inApp' | 'email' | 'voice' | 'sms')[] | undefined
    try {
      const body = await request.json()
      requestedPatientId = typeof body?.patientId === 'string' ? body.patientId : undefined
      requestedVitalType = typeof body?.vitalType === 'string' ? (body.vitalType as VitalType) : undefined
      // Caller can pass explicit channels (e.g. NotificationPreferences "Test
      // Your Settings" passes all five) to override the default test path
      // which is push+inApp only.
      if (Array.isArray(body?.channels)) {
        requestedChannels = body.channels.filter((c: unknown): c is 'push' | 'inApp' | 'email' | 'voice' | 'sms' =>
          c === 'push' || c === 'inApp' || c === 'email' || c === 'voice' || c === 'sms'
        )
      }
    } catch {
      // No body or invalid JSON — defaults below
    }

    // Default to weight if no vitalType provided (preserves prior "general" → weight test behavior)
    const vitalType: VitalType = requestedVitalType ?? 'weight'

    const result = await sendVitalReminder({
      userId,
      patientId: requestedPatientId,
      vitalType,
      isTest: true,
      channels: requestedChannels,
    })

    if (result.ok) {
      logger.info('[Test Notification] Successfully sent', { userId, messageId: result.messageId })
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully! Check your device.',
        messageId: result.messageId,
        notificationId: result.notificationId,
      })
    }

    if (result.staleToken) {
      return NextResponse.json(
        {
          error: 'Notifications were disconnected on this device. Re-enable notifications in your Profile to get a fresh device token.',
          code: 'STALE_FCM_TOKEN',
          hint: 'Go to Profile → Notifications and click "Enable Notifications" again',
        },
        { status: 410 }
      )
    }

    if (result.code === 'NO_TOKEN') {
      logger.warn('[Test Notification] No notification token found', { userId })
      return NextResponse.json(
        {
          error: 'No notification token found. Please enable notifications in your Profile settings first.',
          hint: 'Go to Profile → Notifications and click "Enable Notifications"',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: result.reason ?? 'Failed to send test notification', code: result.code },
      { status: 500 }
    )
  } catch (error) {
    return errorResponse(error, { route: '/api/notifications/test', operation: 'create' })
  }
}
