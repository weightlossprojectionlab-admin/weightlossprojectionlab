'use client'

/**
 * SubscriptionExpiredBanner — persistent top-of-page banner that
 * appears when the user's subscription is terminated. The FOMO
 * surface that does the conversion work in-context, not via a hard
 * redirect to /pricing.
 *
 * Strategy: terminated users keep read-only access to all their
 * accumulated data (meals, vitals, recipes, family members, photos).
 * What they lose is the WRITE surface — adding new entries, editing,
 * AI calls. The banner makes that loss visible at the top of every
 * page so the user feels the friction continuously, with a one-tap
 * Reactivate path right there.
 *
 * Visibility: renders only when isSubscriptionTerminated(subscription).
 * Renders nothing on /pricing (where the user is already dealing with
 * subscription) and /profile (where the plan-detail modal already
 * surfaces the path). Path-based suppression keeps the banner from
 * stacking on top of better-targeted prompts.
 *
 * v1 copy is generic. Future v2 (when the aggregate-counts query
 * lands) can flip to data-driven: "47 meals, 3 family members
 * preserved. Reactivate to keep building." — see
 * memory:project_pricing_deferred_features.md for the data-FOMO
 * approach.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useSubscription } from '@/hooks/useSubscription'
import { isSubscriptionTerminated } from '@/lib/subscription-utils'

/**
 * Paths where the banner should NOT render.
 *   - /pricing: the user is already in the conversion surface; banner
 *     is redundant + visually noisy on a page that already has plan
 *     CTAs everywhere.
 *   - /profile: the plan-detail modal handles reactivation; banner
 *     would compete for attention.
 *   - /auth: signed-out / signed-in transition surface.
 */
const SUPPRESSED_PATHS = ['/pricing', '/profile', '/auth']

export function SubscriptionExpiredBanner() {
  const { subscription } = useSubscription()
  const pathname = usePathname()

  if (!isSubscriptionTerminated(subscription)) return null

  const isSuppressedPath = SUPPRESSED_PATHS.some(
    (p) => pathname === p || pathname?.startsWith(p + '/'),
  )
  if (isSuppressedPath) return null

  return (
    <div className="bg-warning/10 border-b border-warning/30 px-4 py-2.5 text-sm text-warning-foreground">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <ExclamationTriangleIcon className="w-5 h-5 text-warning flex-shrink-0" />
          <p className="text-foreground/90 leading-tight">
            <strong className="text-foreground">Your subscription has ended.</strong>{' '}
            <span className="text-foreground/75">
              You can still see your data, but adding new entries is paused.
            </span>
          </p>
        </div>
        <Link
          href="/pricing"
          className="px-3 py-1.5 min-h-[36px] inline-flex items-center justify-center bg-primary text-white rounded-lg text-xs font-semibold active:bg-primary-hover hover:bg-primary-hover transition-colors flex-shrink-0"
        >
          Reactivate
        </Link>
      </div>
    </div>
  )
}
