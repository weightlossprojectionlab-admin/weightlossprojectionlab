'use client'

/**
 * Conditional Footer Wrapper
 *
 * Shows footer only for:
 * 1. Public (non-authenticated) users
 * 2. Users on trial (status: 'trialing' or plan: 'free')
 *
 * Hides footer for paid subscribers to reduce clutter in authenticated app
 */

import { useUser } from '@/hooks/useUser'
import { Footer } from './Footer'

export function ConditionalFooter() {
  const { user, loading, subscription } = useUser()

  // Always show during loading to prevent layout shift
  if (loading) {
    return <Footer />
  }

  // Show for non-authenticated users (public marketing pages)
  if (!user) {
    return <Footer />
  }

  // Show for users on trial
  if (subscription?.status === 'trialing' || subscription?.plan === 'free') {
    return <Footer />
  }

  // Hide for paid subscribers (active subscriptions)
  return null
}
