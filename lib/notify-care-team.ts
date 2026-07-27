/**
 * DRY care-team fan-out for patient events.
 *
 * When something happens on a shared patient, the care team (owner + accepted
 * caregivers) should see it on their bell. For caregiver-performed ACTIONS the
 * actor is excluded from their own event; for system ALERTS nobody is excluded.
 *
 * Recipients are resolved from the CANONICAL nested model:
 *   - owner      = users/{ownerUserId}
 *   - caregivers = users/{ownerUserId}/patients/{patientId}/familyMembers
 *                  (status == 'accepted')
 * and each notification is written via the canonical `recordInAppNotification`
 * bell writer.
 *
 * NOTE: the older `sendNotificationToFamilyMembers` resolves recipients from a
 * ROOT `patients/{id}` doc + a root `family_members` collection that the current
 * data model no longer populates, so it silently fans out to nobody. Everything
 * here does its own (correct) resolution.
 *
 * Best-effort by contract: any failure is logged and swallowed so it never
 * breaks the underlying write (the log itself already succeeded).
 */

import { adminDb } from '@/lib/firebase-admin'
import { recordInAppNotification } from '@/lib/notifications/dispatch'
import { logger } from '@/lib/logger'
import type { NotificationType, NotificationPriority, NotificationMetadata } from '@/types/notifications'

/** Owner + accepted caregivers of a patient, minus `excludeUserId`, deduped. */
async function resolveCareTeamRecipients(
  ownerUserId: string,
  patientId: string,
  excludeUserId?: string,
): Promise<string[]> {
  const caregivers = await adminDb
    .collection('users').doc(ownerUserId)
    .collection('patients').doc(patientId)
    .collection('familyMembers')
    .where('status', '==', 'accepted')
    .get()

  const ids = new Set<string>([ownerUserId])
  caregivers.forEach((d) => {
    const uid = d.data()?.userId
    if (uid) ids.add(uid)
  })
  if (excludeUserId) ids.delete(excludeUserId)
  return Array.from(ids)
}

/**
 * Low-level fan-out: deliver a fully-formed notification to the care team.
 * Use for system ALERTS (no actor) or when you need a custom message. For
 * caregiver actions prefer `notifyCareTeamOfEvent`.
 */
export async function notifyCareTeam(opts: {
  patientId: string
  ownerUserId: string
  /** Omit to notify everyone; set to exclude the actor from their own action. */
  excludeUserId?: string
  type: NotificationType
  title: string
  message: string
  priority?: NotificationPriority
  actionUrl?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const recipients = await resolveCareTeamRecipients(opts.ownerUserId, opts.patientId, opts.excludeUserId)
    if (recipients.length === 0) return

    await Promise.all(
      recipients.map((userId) =>
        recordInAppNotification({
          userId,
          patientId: opts.patientId,
          type: opts.type,
          priority: opts.priority ?? 'normal',
          title: opts.title,
          message: opts.message,
          actionUrl: opts.actionUrl ?? '/notifications',
          metadata: (opts.metadata ?? {}) as NotificationMetadata,
        }).catch((e) =>
          logger.error('[notifyCareTeam] recipient write failed', e as Error, { userId, type: opts.type }),
        ),
      ),
    )
  } catch (error) {
    logger.error('[notifyCareTeam] failed', error as Error, { patientId: opts.patientId, type: opts.type })
  }
}

/**
 * Convenience for caregiver-performed ACTIONS. Resolves the actor + patient
 * display names, builds a "{actor} {action}" message, and fans out to the care
 * team EXCLUDING the actor.
 */
export async function notifyCareTeamOfEvent(opts: {
  patientId: string
  ownerUserId: string
  /** The caregiver/owner who performed the action — excluded from recipients. */
  actorUserId: string
  type: NotificationType
  title: string
  /** Verb phrase appended after the actor's name, e.g. "gave a dose of Aspirin". */
  action: string
  priority?: NotificationPriority
  actionUrl?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const [actorSnap, patientSnap] = await Promise.all([
      adminDb.collection('users').doc(opts.actorUserId).get(),
      adminDb.collection('users').doc(opts.ownerUserId).collection('patients').doc(opts.patientId).get(),
    ])
    const actor = actorSnap.data() || {}
    const actorName = actor.displayName || actor.name || 'A caregiver'
    const patient = patientSnap.data() || {}
    const patientName = patient.nickname || patient.name || 'the patient'

    await notifyCareTeam({
      patientId: opts.patientId,
      ownerUserId: opts.ownerUserId,
      excludeUserId: opts.actorUserId,
      type: opts.type,
      title: opts.title,
      message: `${actorName} ${opts.action}`,
      priority: opts.priority,
      actionUrl: opts.actionUrl,
      metadata: {
        actionBy: actorName,
        actionByUserId: opts.actorUserId,
        patientName,
        ...opts.metadata,
      },
    })
  } catch (error) {
    logger.error('[notifyCareTeamOfEvent] failed', error as Error, {
      patientId: opts.patientId,
      type: opts.type,
    })
  }
}
