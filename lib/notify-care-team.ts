/**
 * DRY care-team fan-out for caregiver-logged events.
 *
 * When a caregiver logs something on a shared patient (a dose given, a meal, an
 * appointment), the OTHER caregivers + the owner should see it on their bell —
 * but the actor shouldn't be pinged about their own action.
 *
 * Resolves the recipient set from the CANONICAL nested model:
 *   - owner            = users/{ownerUserId}
 *   - caregivers       = users/{ownerUserId}/patients/{patientId}/familyMembers
 *                        (status == 'accepted')
 * minus the actor, then writes each notification via the canonical
 * `recordInAppNotification` bell writer.
 *
 * NOTE: the older `sendNotificationToFamilyMembers` resolves recipients from a
 * ROOT `patients/{id}` doc + a root `family_members` collection that the current
 * data model no longer populates, so it silently fans out to nobody. This helper
 * deliberately does its own (correct) resolution.
 *
 * Best-effort by contract: any failure is logged and swallowed so it never
 * breaks the underlying write (the log itself already succeeded).
 */

import { adminDb } from '@/lib/firebase-admin'
import { recordInAppNotification } from '@/lib/notifications/dispatch'
import { logger } from '@/lib/logger'
import type { NotificationType, NotificationPriority, NotificationMetadata } from '@/types/notifications'

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
    const patientRef = adminDb
      .collection('users').doc(opts.ownerUserId)
      .collection('patients').doc(opts.patientId)

    const [actorSnap, patientSnap, caregiversSnap] = await Promise.all([
      adminDb.collection('users').doc(opts.actorUserId).get(),
      patientRef.get(),
      patientRef.collection('familyMembers').where('status', '==', 'accepted').get(),
    ])

    const actor = actorSnap.data() || {}
    const actorName = actor.displayName || actor.name || 'A caregiver'
    const patient = patientSnap.data() || {}
    const patientName = patient.nickname || patient.name || 'the patient'

    // Recipient set = owner + accepted caregivers of this patient, minus the actor.
    const recipientIds = new Set<string>([opts.ownerUserId])
    caregiversSnap.forEach((d) => {
      const uid = d.data()?.userId
      if (uid) recipientIds.add(uid)
    })
    recipientIds.delete(opts.actorUserId)
    if (recipientIds.size === 0) return

    const message = `${actorName} ${opts.action}`
    const metadata = {
      actionBy: actorName,
      actionByUserId: opts.actorUserId,
      patientName,
      ...opts.metadata,
    } as NotificationMetadata

    await Promise.all(
      Array.from(recipientIds).map((userId) =>
        recordInAppNotification({
          userId,
          patientId: opts.patientId,
          type: opts.type,
          priority: opts.priority ?? 'normal',
          title: opts.title,
          message,
          actionUrl: opts.actionUrl ?? '/notifications',
          metadata,
        }).catch((e) =>
          logger.error('[notifyCareTeamOfEvent] recipient write failed', e as Error, { userId, type: opts.type }),
        ),
      ),
    )
  } catch (error) {
    logger.error('[notifyCareTeamOfEvent] failed', error as Error, {
      patientId: opts.patientId,
      type: opts.type,
    })
  }
}
