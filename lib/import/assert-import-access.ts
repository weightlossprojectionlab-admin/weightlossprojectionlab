/**
 * Server-side authorization for the spreadsheet-import endpoints.
 *
 * Semantic intent: import is a permission, not a route. The
 * questions a write needs to answer:
 *
 *   1. Who is calling?                    → verifyAuthToken
 *   2. Whose household are they importing → resolveTargetHousehold
 *      INTO?
 *   3. Are they allowed to import there?  → checkImportPermission
 *   4. Is that household's subscription   → assertOwnerCanWrite
 *      currently in good standing?
 *
 * Account holders implicitly satisfy #3 (they own the household).
 * Co-admins satisfy #3 because the FULL_ACCESS preset includes
 * importPatients=true. Caregivers satisfy #3 only when the owner
 * has explicitly granted them the permission. Franchise admins
 * (tenantRole claim) satisfy #3 by virtue of their role —
 * white-label tier accounts treat the franchise admin as the
 * effective account holder for any tenant household they manage.
 *
 * Read-only households (paused subscriptions) fail #4 the same
 * way every other write does — via assertOwnerCanWrite, which
 * trickles the owner's subscription state down to every actor.
 *
 * Returns either { callerUserId, ownerUserId } — where
 * ownerUserId is the household whose /users/{ownerUserId}/patients
 * subcollection the import will write into — or a Response the
 * route can return as-is.
 */

import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { assertOwnerCanWrite, loadOwnerSubscription } from '@/lib/owner-subscription-guard'
import { hasAdminPrivileges } from '@/lib/family-roles'
import type { FamilyRole } from '@/types/medical'

export interface ImportAccessResult {
  callerUserId: string
  /** Household into which the import will write. May equal
   *  callerUserId (account-holder import) or differ (caregiver
   *  importing into the owner's household via granted
   *  permission). */
  ownerUserId: string
  /** Where the caller's authority comes from. Useful for logging /
   *  audit trails. */
  via: 'self' | 'co_admin_or_caregiver_grant' | 'franchise_admin'
}

const unauthorized = () =>
  new Response(
    JSON.stringify({ success: false, error: 'Unauthorized' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  )

const forbidden = (message: string, code?: string) =>
  new Response(
    JSON.stringify({ success: false, error: 'Forbidden', message, ...(code ? { code } : {}) }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  )

/**
 * The import feature is only useful on plans that hold more than
 * one family member. A Single User Plan (cap = 1) gets nothing
 * out of bulk import, and surfacing the wizard on those plans
 * just creates friction. Family / Family Premium / Practitioner /
 * Franchise plans all allow >1 members and pass.
 *
 * Read the owner's subscription, fall through to the same
 * `subscription.maxPatients ?? subscription.maxSeats ?? 1`
 * resolution the live patient limit uses (lib/feature-gates.ts).
 * If <= 1, the household isn't on a plan that supports the
 * feature.
 *
 * Franchise admins bypass this — their tenant households are
 * routed differently and the white-label tier is multi-member by
 * definition.
 */
/** Same canonical lookup as lib/feature-gates.ts. Kept inline
 *  here to avoid pulling the client-side feature-gates module
 *  into a server-only path (loadOwnerSubscription is admin-SDK
 *  based; feature-gates expects a client-shaped User). Update
 *  both maps if a plan's cap changes. */
const PLAN_PATIENT_LIMITS: Record<string, number> = {
  free: 1,
  single: 1,
  single_plus: 1,
  family_basic: 5,
  family_plus: 10,
  family_premium: 20,
}

async function assertPlanSupportsImport(ownerUserId: string): Promise<Response | null> {
  const sub = await loadOwnerSubscription(ownerUserId)
  // Canonical plan-name lookup first; fall back to stored field
  // for unrecognized plans (e.g., a future Practitioner tier).
  const canonicalMax = sub?.plan ? PLAN_PATIENT_LIMITS[sub.plan] : undefined
  const maxPatients = canonicalMax ?? sub?.maxPatients ?? sub?.maxSeats ?? 1
  if (maxPatients > 1) return null

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Plan does not support import',
      code: 'PLAN_DOES_NOT_SUPPORT_IMPORT',
      message:
        'Bulk import is available on Family Plan and up. Upgrade your plan to import multiple family members at once.',
    }),
    { status: 403, headers: { 'Content-Type': 'application/json' } },
  )
}

/**
 * Verify the caller's auth token and resolve their import context.
 *
 * @param targetOwnerUserId - Optional explicit target. If a caregiver
 *   is a member of multiple households, the UI should send the one
 *   they want to import into. Omitted for the common case (account
 *   holder importing their own data, or a single-household
 *   caregiver).
 */
export async function assertImportAccess(
  request: Request,
  targetOwnerUserId?: string,
): Promise<ImportAccessResult | Response> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized()
  }

  let decoded: import('firebase-admin/auth').DecodedIdToken
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.substring(7))
  } catch (error) {
    logger.warn('[ImportAccess] Token verification failed', { error: (error as Error).message })
    return unauthorized()
  }

  const callerUserId = decoded.uid
  const tenantRole = (decoded as Record<string, unknown>).tenantRole

  // Franchise admins (white-label tier) are effective account
  // holders for the tenant household they manage. The franchise
  // routing layer guarantees they're operating in the right tenant
  // context; we just need a target household uid here. If they
  // didn't pass one explicitly, fall back to their own uid (they
  // can also import into their personal household).
  if (tenantRole === 'franchise_admin') {
    const ownerUserId = targetOwnerUserId || callerUserId
    const denied = await assertOwnerCanWrite(ownerUserId)
    if (denied) return denied
    // Franchise admins bypass the plan-tier check — white-label
    // tier is multi-member by definition.
    return { callerUserId, ownerUserId, via: 'franchise_admin' }
  }

  // Read the caller's user doc to find out whether they're an
  // account holder (own household) or a caregiver (member of
  // someone else's household).
  let callerData: FirebaseFirestore.DocumentData = {}
  try {
    const snap = await adminDb.collection('users').doc(callerUserId).get()
    callerData = snap.data() ?? {}
  } catch (error) {
    logger.error('[ImportAccess] Failed to read caller user doc', error as Error, { callerUserId })
    return unauthorized()
  }

  const caregiverOf: Array<{ accountOwnerId?: string }> = Array.isArray(callerData.caregiverOf)
    ? callerData.caregiverOf
    : []

  // Resolve the household uid the caller is importing into.
  let ownerUserId = targetOwnerUserId
  if (!ownerUserId) {
    if (callerData.subscription) {
      // Caller has their own subscription → account holder
      // importing into their own household.
      ownerUserId = callerUserId
    } else if (caregiverOf.length === 1) {
      // Single-household caregiver — unambiguous target.
      ownerUserId = caregiverOf[0].accountOwnerId
    } else if (caregiverOf.length > 1) {
      // Multi-household caregiver — UI must specify which.
      return forbidden(
        'You are a caregiver in multiple households. Specify which household to import into.',
        'IMPORT_TARGET_AMBIGUOUS',
      )
    } else {
      // No subscription, no caregiverOf — caller has no household
      // they can import into.
      return forbidden(
        'No household found to import into. Sign up first or ask an account owner for caregiver access.',
        'IMPORT_NO_HOUSEHOLD',
      )
    }
  }

  if (!ownerUserId) {
    return forbidden('Could not resolve a household for this import.', 'IMPORT_NO_HOUSEHOLD')
  }

  // Authority check — when caller is the owner, no permission
  // lookup needed. Otherwise verify the caller is an accepted
  // member of that household with importPatients=true.
  if (ownerUserId === callerUserId) {
    const denied = await assertOwnerCanWrite(ownerUserId)
    if (denied) return denied
    const planTooSmall = await assertPlanSupportsImport(ownerUserId)
    if (planTooSmall) return planTooSmall
    return { callerUserId, ownerUserId, via: 'self' }
  }

  // Caregiver path — read users/{ownerUserId}/familyMembers, find
  // the caller, check the importPatients permission. Co-admins and
  // account-owner-equivalents pass via hasAdminPrivileges (their
  // role grants importPatients implicitly). Caregivers / viewers
  // need the explicit permission flag set to true.
  let memberData: FirebaseFirestore.DocumentData | null = null
  try {
    const snap = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('familyMembers')
      .where('userId', '==', callerUserId)
      .where('status', '==', 'accepted')
      .limit(1)
      .get()
    if (!snap.empty) memberData = snap.docs[0].data()
  } catch (error) {
    logger.error('[ImportAccess] Family member lookup failed', error as Error, {
      callerUserId,
      ownerUserId,
    })
    return forbidden('Could not verify household membership.', 'IMPORT_MEMBER_LOOKUP_FAILED')
  }

  if (!memberData) {
    return forbidden(
      "You don't have access to this household.",
      'IMPORT_NOT_A_MEMBER',
    )
  }

  const familyRole: FamilyRole = (memberData.familyRole as FamilyRole) || 'caregiver'
  const grantedPermission = memberData.permissions?.importPatients === true
  const allowed = hasAdminPrivileges(familyRole) || grantedPermission

  if (!allowed) {
    return forbidden(
      "Your role doesn't include the import permission. Ask the account owner to grant Import Family Members from Spreadsheet on your caregiver permissions.",
      'IMPORT_PERMISSION_REQUIRED',
    )
  }

  const denied = await assertOwnerCanWrite(ownerUserId)
  if (denied) return denied

  const planTooSmall = await assertPlanSupportsImport(ownerUserId)
  if (planTooSmall) return planTooSmall

  return { callerUserId, ownerUserId, via: 'co_admin_or_caregiver_grant' }
}
