/**
 * Operations-layer enforcement of the read-only / write-allowed
 * subscription gate.
 *
 * Why this exists: UI gates (useLockedAction in components) catch
 * 99% of cases — the user clicks a disabled button, gets a toast +
 * redirect, never invokes the underlying operation. But UI gates
 * are easy to miss when adding new surfaces. This module provides
 * a single throw that any write operation can call to enforce
 * the policy at the data layer regardless of UI wiring.
 *
 * Pattern:
 *
 *   // lib/some-operations.ts
 *   export async function deleteItem(itemId: string) {
 *     await requireWriteAccess()
 *     // existing impl unchanged
 *   }
 *
 *   // a component (any component)
 *   try {
 *     await deleteItem('xyz')
 *   } catch (err) {
 *     if (err instanceof WriteLockedError) {
 *       // toast + redirect already handled — see handleWriteLocked
 *       return
 *     }
 *     // other error handling
 *   }
 *
 * The error is intentionally distinct (its own class) so the catch
 * handler can branch — read-locked is a "redirect to /pricing"
 * outcome, while a generic write failure is a "show error toast"
 * outcome.
 *
 * No Firestore-rules layer YET — that's the most authoritative
 * defense (server-enforced, can't be bypassed by a malicious
 * client) but a bigger lift to write right. Operations-layer
 * enforcement covers the realistic threat model for this stage:
 * normal users using the supported clients. Future hardening pass
 * will move enforcement into firestore.rules.
 */

import { getCachedSubscription } from './feature-gates'
import { canWrite } from './feature-access'

/**
 * Thrown by requireWriteAccess when the current user's subscription
 * is read-only. Catch handlers should route the user to /pricing
 * with a reactivation prompt.
 */
export class WriteLockedError extends Error {
  readonly isWriteLocked = true
  constructor(message = 'Subscription is in read-only mode. Reactivate to write.') {
    super(message)
    this.name = 'WriteLockedError'
  }
}

/**
 * Throws WriteLockedError when the current user's subscription is
 * read-only (terminated). Returns silently otherwise (active,
 * trialing, free, unknown all pass).
 *
 * Reads from the cached subscription state populated by the
 * useSubscription hook. If the cache is empty (first render before
 * subscription loads, or signed-out code path), allows the write
 * silently — the auth layer will reject unauthenticated Firestore
 * calls and we don't want a transient subscription-load race to
 * block legit writes from a signed-in active user.
 *
 * For call sites that already have the subscription in scope (e.g.,
 * a component that called useSubscription), prefer
 * requireWriteAccessSync(subscription) — no cache lookup needed.
 */
export async function requireWriteAccess(): Promise<void> {
  const cached = getCachedSubscription()
  if (cached && !canWrite(cached)) throw new WriteLockedError()
}

/**
 * Sync variant for code paths that already have the subscription
 * in scope (e.g., a component that called useSubscription and is
 * passing the value to an operation). Avoids the cache lookup.
 */
export function requireWriteAccessSync(
  subscription: { status?: string | null; plan?: string | null } | null | undefined,
): void {
  if (!canWrite(subscription)) throw new WriteLockedError()
}
