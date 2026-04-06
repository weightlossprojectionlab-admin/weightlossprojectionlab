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
