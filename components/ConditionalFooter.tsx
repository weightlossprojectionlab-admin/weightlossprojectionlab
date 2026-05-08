'use client'

/**
 * Conditional Footer Wrapper
 *
 * Shows footer only for:
 * 1. Public (non-authenticated) users
 * 2. Users on trial (status: 'trialing' or plan: 'free')
 *
 * Hides footer for paid subscribers to reduce clutter in authenticated app.
 *
 * Per-route override: also hidden on focused task surfaces where the footer
 * would compete with the in-task UI. /shopping (list build) and
 * /shopping/active (in-store) are first such surfaces — both are
 * task-mode screens where the user shouldn't be invited out via "Privacy
 * Policy" links mid-trip.
 */

import { usePathname } from 'next/navigation'
import { useUser } from '@/hooks/useUser'
import { Footer } from './Footer'

// Routes that suppress the footer regardless of subscription state.
// Match by prefix so nested routes (e.g. /shopping/active, /inventory/cleanup)
// inherit. Task-mode surfaces only — anywhere the user is in the middle of
// doing something where Privacy Policy links would be a pull-out distraction.
const FOOTER_HIDDEN_PREFIXES = ['/shopping', '/inventory']

function isFooterHiddenRoute(pathname: string | null): boolean {
  if (!pathname) return false
  return FOOTER_HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function ConditionalFooter() {
  const { user, loading, subscription } = useUser()
  const pathname = usePathname()

  // Per-route hide takes precedence over all other rules. Shopping
  // surfaces are task-focused; no footer regardless of auth state.
  if (isFooterHiddenRoute(pathname)) {
    return null
  }

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
