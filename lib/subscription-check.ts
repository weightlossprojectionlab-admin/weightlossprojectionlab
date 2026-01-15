/**
 * Server-side subscription checking for middleware
 *
 * This runs at the edge (Vercel Edge Runtime) to block expired users
 * BEFORE any client-side code executes.
 */

import { adminAuth, adminDb } from './firebase-admin'
import { logger } from './logger'

interface SubscriptionCheckResult {
  isAllowed: boolean
  redirectTo?: string
  reason?: string
}

/**
 * Check if user's subscription allows access to protected pages
 *
 * @param authToken - Firebase auth token from __session cookie
 * @returns Object indicating if user is allowed and where to redirect if not
 */
export async function checkSubscriptionStatus(authToken: string): Promise<SubscriptionCheckResult> {
  try {
    // Verify the auth token
    const decodedToken = await adminAuth.verifyIdToken(authToken)
    const uid = decodedToken.uid

    // Get user's subscription from Firestore
    const userDoc = await adminDb.collection('users').doc(uid).get()

    if (!userDoc.exists) {
      logger.warn('[SubscriptionCheck] User document not found', { uid })
      return {
        isAllowed: false,
        redirectTo: '/auth',
        reason: 'User document not found'
      }
    }

    const userData = userDoc.data()
    const subscription = userData?.subscription

    // Check if subscription is expired or canceled
    if (subscription && (subscription.status === 'expired' || subscription.status === 'canceled')) {
      logger.warn('[SubscriptionCheck] Blocking expired/canceled user', {
        uid,
        status: subscription.status
      })

      return {
        isAllowed: false,
        redirectTo: '/pricing',
        reason: `Subscription ${subscription.status}`
      }
    }

    // User has active or trialing subscription
    return {
      isAllowed: true,
      reason: `Subscription ${subscription?.status || 'active'}`
    }

  } catch (error: any) {
    logger.error('[SubscriptionCheck] Error verifying token or fetching subscription', error)

    // If token is invalid, redirect to auth
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return {
        isAllowed: false,
        redirectTo: '/auth',
        reason: 'Invalid or expired auth token'
      }
    }

    // For other errors, allow through (client-side will handle)
    return {
      isAllowed: true,
      reason: 'Error checking subscription - allowing through'
    }
  }
}
