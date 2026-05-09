/**
 * FeatureLockedState Component
 *
 * Shows a locked feature UI with upgrade prompt
 */

'use client'

interface FeatureLockedStateProps {
  feature: string
  requiredUpgrade: {
    type: 'plan' | 'addon' | 'none'
    plan?: 'single' | 'family'
    addon?: string
  }
  onUpgrade?: () => void
}

export function FeatureLockedState({ feature, requiredUpgrade, onUpgrade }: FeatureLockedStateProps) {
  // Action label names the actual upgrade rather than the generic
  // "Unlock Feature". The CTA verb varies because the action does:
  // a Single User upgrading to Family hears "Upgrade to Family
  // Plan"; a Family user adding a feature add-on hears "Add Family
  // Features". Vague unlocking copy hides the cost and the change
  // — semantic intent is to be explicit about both.
  const getUpgradeMessage = () => {
    if (requiredUpgrade.type === 'plan') {
      return `${feature} is included on the ${requiredUpgrade.plan === 'family' ? 'Family Plan' : 'Single User Plan'}.`
    }
    if (requiredUpgrade.type === 'addon') {
      return `${feature} is part of the Family Features add-on.`
    }
    return `${feature} requires a different plan than yours.`
  }

  const getUpgradeButtonLabel = () => {
    if (requiredUpgrade.type === 'plan') {
      return `Upgrade to ${requiredUpgrade.plan === 'family' ? 'Family Plan' : 'Single User Plan'}`
    }
    if (requiredUpgrade.type === 'addon') {
      return 'Add Family Features'
    }
    return 'Upgrade plan'
  }

  const getUpgradeIcon = () => {
    if (requiredUpgrade.type === 'plan' && requiredUpgrade.plan === 'family') {
      return '👨‍👩‍👧‍👦'
    }
    if (requiredUpgrade.type === 'addon') {
      return '✨'
    }
    return '🔒'
  }

  return (
    <div className="relative bg-card rounded-lg shadow-sm border border-border p-6 overflow-hidden">
      {/* Blur overlay */}
      <div className="absolute inset-0 backdrop-blur-sm bg-background/80 z-10 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">{getUpgradeIcon()}</div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {feature}
          </h3>
          <p className="text-muted-foreground mb-6">
            {getUpgradeMessage()}
          </p>
          <button
            onClick={onUpgrade}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium inline-flex items-center gap-2"
          >
            <span>{getUpgradeButtonLabel()}</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Blurred preview content */}
      <div className="blur-md select-none pointer-events-none">
        <div className="h-64 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
          <div className="text-4xl opacity-30">📊</div>
        </div>
      </div>
    </div>
  )
}
