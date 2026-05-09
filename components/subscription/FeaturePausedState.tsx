/**
 * FeaturePausedState — read-only sibling of FeatureLockedState.
 *
 * Rendered by FeatureGate when the user's subscription is paused
 * (terminated). The plan-tier "Upgrade to unlock" prompt doesn't
 * apply in that state — the action behind it (upgrading) requires
 * an active subscription to begin with. The persistent
 * SubscriptionExpiredBanner already carries the relevant CTA at
 * the top of the page (Reactivate for owners, "ask the account
 * owner" for family members), so this surface stays minimal:
 * acknowledge the feature, name the state, point upward.
 */

'use client'

import { LockClosedIcon } from '@heroicons/react/24/solid'

interface FeaturePausedStateProps {
  /** Display name of the gated feature, e.g. "Family Member Management". */
  feature: string
}

export function FeaturePausedState({ feature }: FeaturePausedStateProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-8">
      <div className="text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
          <LockClosedIcon className="w-8 h-8 text-warning" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          Paused — {feature}
        </h3>
        <p className="text-muted-foreground">
          Your subscription is read-only. Adding or editing here is
          paused until the subscription is reactivated. See the
          banner above for next steps.
        </p>
      </div>
    </div>
  )
}
