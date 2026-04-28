/**
 * Notification Dispatch — shared server-side notification helpers
 *
 * Single source of truth for:
 *  - Patient-name lookup (scoped to the owning user)
 *  - FCM push send + stale-token pruning
 *  - In-app notifications collection writes (the bell mirror)
 *  - Per-vital reminder message construction
 *
 * Used by the test endpoint, send-push endpoint, appointment creation, the
 * household duty notification service, and (eventually) the vital and
 * appointment reminder crons.
 *
 * SERVER-SIDE ONLY. Uses firebase-admin (admin SDK). Do not import from
 * client components — use lib/notification-service.ts (client SDK) instead.
 */

import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { VITAL_DISPLAY_NAMES, VITAL_ICONS } from '@/lib/vital-reminder-logic'
import type { VitalType } from '@/types/medical'
import type {
  NotificationType,
  NotificationPriority,
  NotificationMetadata,
} from '@/types/notifications'

// ─── Types ──────────────────────────────────────────────────────────────

export interface BuiltNotification {
  title: string
  body: string
  link: string
  type: NotificationType
  metadata: NotificationMetadata
}

export interface DispatchResult {
  ok: boolean
  messageId?: string
  notificationId?: string
  /** Set when stale-token detected (caller may surface to user) */
  staleToken?: boolean
  /** FCM error code if !ok */
  code?: string
  reason?: string
}

// ─── Patient-name lookup ────────────────────────────────────────────────

/**
 * Look up a patient's display name, scoped to the owning user.
 * Returns null if the patient doc doesn't exist under this user.
 *
 * Replaces the O(N-users) global scan in lib/duty-notification-service.ts —
 * the caller already knows which user owns the patient (from the duty's
 * assignedBy/forPatientId, the auth context, etc.) so we can read the
 * single doc directly. Patients live at users/{userId}/patients/{patientId}.
 */
export async function getPatientName(userId: string, patientId: string): Promise<string | null> {
  if (!userId || !patientId) return null
  try {
    const doc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .get()
    const data = doc.data()
    return doc.exists && typeof data?.name === 'string' ? data.name : null
  } catch (error) {
    logger.warn('[notifications/dispatch] getPatientName failed', { userId, patientId, error })
    return null
  }
}

// ─── Vital reminder builder ─────────────────────────────────────────────

/**
 * Verb used in the body for each vital ("log", "check", "take", etc.).
 * VITAL_DISPLAY_NAMES + VITAL_ICONS cover the noun + emoji; this map adds
 * the action verb so messages read naturally.
 */
const VITAL_VERBS: Partial<Record<VitalType, string>> = {
  blood_pressure: 'log',
  blood_sugar: 'check',
  temperature: 'take',
  pulse_oximeter: 'log',
  weight: 'log',
  mood: 'log',
  newborn_heart_rate: 'check',
  newborn_respiratory_rate: 'check',
  newborn_oxygen_saturation: 'check',
  newborn_bilirubin: 'check',
  newborn_blood_glucose: 'check',
  newborn_head_circumference: 'measure',
  newborn_diaper_output: 'log',
  newborn_fontanelle: 'check',
}

export function buildVitalReminder(opts: {
  vitalType: VitalType
  patientName: string | null
  isTest?: boolean
}): BuiltNotification {
  const { vitalType, patientName, isTest } = opts
  const icon = VITAL_ICONS[vitalType] ?? '🔔'
  const displayName = VITAL_DISPLAY_NAMES[vitalType] ?? 'vital'
  const labelLower = displayName.toLowerCase()
  const verb = VITAL_VERBS[vitalType] ?? 'log'
  const forSuffix = patientName ? ` for ${patientName}` : ''
  const possessive = patientName ? `${patientName}'s` : 'your'

  return {
    title: `${icon} ${displayName} reminder${forSuffix}${isTest ? ' (test)' : ''}`,
    body: `Time to ${verb} ${possessive} ${labelLower}.`,
    link: '/dashboard',
    // The bell renders by NotificationType — vital_alert is the closest
    // existing variant for vital reminders. Add 'vital_reminder' to the
    // union later if we want to differentiate alerts (out-of-range) from
    // reminders (scheduled prompts).
    type: 'vital_alert',
    metadata: {
      vitalId: isTest ? 'test' : `reminder-${Date.now()}`,
      vitalType,
      value: isTest ? 'Test reminder' : 'Reminder',
      unit: '',
      patientName: patientName ?? 'You',
      actionBy: isTest ? 'System (Test)' : 'System',
      actionByUserId: 'system',
    },
  }
}

// ─── FCM push dispatch ──────────────────────────────────────────────────

/**
 * Send a push to a single user. Fetches their FCM token from
 * notification_tokens/{userId}, sends via admin.messaging().send() with
 * a unique tag + renotify, and prunes stale tokens (deletes the
 * notification_tokens doc on `messaging/registration-token-not-registered`
 * or `messaging/invalid-registration-token`).
 *
 * Returns ok:true with messageId on success, or ok:false with staleToken:true
 * + code when the token was rejected. Caller decides 4xx/410.
 */
export async function dispatchUserPush(opts: {
  userId: string
  title: string
  body: string
  link: string
  /** Used to namespace the FCM tag, e.g. 'test', 'vital-reminder', 'appt-reminder'. */
  tagPrefix: string
  /** Extra structured data to deliver to the SW (string-keyed, string-valued per FCM). */
  data?: Record<string, string>
}): Promise<DispatchResult> {
  const { userId, title, body, link, tagPrefix, data } = opts

  // Fetch the user's FCM token
  const tokenDoc = await adminDb.collection('notification_tokens').doc(userId).get()
  const fcmToken = tokenDoc.data()?.token
  if (!tokenDoc.exists || typeof fcmToken !== 'string' || !fcmToken) {
    return { ok: false, code: 'NO_TOKEN', reason: 'No notification token registered for this user' }
  }

  // Unique tag per push so rapid back-to-back sends don't coalesce. renotify
  // ensures the OS still alerts the user even though each tag is unique.
  const tag = `${tagPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const admin = (await import('firebase-admin')).default
  try {
    const messageId = await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      webpush: {
        notification: { tag, renotify: true },
        fcmOptions: { link },
      },
      ...(data && { data }),
    })
    return { ok: true, messageId }
  } catch (error: any) {
    const code = error?.errorInfo?.code ?? error?.code
    const isStale =
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    if (isStale) {
      logger.warn('[notifications/dispatch] Stale FCM token — deleting', { userId, code })
      try {
        await adminDb.collection('notification_tokens').doc(userId).delete()
      } catch (deleteError) {
        logger.error('[notifications/dispatch] Failed to delete stale token', deleteError as Error, { userId })
      }
      return { ok: false, staleToken: true, code, reason: 'FCM token is invalid or expired' }
    }
    logger.error('[notifications/dispatch] FCM send failed', error as Error, { userId, code })
    return { ok: false, code: code ?? 'UNKNOWN', reason: (error as Error)?.message ?? 'FCM send failed' }
  }
}

// ─── In-app bell mirror write ───────────────────────────────────────────

/**
 * Write a row to the `notifications` collection (the bell + /notifications view).
 * This is the canonical doc shape — every server-side caller should go through
 * here so bell, View All page, and dismiss-as-archive all work.
 *
 * Always sets `archived: false`, `read: false`, `emailSent: false`,
 * `pushSent: <opts.pushed>` so list queries that filter on these fields
 * actually match (legacy thin docs missing these fields are silently
 * filtered out by the page's `archived == false` query).
 */
export async function recordInAppNotification(opts: {
  userId: string
  patientId?: string
  type: NotificationType
  priority?: NotificationPriority
  title: string
  message: string
  actionUrl: string
  actionLabel?: string
  metadata: NotificationMetadata
  pushed?: boolean
  /** Optional TTL: row gets `expiresAt` set to now + N days. Used by duty
   *  reminders/completions which auto-expire (7 / 30 days) so the bell
   *  doesn't accumulate stale rows. */
  expiresInDays?: number
}): Promise<{ id: string }> {
  const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  const now = new Date().toISOString()

  const doc: Record<string, unknown> = {
    id,
    userId: opts.userId,
    type: opts.type,
    priority: opts.priority ?? 'normal',
    status: opts.pushed ? 'delivered' : 'pending',
    title: opts.title,
    message: opts.message,
    actionUrl: opts.actionUrl,
    actionLabel: opts.actionLabel ?? 'Open',
    metadata: opts.metadata,
    read: false,
    archived: false,
    emailSent: false,
    pushSent: !!opts.pushed,
    createdAt: now,
    updatedAt: now,
  }
  if (opts.patientId) doc.patientId = opts.patientId
  if (opts.pushed) doc.pushSentAt = now
  if (opts.expiresInDays && opts.expiresInDays > 0) {
    const expires = new Date()
    expires.setDate(expires.getDate() + opts.expiresInDays)
    doc.expiresAt = expires.toISOString()
  }

  await adminDb.collection('notifications').doc(id).set(doc)
  return { id }
}

// ─── High-level: vital reminder ─────────────────────────────────────────

/**
 * Build + push + record a vital reminder. The convenience entry point that
 * the test endpoint and the future vital-reminder cron call.
 *
 * - Looks up patientName when a patientId is given.
 * - Sends FCM push (handles stale-token pruning).
 * - Always writes the bell mirror, even if push fails — the user can still
 *   see it in /notifications.
 */
export async function sendVitalReminder(opts: {
  userId: string
  patientId?: string
  vitalType: VitalType
  isTest?: boolean
}): Promise<DispatchResult> {
  const { userId, patientId, vitalType, isTest } = opts

  const patientName = patientId && patientId !== userId
    ? await getPatientName(userId, patientId)
    : null
  const resolvedPatientId = patientName ? patientId : undefined

  const built = buildVitalReminder({ vitalType, patientName, isTest })

  // Try the push first. If no token at all, we still want to record the bell
  // row — but the test endpoint historically returns 400 in that case to
  // prompt the client to register. Caller decides; we just report.
  const push = await dispatchUserPush({
    userId,
    title: built.title,
    body: built.body,
    link: built.link,
    tagPrefix: isTest ? 'test' : 'vital-reminder',
  })

  // Write the bell mirror unless push failed for "no token" — in that case
  // there's no point in cluttering the bell with a record the user wouldn't
  // see (and the client will retry after registering).
  let notificationId: string | undefined
  if (push.ok || push.staleToken) {
    const record = await recordInAppNotification({
      userId,
      patientId: resolvedPatientId,
      type: built.type,
      priority: 'normal',
      title: built.title,
      message: built.body,
      actionUrl: built.link,
      actionLabel: 'Open',
      metadata: built.metadata,
      pushed: push.ok,
    })
    notificationId = record.id
  }

  return { ...push, notificationId }
}
