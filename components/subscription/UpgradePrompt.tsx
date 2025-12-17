/**
 * UpgradePrompt Component
 *
 * Inline upgrade prompt for locked features
 * Lighter-weight alternative to UpgradeModal
 */

'use client'

import { useState } from 'react'
import { SubscriptionPlan } from '@/types'
import { UpgradeModal } from './UpgradeModal'

interface UpgradePromptProps {
  /** Feature that requires upgrade */
  feature: string

  /** Display name for the feature */
  featureName?: string

  /** Icon to display */
  icon?: string

  /** Custom message */
  message?: string

  /** Suggested plan to upgrade to */
  suggestedPlan?: SubscriptionPlan

  /** Size variant */
  size?: 'sm' | 'md' | 'lg'

  /** Style variant */
  variant?: 'card' | 'banner' | 'inline'
}

export function UpgradePrompt({
  feature,
  featureName,
  icon = '🔒',
  message,
  suggestedPlan,
  size = 'md',
  variant = 'card'
}: UpgradePromptProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const defaultMessage = message || `Upgrade your plan to unlock ${featureName || feature}`

  // Size classes
  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4',
    lg: 'p-6 text-lg'
  }

  // Variant styles
  if (variant === 'banner') {
    return (
      <>
        <div className="bg-primary/10 border-l-4 border-primary rounded-r-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{icon}</div>
            <div>
              <p className="text-foreground font-medium">{featureName || feature}</p>
              <p className="text-muted-foreground text-sm">{defaultMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium whitespace-nowrap"
          >
            Upgrade Now
          </button>
        </div>
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          suggestedPlan={suggestedPlan}
        />
      </>
    )
  }

  if (variant === 'inline') {
    return (
      <>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm">
          <span>{icon}</span>
          <span className="text-muted-foreground">{defaultMessage}</span>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="text-primary hover:text-primary-hover font-medium underline"
          >
            Upgrade
          </button>
        </div>
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          suggestedPlan={suggestedPlan}
        />
      </>
    )
  }

  // Default: card variant
  return (
    <>
      <div className={`bg-card border border-border rounded-lg ${sizeClasses[size]} text-center`}>
        <div className="text-4xl mb-3">{icon}</div>
        <h3 className="font-bold text-foreground mb-2">{featureName || feature}</h3>
        <p className="text-muted-foreground mb-4">{defaultMessage}</p>
        <button
          onClick={() => setShowUpgradeModal(true)}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Upgrade to Unlock</span>
        </button>
      </div>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        suggestedPlan={suggestedPlan}
      />
    </>
  )
}
