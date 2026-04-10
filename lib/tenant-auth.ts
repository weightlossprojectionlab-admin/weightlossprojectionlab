/**
 * Tenant (Franchise) Owner Authentication
 *
 * Mirrors lib/admin-auth.ts but checks the `tenantRole` custom claim
 * (set by the Stripe webhook on tenant activation) instead of `role: 'admin'`.
 *
 * Also accepts super-admins (role === 'admin') so back-office users can
 * impersonate tenant operations from the central admin tools.
 *
 * The custom claim shape is:
 *   { tenantId: string, tenantRole: 'franchise_admin' }
 * Set by app/api/webhooks/stripe/route.ts handleFranchiseSetupPaid().
 * Checked by firestore.rules helper isTenantAdmin(tenantId).
 */

import { adminAuth } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

export interface TenantAdminVerificationResult {
  ok: boolean
  uid: string
  email: string
  tenantId: string
  isSuperAdmin: boolean
  error?: string
}

/**
 * Verify that the request is from a franchise owner for a specific tenant.
 *
 * @param authHeader - Authorization header value (Bearer <idToken>)
 * @returns Verification result. ok === true means the caller is either the
 *          franchise admin for `tenantId`, or a super admin.
 */
export async function verifyTenantAdminAuth(
  authHeader: string | null
): Promise<TenantAdminVerificationResult> {
  const empty: TenantAdminVerificationResult = {
    ok: false,
    uid: '',
    email: '',
    tenantId: '',
    isSuperAdmin: false,
  }

  try {
    if (!authHeader?.startsWith('Bearer ')) {
      return { ...empty, error: 'Missing authentication token' }
    }
    const idToken = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(idToken)

    const uid = decoded.uid
    const email = decoded.email || 'unknown'
    const claims = decoded as any

    // Super admin override — back-office can edit any tenant
    if (claims.role === 'admin') {
      return {
        ok: true,
        uid,
        email,
        tenantId: '',
        isSuperAdmin: true,
      }
    }

    // Franchise admin path
    if (claims.tenantRole === 'franchise_admin' && typeof claims.tenantId === 'string' && claims.tenantId.length > 0) {
      return {
        ok: true,
        uid,
        email,
        tenantId: claims.tenantId,
        isSuperAdmin: false,
      }
    }

    logger.warn('[Tenant Auth] Non-franchise-admin access attempt', { uid, email })
    return { ...empty, uid, email, error: 'User is not a franchise administrator' }
  } catch (err) {
    logger.error('[Tenant Auth] Verification failed', err as Error)
    return { ...empty, error: err instanceof Error ? err.message : 'Authentication failed' }
  }
}

export interface TenantStaffOrAdminVerificationResult extends TenantAdminVerificationResult {
  /** True if the caller is the franchise admin (owner). False if they're staff. */
  isFranchiseAdmin: boolean
  /** True if the caller is staff (not the admin). */
  isFranchiseStaff: boolean
}

/**
 * Verify that the request is from EITHER a franchise admin OR franchise staff
 * for a specific tenant. Used by endpoints that staff are allowed to call —
 * notably the managed-families attach/revoke endpoints, where staff doing the
 * day-to-day work need write access without being able to edit branding or
 * invite more staff.
 *
 * Branding edit and staff invitation endpoints intentionally still call
 * verifyTenantAdminAuth (admin-only) — this helper is the wider net.
 */
export async function verifyTenantStaffOrAdminAuth(
  authHeader: string | null
): Promise<TenantStaffOrAdminVerificationResult> {
  const empty: TenantStaffOrAdminVerificationResult = {
    ok: false,
    uid: '',
    email: '',
    tenantId: '',
    isSuperAdmin: false,
    isFranchiseAdmin: false,
    isFranchiseStaff: false,
  }

  try {
    if (!authHeader?.startsWith('Bearer ')) {
      return { ...empty, error: 'Missing authentication token' }
    }
    const idToken = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(idToken)

    const uid = decoded.uid
    const email = decoded.email || 'unknown'
    const claims = decoded as any

    if (claims.role === 'admin') {
      return {
        ok: true,
        uid,
        email,
        tenantId: '',
        isSuperAdmin: true,
        isFranchiseAdmin: false,
        isFranchiseStaff: false,
      }
    }

    const hasTenantId = typeof claims.tenantId === 'string' && claims.tenantId.length > 0
    if (hasTenantId && claims.tenantRole === 'franchise_admin') {
      return {
        ok: true,
        uid,
        email,
        tenantId: claims.tenantId,
        isSuperAdmin: false,
        isFranchiseAdmin: true,
        isFranchiseStaff: false,
      }
    }
    if (hasTenantId && claims.tenantRole === 'franchise_staff') {
      return {
        ok: true,
        uid,
        email,
        tenantId: claims.tenantId,
        isSuperAdmin: false,
        isFranchiseAdmin: false,
        isFranchiseStaff: true,
      }
    }

    logger.warn('[Tenant Auth] Non-franchise access attempt (staff-or-admin gate)', { uid, email })
    return { ...empty, uid, email, error: 'User is not part of a franchise' }
  } catch (err) {
    logger.error('[Tenant Auth] Staff-or-admin verification failed', err as Error)
    return { ...empty, error: err instanceof Error ? err.message : 'Authentication failed' }
  }
}
