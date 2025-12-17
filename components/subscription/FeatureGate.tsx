/**
 * FeatureGate Component
 *
 * Wrapper component that conditionally renders children based on feature access
 * Shows upgrade prompt if user doesn't have access
 */

'use client'

import { ReactNode, useState } from 'react'
import { useFeatureGate } from '@/hooks/useFeatureGate'
import { FeatureLockedState } from './FeatureLockedState'
import { UpgradeModal } from './UpgradeModal'
import { SubscriptionPlan } from '@/types'

interface FeatureGateProps {
  /** Feature identifier to check access for */
  feature: string

  /** Content to show when user has access */
  children: ReactNode

  /** Optional fallback content when locked (defaults to FeatureLockedState) */
  fallback?: ReactNode

  /** Optional custom feature display name for locked state */
  featureName?: string

  /** If true, shows a subtle badge instead of blocking content */
  showBadgeOnly?: boolean
}

export function FeatureGate({
  feature,
  children,
  fallback,
  featureName,
  showBadgeOnly = false
}: FeatureGateProps) {
  const { canAccess, loading, requiresUpgrade, suggestedPlan } = useFeatureGate(feature)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Show loading state
  if (loading) {
    return (
      <div className="animate-pulse bg-muted rounded-lg h-32 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // User has access - show content
  if (canAccess) {
    return <>{children}</>
  }

  // Badge-only mode - show content with upgrade badge
  if (showBadgeOnly) {
    return (
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Upgrade to unlock
          </button>
        </div>
        <div className="opacity-50 pointer-events-none">{children}</div>
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          suggestedPlan={suggestedPlan}
        />
      </div>
    )
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>
  }

  // Default fallback - show locked state
  return (
    <>
      <FeatureLockedState
        feature={featureName || feature}
        requiredUpgrade={requiresUpgrade}
        onUpgrade={() => setShowUpgradeModal(true)}
      />
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        suggestedPlan={suggestedPlan}
      />
    </>
  )
}
