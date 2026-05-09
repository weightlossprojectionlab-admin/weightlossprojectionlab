/**
 * Subscription read/write access predicate — one state, one rule.
 *
 * Semantic model (deliberately simple):
 *   - Active or trialing subscription → can write
 *   - Terminated subscription (canceled / expired) → READ-ONLY
 *
 * That's it. No per-feature map, no granular policy. The user's
 * data is always visible (the moat); writes require an active sub.
 *
 * Why this collapsed from a 3-state per-feature enum: maintenance
 * cost > value. The only meaningful distinction was "locked vs
 * read_only" for editor forms (form opens with disabled inputs)
 * vs buttons (button doesn't open the form). But both states funnel
 * to the same outcome — user must reactivate. Keeping the
 * distinction added a FeatureKey enum + access map that needed an
 * entry per gated surface, with no real product benefit. Every
 * gated surface now uses one of two helpers (canWrite / isReadOnly)
 * and one hook (useLockedAction).
 *
 * Defense-in-depth has two layers:
 *   1. UI gates via useLockedAction — buttons disable, lock icons,
 *      reactivate prompts. Friendly UX.
 *   2. Operations gates via requireWriteAccess (lib/access-guards.ts)
 *      — every write op throws WriteLockedError if the user is
 *      read-only, even if the UI gate was missed. Catches direct
 *      calls, future routes, third-party API consumers.
 *
 * Future: if a finer policy is ever needed (e.g., "trial-end users
 * can still log meals for 30 days as a re-engagement carrot"), this
 * file becomes the one place to add the nuance. Until then, simple
 * is the win.
 */

import { hasActiveSubscription, isSubscriptionTerminated } from './subscription-utils'

/**
 * The minimum subscription shape we need. Imports of UserSubscription
 * pull a deeper type-graph that we don't want this lib to depend on,
 * so we accept a structural minimum.
 */
type SubscriptionForAccess = {
  status?: string | null
  plan?: string | null
} | null | undefined

/**
 * True when the user can perform write actions (create, edit, delete,
 * cost-bearing AI calls). False for terminated subscribers.
 *
 * Trialing, free-tier, or unknown states return true — only the
 * explicit terminated state blocks writes.
 */
export function canWrite(subscription: SubscriptionForAccess): boolean {
  if (hasActiveSubscription(subscription)) return true
  if (isSubscriptionTerminated(subscription)) return false
  // Trialing, free, unknown — allow writes. Trial-end transitions
  // status to 'expired' via the webhook, at which point
  // isSubscriptionTerminated catches it.
  return true
}

/**
 * True when the account is in read-only mode. Inverse of canWrite
 * for active/terminated states; both predicates exist for readability
 * at call sites — `canWrite()` for buttons, `isReadOnly()` for banners
 * and form-disabled treatments.
 */
export function isReadOnly(subscription: SubscriptionForAccess): boolean {
  return isSubscriptionTerminated(subscription)
}
