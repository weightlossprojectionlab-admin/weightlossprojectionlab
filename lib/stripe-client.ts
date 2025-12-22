/**
 * Stripe Client Operations
 *
 * Client-side helper functions for Stripe integration
 */

import { getAuth } from 'firebase/auth'
import { logger } from '@/lib/logger'
import { getCSRFToken } from '@/lib/csrf'

/**
 * Create a Stripe checkout session and redirect to checkout
 *
 * @param priceId - Stripe price ID to subscribe to
 * @param successUrl - Optional success redirect URL
 * @param cancelUrl - Optional cancel redirect URL
 * @returns Promise that resolves when checkout is initiated
 */
export async function createCheckoutSession(
  priceId: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<void> {
  try {
    const auth = getAuth()
    const user = auth.currentUser

    if (!user) {
      throw new Error('User must be authenticated to create checkout session')
    }

    const token = await user.getIdToken()

    logger.info('[Stripe Client] Creating checkout session', { priceId })

    const csrfToken = getCSRFToken()
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        priceId,
        successUrl,
        cancelUrl
      })
    })

    const data = await response.json()

    if (!data.success) {
      // Check if user already has an active subscription
      if (data.code === 'EXISTING_SUBSCRIPTION') {
        const shouldOpenPortal = confirm(
          `${data.error}\n\nWould you like to open the Customer Portal to manage your subscription?`
        )

        if (shouldOpenPortal) {
          await createPortalSession(window.location.href)
        }
        return
      }

      throw new Error(data.error || 'Failed to create checkout session')
    }

    // Redirect to Stripe Checkout
    if (data.url) {
      window.location.href = data.url
    } else {
      throw new Error('No checkout URL returned')
    }
  } catch (error) {
    logger.error('[Stripe Client] Error creating checkout session', error as Error)
    throw error
  }
}

/**
 * Create a Stripe customer portal session and redirect to portal
 *
 * @param returnUrl - Optional return URL after portal session
 * @returns Promise that resolves when portal is initiated
 */
export async function createPortalSession(returnUrl?: string): Promise<void> {
  try {
    const auth = getAuth()
    const user = auth.currentUser

    if (!user) {
      throw new Error('User must be authenticated to access portal')
    }

    const token = await user.getIdToken()

    logger.info('[Stripe Client] Creating portal session')

    const csrfToken = getCSRFToken()
    const response = await fetch('/api/stripe/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        returnUrl
      })
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Failed to create portal session')
    }

    // Redirect to Stripe Customer Portal
    if (data.url) {
      window.location.href = data.url
    } else {
      throw new Error('No portal URL returned')
    }
  } catch (error) {
    logger.error('[Stripe Client] Error creating portal session', error as Error)
    throw error
  }
}

/**
 * Get Stripe price ID for a plan
 *
 * @param plan - Plan name ('solo', 'family', 'pro')
 * @returns Stripe price ID
 */
export function getPriceIdForPlan(plan: 'solo' | 'family' | 'pro'): string {
  const priceIds = {
    solo: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO || '',
    family: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY || '',
    pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || ''
  }

  return priceIds[plan]
}
