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

import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/email-service'
import { generateGenericNotificationEmail } from '@/lib/email-templates'
import { VITAL_DISPLAY_NAMES, VITAL_ICONS } from '@/lib/vital-reminder-logic'
import { shouldDispatch, getUserPreferences, type Channel } from '@/lib/notifications/preferences'
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
  /** When provided, the notification deep-links to that patient's dashboard
   *  instead of the generic /dashboard — so tapping a "Blood pressure
   *  reminder for Baby 3" lands on Baby 3's chart, not the user's home. */
  patientId?: string
  isTest?: boolean
}): BuiltNotification {
  const { vitalType, patientName, patientId, isTest } = opts
  const icon = VITAL_ICONS[vitalType] ?? '🔔'
  const displayName = VITAL_DISPLAY_NAMES[vitalType] ?? 'vital'
  const labelLower = displayName.toLowerCase()
  const verb = VITAL_VERBS[vitalType] ?? 'log'
  const forSuffix = patientName ? ` for ${patientName}` : ''
  const possessive = patientName ? `${patientName}'s` : 'your'

  return {
    title: `${icon} ${displayName} reminder${forSuffix}${isTest ? ' (test)' : ''}`,
    body: `Time to ${verb} ${possessive} ${labelLower}.`,
    // Deep-link to the patient's vitals tab AND open the quick-log modal
    // pre-selected to the specific vital being reminded about. The patient
    // detail page reads `?tab=vitals&logVital={type}` and pops the modal
    // on mount once the patient is loaded — so tapping a "Blood pressure
    // reminder for Baby 3" notification jumps straight to BP entry.
    link: patientId
      ? `/patients/${patientId}?tab=vitals&logVital=${encodeURIComponent(vitalType)}`
      : '/dashboard',
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

  // Firestore admin SDK rejects undefined values anywhere in the doc, so we
  // strip undefined keys from metadata recursively before writing. Common
  // case: optional fields like DutyMetadata.forPatientId / forPatientName
  // are passed through as `undefined` when a duty isn't tied to a patient.
  const cleanMetadata = stripUndefined(opts.metadata) as NotificationMetadata

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
    metadata: cleanMetadata,
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

/**
 * Recursively remove undefined-valued fields from an object. Firestore
 * admin SDK throws "Cannot use 'undefined' as a Firestore value" for any
 * undefined leaf, even at deep levels — common case is optional metadata
 * fields like DutyMetadata.forPatientId on a duty that isn't tied to a
 * patient. Returns a new object; does not mutate the input.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      out[k] = stripUndefined(v)
    }
    return out as T
  }
  return value
}

// ─── Email channel sender ───────────────────────────────────────────────

/**
 * Send a notification via email (Resend). Looks up the user's email from
 * Firebase Auth (admin SDK) — falls back to users/{uid}.email if Auth is
 * missing it. Renders a minimal HTML body with the title, message, and a
 * CTA link to actionUrl. Email-specific subject prefix is the title verbatim.
 */
async function dispatchUserEmail(opts: {
  userId: string
  title: string
  body: string
  link: string
  priority?: NotificationPriority
  /** Origin URL used to build the CTA href. Falls back to NEXT_PUBLIC_APP_URL. */
  origin?: string
}): Promise<{ ok: boolean; reason?: string }> {
  const { userId, title, body, link, priority } = opts

  // Resolve recipient email + display name: Auth first, then Firestore mirror
  let recipient: string | undefined
  let recipientName: string | undefined
  try {
    const user = await adminAuth.getUser(userId)
    recipient = user.email ?? undefined
    recipientName = user.displayName ?? undefined
  } catch (error) {
    logger.warn('[notifications/dispatch] auth.getUser failed; falling back to Firestore', { userId })
  }
  if (!recipient) {
    try {
      const doc = await adminDb.collection('users').doc(userId).get()
      const data = doc.data()
      if (typeof data?.email === 'string') recipient = data.email
      if (!recipientName && typeof data?.displayName === 'string') recipientName = data.displayName
    } catch (error) {
      logger.warn('[notifications/dispatch] users/{uid}.email lookup failed', { userId, error })
    }
  }

  if (!recipient) {
    return { ok: false, reason: 'No email address on file for user' }
  }

  const origin = opts.origin
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? 'https://www.wellnessprojectionlab.com'
  const ctaUrl = link.startsWith('http') ? link : `${origin}${link.startsWith('/') ? '' : '/'}${link}`

  // Use the branded notification template (purple gradient header + content
  // box + CTA + footer with prefs link). Subject is the notification title.
  const { html, text, subject } = generateGenericNotificationEmail({
    title,
    body,
    ctaUrl,
    recipientName,
  })

  try {
    // Routine notifications use 'normal' priority headers — high priority
    // (X-Priority:1, Importance:high) increases spam scoring on
    // non-transactional mail. Urgent notifications opt into high.
    await sendEmail({
      to: recipient,
      subject,
      html,
      text,
      priority: priority === 'urgent' ? 'high' : 'normal',
      category: 'notification',
    })
    return { ok: true }
  } catch (error: any) {
    logger.error('[notifications/dispatch] email send failed', error as Error, { userId })
    return { ok: false, reason: error?.message ?? 'Email send failed' }
  }
}

// ─── Voice channel — extension point (future Alexa / Google / Apple / Bixby) ─

/**
 * Voice provider adapter shape. Implement one per provider in a future PR
 * and register it via `registerVoiceProvider()`. The voiceSender below
 * iterates every registered provider, calls isLinked, then send.
 *
 * Token storage convention: users/{uid}/voiceTokens/{provider} mirrors the
 * existing FCM token pattern at notification_tokens/{userId}. Each provider
 * stores its own OAuth tokens / device IDs.
 */
export interface VoiceProvider {
  name: 'alexa' | 'google' | 'apple' | 'bixby'
  isLinked(userId: string): Promise<boolean>
  send(userId: string, event: { title: string; body: string; link: string; priority?: NotificationPriority }): Promise<void>
}

const voiceProviders: VoiceProvider[] = []

/** Register a voice provider adapter. Called at app boot from a future
 *  lib/notifications/voice/{provider}.ts file. No-op until providers exist. */
export function registerVoiceProvider(provider: VoiceProvider): void {
  voiceProviders.push(provider)
}

async function dispatchUserVoice(opts: {
  userId: string
  title: string
  body: string
  link: string
  priority?: NotificationPriority
}): Promise<{ ok: boolean; reason?: string }> {
  if (voiceProviders.length === 0) {
    return { ok: false, reason: 'No voice providers registered' }
  }
  let attempted = 0
  for (const provider of voiceProviders) {
    try {
      if (await provider.isLinked(opts.userId)) {
        await provider.send(opts.userId, opts)
        attempted++
      }
    } catch (error) {
      logger.warn('[notifications/dispatch] voice provider failed', { provider: provider.name, error })
    }
  }
  return attempted > 0 ? { ok: true } : { ok: false, reason: 'No linked voice providers' }
}

// ─── SMS channel — extension point (future Twilio integration) ─────────

async function dispatchUserSms(_opts: {
  userId: string
  title: string
  body: string
  link: string
}): Promise<{ ok: boolean; reason?: string }> {
  // Placeholder: a future Twilio integration plugs in here. Mirrors the email
  // recipient lookup pattern (Auth phoneNumber → Firestore fallback) plus
  // a Twilio client send. No-op for now.
  return { ok: false, reason: 'SMS channel not implemented' }
}

// ─── Channel-aware fan-out ──────────────────────────────────────────────

export interface NotificationEvent {
  userId: string
  type: NotificationType
  title: string
  body: string
  link: string
  priority?: NotificationPriority
  metadata: NotificationMetadata
  patientId?: string
  /** Used to namespace the FCM tag. */
  tagPrefix?: string
  /** Optional explicit list of channels to attempt; defaults to all. */
  channels?: Channel[]
  /** Optional TTL passed through to the bell mirror row. */
  expiresInDays?: number
  /** Optional actionLabel for the bell row. Defaults to 'Open'. */
  actionLabel?: string
}

export interface DispatchSummary {
  /** True if at least one channel succeeded. */
  ok: boolean
  notificationId?: string
  /** Per-channel outcome for callers/tests/log analysis. */
  channels: Partial<Record<Channel, { dispatched: boolean; reason?: string }>>
  /** Set when push reported a stale FCM token. */
  staleToken?: boolean
}

const ALL_CHANNELS: Channel[] = ['push', 'inApp', 'email', 'voice', 'sms']

/**
 * Fan a single notification event out across channels, gated by the user's
 * preferences. Reads prefs once, then asks shouldDispatch for each channel.
 * On per-channel failure, logs and continues — one channel's failure never
 * blocks another.
 */
export async function dispatchNotification(event: NotificationEvent): Promise<DispatchSummary> {
  const channels = event.channels ?? ALL_CHANNELS
  const prefs = await getUserPreferences(event.userId)
  const summary: DispatchSummary = { ok: false, channels: {} }

  for (const channel of channels) {
    const allowed = await shouldDispatch({
      userId: event.userId,
      type: event.type,
      channel,
      priority: event.priority,
      prefs,
    })
    if (!allowed) {
      summary.channels[channel] = { dispatched: false, reason: 'preferences' }
      continue
    }

    try {
      switch (channel) {
        case 'push': {
          const result = await dispatchUserPush({
            userId: event.userId,
            title: event.title,
            body: event.body,
            link: event.link,
            tagPrefix: event.tagPrefix ?? event.type,
          })
          summary.channels.push = { dispatched: result.ok, reason: result.reason }
          if (result.staleToken) summary.staleToken = true
          if (result.ok) summary.ok = true
          break
        }
        case 'inApp': {
          const record = await recordInAppNotification({
            userId: event.userId,
            patientId: event.patientId,
            type: event.type,
            priority: event.priority,
            title: event.title,
            message: event.body,
            actionUrl: event.link,
            actionLabel: event.actionLabel,
            metadata: event.metadata,
            pushed: !!summary.channels.push?.dispatched,
            expiresInDays: event.expiresInDays,
          })
          summary.notificationId = record.id
          summary.channels.inApp = { dispatched: true }
          summary.ok = true
          break
        }
        case 'email': {
          const result = await dispatchUserEmail({
            userId: event.userId,
            title: event.title,
            body: event.body,
            link: event.link,
            priority: event.priority,
          })
          summary.channels.email = { dispatched: result.ok, reason: result.reason }
          if (result.ok) summary.ok = true
          break
        }
        case 'voice': {
          const result = await dispatchUserVoice({
            userId: event.userId,
            title: event.title,
            body: event.body,
            link: event.link,
            priority: event.priority,
          })
          summary.channels.voice = { dispatched: result.ok, reason: result.reason }
          if (result.ok) summary.ok = true
          break
        }
        case 'sms': {
          const result = await dispatchUserSms({
            userId: event.userId,
            title: event.title,
            body: event.body,
            link: event.link,
          })
          summary.channels.sms = { dispatched: result.ok, reason: result.reason }
          if (result.ok) summary.ok = true
          break
        }
      }
    } catch (error) {
      logger.error(`[notifications/dispatch] ${channel} channel threw`, error as Error, { userId: event.userId })
      summary.channels[channel] = { dispatched: false, reason: (error as Error)?.message ?? 'channel error' }
    }
  }

  return summary
}

// ─── High-level: vital reminder ─────────────────────────────────────────

/**
 * Build + dispatch a vital reminder across all enabled channels. The
 * convenience entry point used by the test endpoint and the future
 * vital-reminder cron.
 *
 * - Looks up patientName when a patientId is given.
 * - Calls dispatchNotification which fans out across push/inApp/email
 *   (and voice/sms once those senders are wired), gated by the user's
 *   notification_preferences (or legacy notificationSettings as fallback).
 * - Returns a DispatchResult shape compatible with the prior single-channel
 *   API so callers (test route, etc.) don't need changes.
 */
export async function sendVitalReminder(opts: {
  userId: string
  patientId?: string
  vitalType: VitalType
  isTest?: boolean
  /** Optional channel filter. If omitted on a non-test path, all channels
   *  (push/inApp/email/voice/sms) fire subject to user preferences. On test
   *  paths, defaults to ['push','inApp'] to avoid email spam from rapid
   *  click-testing — pass an explicit array (e.g. all channels) to override. */
  channels?: Channel[]
}): Promise<DispatchResult> {
  const { userId, patientId, vitalType, isTest, channels } = opts

  const patientName = patientId && patientId !== userId
    ? await getPatientName(userId, patientId)
    : null
  const resolvedPatientId = patientName ? patientId : undefined

  const built = buildVitalReminder({ vitalType, patientName, patientId: resolvedPatientId, isTest })

  const summary = await dispatchNotification({
    userId,
    type: built.type,
    title: built.title,
    body: built.body,
    link: built.link,
    metadata: built.metadata,
    patientId: resolvedPatientId,
    priority: 'normal',
    tagPrefix: isTest ? 'test' : 'vital-reminder',
    actionLabel: 'Open',
    // Channel selection precedence:
    //   1. Explicit `channels` from the caller wins (e.g. /profile "Test
    //      Your Settings" passes all channels for an end-to-end pref test).
    //   2. On test paths without an explicit list, default to push+inApp so
    //      rapid per-vital test clicks don't email-spam the user.
    //   3. On real (non-test) paths, undefined = all channels, gated by prefs.
    channels: channels ?? (isTest ? ['push', 'inApp'] : undefined),
  })

  // Map the per-channel summary back to the legacy DispatchResult shape so
  // existing callers (test route, etc.) keep working without changes.
  const pushOk = summary.channels.push?.dispatched ?? false
  const inAppOk = summary.channels.inApp?.dispatched ?? false
  return {
    ok: summary.ok,
    notificationId: summary.notificationId,
    staleToken: summary.staleToken,
    code: !summary.ok && !pushOk && !inAppOk ? 'NO_CHANNEL' : undefined,
    reason: !summary.ok ? 'All channels suppressed or failed' : undefined,
  }
}
