/**
 * Server-side: enforce the household OWNER's subscription state on
 * writes by family members / caregivers / sub-accounts.
 *
 * Why this exists: the client-side api-client guard checks the
 * CALLER's own cached subscription. Family members typically don't
 * have their own subscription record — their user doc has no
 * `subscription` field, the cache is null, and the client guard
 * passes silently. If the household owner's plan is terminated,
 * the family member would still write through to Firestore.
 *
 * The fix is server-side and DRY: every write API route already
 * resolves the household owner's userId via either
 * `assertPatientAccess` (rbac-middleware.ts) or
 * `checkHouseholdAccess` (household-access.ts). Both helpers feed
 * `ownerUserId` into this guard. ONE owner-sub check covers every
 * write across the platform — sub-accounts, /admin caregivers,
 * household members, all funnel through the same choke point.
 *
 * The owner's subscription state is the household's subscription
 * state. When the owner pays, everyone in the household writes;
 * when the owner's plan ends, the household goes read-only.
 */

import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { canWrite } from '@/lib/feature-access'
import type { UserSubscription } from '@/types'

/**
 * Read the owner's subscription record. Returns null if the owner
 * doc is missing or has no subscription field.
 */
export async function loadOwnerSubscription(
  ownerUserId: string,
): Promise<UserSubscription | null> {
  try {
    const doc = await adminDb.collection('users').doc(ownerUserId).get()
    if (!doc.exists) return null
    const data = doc.data() ?? {}
    return (data.subscription ?? null) as UserSubscription | null
  } catch (error) {
    logger.error(
      '[OwnerSubGuard] Failed to load owner subscription',
      error as Error,
      { ownerUserId },
    )
    return null
  }
}

/**
 * True when the household owner's plan is terminated and the
 * household should be read-only. False for active/trialing/free/
 * unknown — fail-open here matches the client-side canWrite predicate
 * so a transient load issue doesn't lock out legit writes.
 */
export async function isOwnerWriteLocked(ownerUserId: string): Promise<boolean> {
  const sub = await loadOwnerSubscription(ownerUserId)
  return !canWrite(sub)
}

/**
 * Standard 402 response for when the owner's subscription is
 * read-only. 402 (Payment Required) is the correct semantic — the
 * client UI uses the `code` field to route the user to /pricing
 * with a reactivation prompt.
 */
export function ownerWriteLockedResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Subscription required',
      code: 'OWNER_WRITE_LOCKED',
      message:
        "This household's subscription is read-only. The account owner needs to reactivate before family members can add or edit data.",
    }),
    { status: 402, headers: { 'Content-Type': 'application/json' } },
  )
}

/**
 * Convenience: load + check + return Response. Returns null when
 * writes are allowed (caller proceeds), or a ready-to-return
 * Response when the owner is locked.
 */
export async function assertOwnerCanWrite(
  ownerUserId: string,
): Promise<Response | null> {
  if (await isOwnerWriteLocked(ownerUserId)) {
    logger.warn('[OwnerSubGuard] Write blocked — owner subscription is read-only', {
      ownerUserId,
    })
    return ownerWriteLockedResponse()
  }
  return null
}
