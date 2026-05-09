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

import toast from 'react-hot-toast'
import {
  getCachedSubscription,
  isCachedSubscriptionMirrored,
} from './feature-gates'
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
 * Side-effect helper: show the read-only toast and (for owners)
 * route to /pricing. Centralized so every write surface — UI gate,
 * ops guard, error boundary — produces the same UX.
 *
 * Branches on whether the cached subscription belongs to the
 * caller (owner) or is mirrored from the household owner (family
 * member / caregiver / sub-account):
 *   - Owner: toast + /pricing redirect. They can reactivate.
 *   - Family member: informational toast only, no redirect. They
 *     can't reactivate, so sending them to /pricing where the only
 *     CTAs require billing-owner authority would just be confusing.
 *     They stay on the page they were on, in read-only mode.
 *
 * Safe to call from server contexts (no-ops if window is undefined).
 */
export function handleWriteLocked(): void {
  if (typeof window === 'undefined') return

  if (isCachedSubscriptionMirrored()) {
    toast(
      "This household's subscription is read-only. Ask the account owner to reactivate.",
      { icon: '🔒', duration: 5000 },
    )
    return
  }

  toast(
    'Your subscription is read-only. Reactivate to keep building your data.',
    { icon: '🔒', duration: 4000 },
  )
  // Hard navigation rather than next/router.push — this helper is
  // invoked from lib/ layers that can't call hooks. The pricing page
  // is intentionally outside the protected app shell, so a full
  // navigation is fine.
  window.location.href = '/pricing'
}

/**
 * Throws WriteLockedError when the current user's subscription is
 * read-only (terminated). Reads from the cached subscription state
 * populated by the useSubscription hook. If the cache is empty
 * (first render, signed-out code path), allows the write silently —
 * the auth layer will reject unauthenticated Firestore calls and we
 * don't want a transient load race to block legit writes from a
 * signed-in active user.
 *
 * Side effect: when locked, also fires handleWriteLocked() so the
 * user gets the toast + redirect even if the throwing call site
 * swallows the error in its catch block. This makes the guard
 * platform-wide enforcement: any write op that calls this gets the
 * full UX without per-button wiring.
 */
export async function requireWriteAccess(): Promise<void> {
  const cached = getCachedSubscription()
  if (cached && !canWrite(cached)) {
    handleWriteLocked()
    throw new WriteLockedError()
  }
}

/**
 * Sync variant for code paths that already have the subscription
 * in scope (e.g., a component that called useSubscription and is
 * passing the value to an operation). Avoids the cache lookup.
 */
export function requireWriteAccessSync(
  subscription: { status?: string | null; plan?: string | null } | null | undefined,
): void {
  if (!canWrite(subscription)) {
    handleWriteLocked()
    throw new WriteLockedError()
  }
}
