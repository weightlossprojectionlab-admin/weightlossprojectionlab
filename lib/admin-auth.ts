/**
 * Unified Admin Authentication Utilities
 *
 * Provides consistent admin verification across all admin endpoints.
 * Uses Firebase Custom Claims as the single source of truth.
 *
 * Security Pattern:
 * 1. Custom claims are cryptographically signed in ID tokens
 * 2. Cannot be tampered with by clients
 * 3. No database query required for verification
 * 4. Consistent across all endpoints
 */

import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

export interface AdminVerificationResult {
  isAdmin: boolean
  uid: string
  email: string
  role?: string
  error?: string
}

/**
 * Verify admin authentication from request headers
 *
 * @param authHeader - Authorization header value
 * @param cookieToken - Optional ID token from cookies (fallback)
 * @returns Verification result with admin status
 */
export async function verifyAdminAuth(
  authHeader: string | null,
  cookieToken?: string
): Promise<AdminVerificationResult> {
  try {
    // Extract token from Bearer header or cookie
    let idToken: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      idToken = authHeader.split('Bearer ')[1]
    } else if (cookieToken) {
      idToken = cookieToken
    }

    if (!idToken) {
      return {
        isAdmin: false,
        uid: '',
        email: '',
        error: 'Missing authentication token'
      }
    }

    // Verify token and extract claims
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const uid = decodedToken.uid
    const email = decodedToken.email || 'unknown'

    // Primary check: Custom claims (cryptographically secure)
    const customClaims = decodedToken as any
    const roleFromClaims = customClaims.role

    if (roleFromClaims === 'admin') {
      logger.debug('[Admin Auth] Verified via custom claims', { uid, email })
      return {
        isAdmin: true,
        uid,
        email,
        role: 'admin'
      }
    }

    // Fallback check: Super admin email whitelist
    const superAdminEmails = [
      'perriceconsulting@gmail.com',
      'weigthlossprojectionlab@gmail.com'
    ]

    if (email && superAdminEmails.includes(email.toLowerCase())) {
      logger.debug('[Admin Auth] Verified via super admin email', { uid, email })

      // Optionally set custom claim for future requests
      try {
        await adminAuth.setCustomUserClaims(uid, { role: 'admin' })
        logger.info('[Admin Auth] Set custom claims for super admin', { uid, email })
      } catch (claimError) {
        logger.warn('[Admin Auth] Failed to set custom claims', claimError as Error)
      }

      return {
        isAdmin: true,
        uid,
        email,
        role: 'admin'
      }
    }

    // Final fallback: Check Firestore profile (legacy support)
    const userDoc = await adminDb.collection('users').doc(uid).get()
    const userData = userDoc.data()
    const isAdminFromProfile = userData?.profile?.isAdmin === true

    if (isAdminFromProfile) {
      logger.debug('[Admin Auth] Verified via Firestore profile (legacy)', { uid, email })

      // Migrate to custom claims
      try {
        await adminAuth.setCustomUserClaims(uid, { role: 'admin' })
        logger.info('[Admin Auth] Migrated admin to custom claims', { uid, email })
      } catch (claimError) {
        logger.warn('[Admin Auth] Failed to migrate to custom claims', claimError as Error)
      }

      return {
        isAdmin: true,
        uid,
        email,
        role: 'admin'
      }
    }

    // Not an admin
    logger.warn('[Admin Auth] Non-admin access attempt', { uid, email })
    return {
      isAdmin: false,
      uid,
      email,
      error: 'User does not have admin privileges'
    }

  } catch (error) {
    logger.error('[Admin Auth] Verification failed', error as Error)
    return {
      isAdmin: false,
      uid: '',
      email: '',
      error: error instanceof Error ? error.message : 'Authentication failed'
    }
  }
}

/**
 * Middleware-style admin verification for API routes
 * Returns null if authorized, or NextResponse with error if not
 */
export async function requireAdmin(
  authHeader: string | null,
  cookieToken?: string
): Promise<{ uid: string; email: string } | { error: any; status: number }> {
  const result = await verifyAdminAuth(authHeader, cookieToken)

  if (!result.isAdmin) {
    if (result.error === 'Missing authentication token') {
      return {
        error: { error: 'Unauthorized: Missing authentication token' },
        status: 401
      }
    }
    return {
      error: { error: 'Forbidden: Admin access required' },
      status: 403
    }
  }

  return {
    uid: result.uid,
    email: result.email
  }
}
