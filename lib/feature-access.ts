/**
 * Feature-access predicate — single source of truth for "can this
 * user perform this action right now?"
 *
 * Why this exists: the platform's product strategy is to NEVER lock
 * users out of their data. A terminated subscription means "you can
 * SEE everything you built, but you can't ADD to it until you
 * reactivate." That's the moat — accumulated data + ML personalization
 * trained on it. Hard-blocking expired users discards the moat at
 * the conversion moment.
 *
 * The feature-access concept gates ACTION surfaces (Add, Save, Scan,
 * AI Vision call) without touching READ surfaces (lists, details,
 * history). Read paths have no gate — they're always full access.
 *
 * Three-state enum (not just full/locked):
 *   - 'full'      — active or trialing, can take the action
 *   - 'read_only' — can open the surface (e.g., a form pre-filled
 *                   with existing data) but Save is disabled. Useful
 *                   for editors where the user wants to verify what
 *                   they HAD before deciding to reactivate.
 *   - 'locked'    — clicking the action prompts reactivation; the
 *                   surface doesn't open.
 *
 * Default for terminated users is 'locked' for actions, 'read_only'
 * for editors-on-existing-data. Future: 'read_only' may degrade to
 * 'locked' for cost-bearing actions (AI Vision, OCR) that we don't
 * want to render even in preview mode.
 *
 * DRY contract: any surface that gates a create/edit/delete action
 * should call getFeatureAccess(subscription, FEATURE_KEY) instead of
 * inlining a status check. When access policy changes (e.g., we
 * decide to allow `log_meal` on terminated users for 30 days
 * post-cancellation), the change lives in this one map.
 *
 * See memory:project_pricing_deferred_features.md for the verification
 * protocol — make sure each FeatureKey here corresponds to a real
 * action surface, not an unwired library.
 */

import { hasActiveSubscription, isSubscriptionTerminated } from './subscription-utils'

export type FeatureAccess = 'full' | 'read_only' | 'locked'

/**
 * Canonical list of action features the access predicate knows about.
 * Add new features here when shipping a new gated action surface;
 * the compiler then forces you to add an entry to TERMINATED_ACCESS_MAP.
 *
 * Naming convention: snake_case_verb_object. Read like a sentence
 * fragment ("the user wants to <feature>"). Stable identifiers —
 * don't rename without a coordinated audit since these flow into
 * analytics + the deferred-features ledger.
 */
export type FeatureKey =
  // Patient / family management
  | 'add_patient'
  | 'edit_patient'
  | 'delete_patient'
  // Vitals + clinical
  | 'log_vital'
  | 'edit_vital'
  | 'add_medication'
  | 'edit_medication'
  | 'add_appointment'
  | 'edit_appointment'
  // Meals + recipes
  | 'log_meal'
  | 'edit_meal_log'
  | 'create_recipe'
  | 'edit_recipe'
  // Shopping + inventory
  | 'add_shopping_item'
  | 'edit_shopping_item'
  | 'delete_shopping_item'
  | 'scan_barcode'
  | 'adjust_inventory'
  // AI / Vision (cost-bearing)
  | 'ai_meal_recognition'
  | 'ai_receipt_ocr'
  | 'ai_medication_ocr'
  | 'ai_document_ocr'
  // Caregivers
  | 'invite_caregiver'
  | 'remove_caregiver'

/**
 * Per-feature access policy when subscription is terminated.
 *
 * Defaults are conservative:
 *   - All write/create actions → 'locked' (must reactivate)
 *   - Editors of EXISTING data → 'read_only' (let them see the form)
 *   - Cost-bearing AI calls → 'locked' (no free Gemini calls for
 *     terminated users, regardless of preview mode)
 */
const TERMINATED_ACCESS_MAP: Record<FeatureKey, FeatureAccess> = {
  // Patient/family — locked. Adding/removing family is a paid feature.
  add_patient: 'locked',
  edit_patient: 'read_only',
  delete_patient: 'locked',
  // Vitals — read_only on edit so they can see the form populated;
  // locked on logging new entries.
  log_vital: 'locked',
  edit_vital: 'read_only',
  // Medications + appointments — same shape as vitals.
  add_medication: 'locked',
  edit_medication: 'read_only',
  add_appointment: 'locked',
  edit_appointment: 'read_only',
  // Meals + recipes — locked on creation, read_only on edit.
  log_meal: 'locked',
  edit_meal_log: 'read_only',
  create_recipe: 'locked',
  edit_recipe: 'read_only',
  // Shopping + inventory — same.
  add_shopping_item: 'locked',
  edit_shopping_item: 'read_only',
  delete_shopping_item: 'locked',
  scan_barcode: 'locked',
  adjust_inventory: 'locked',
  // AI / Vision — fully locked. Each call costs us Gemini API budget;
  // we don't subsidize terminated users.
  ai_meal_recognition: 'locked',
  ai_receipt_ocr: 'locked',
  ai_medication_ocr: 'locked',
  ai_document_ocr: 'locked',
  // Caregivers — locked. Inviting/removing is a paid feature.
  invite_caregiver: 'locked',
  remove_caregiver: 'locked',
}

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
 * Resolve the feature-access state for the given user + feature.
 *
 * @param subscription - The user's subscription record.
 * @param feature - Which action they're trying to take.
 * @returns 'full' / 'read_only' / 'locked'.
 */
export function getFeatureAccess(
  subscription: SubscriptionForAccess,
  feature: FeatureKey,
): FeatureAccess {
  if (hasActiveSubscription(subscription)) return 'full'
  if (isSubscriptionTerminated(subscription)) {
    return TERMINATED_ACCESS_MAP[feature] ?? 'locked'
  }
  // Trialing, free tier without expiration, or unknown state →
  // default to full. Trial-end transition flips status to 'expired'
  // via the webhook, at which point isSubscriptionTerminated catches it.
  return 'full'
}

/**
 * Convenience predicate — "can the user take any write action?"
 * Useful for hiding entire action zones in the UI rather than
 * gating each button. Returns false when subscription is
 * terminated (every feature is at most read_only).
 */
export function canTakeAnyWriteAction(subscription: SubscriptionForAccess): boolean {
  return hasActiveSubscription(subscription) || !isSubscriptionTerminated(subscription)
}
