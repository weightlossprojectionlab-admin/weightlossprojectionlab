'use client'

import { ShieldCheck, Lock, Sparkles } from 'lucide-react'
import { memo } from 'react'

export interface TrustBadgeProps {
  /**
   * Visual variant for different contexts
   * - default: Full-width horizontal badges with icons
   * - compact: Minimal inline badges
   * - stacked: Vertical stack for narrow spaces
   */
  variant?: 'default' | 'compact' | 'stacked'

  /**
   * Optional className for additional styling
   */
  className?: string

  /**
   * Show specific badges only (useful for contextual displays)
   * If not provided, shows all badges
   */
  badges?: Array<'hipaa' | 'no-third-party' | 'proprietary'>
}

/**
 * Trust Badge Component
 *
 * Emphasizes proprietary ML technology, HIPAA compliance, and privacy
 * to build trust and differentiate from third-party AI services.
 *
 * Use Cases:
 * - After meal photo upload (reassure about image privacy)
 * - Dashboard footer (establish platform credentials)
 * - Health reports display (emphasize HIPAA security)
 * - Landing pages (marketing trust signals)
 *
 * @example
 * // Default horizontal badges
 * <TrustBadge />
 *
 * @example
 * // Compact inline badges
 * <TrustBadge variant="compact" />
 *
 * @example
 * // Show only specific badges
 * <TrustBadge badges={['hipaa', 'proprietary']} />
 */
export const TrustBadge = memo(function TrustBadge({
  variant = 'default',
  className = '',
  badges
}: TrustBadgeProps) {
  // Badge configuration with icons and messaging
  const badgeConfig = {
    hipaa: {
      icon: ShieldCheck,
      label: 'HIPAA-Secure',
      description: 'Your health data is protected with clinical-grade security',
      color: 'text-green-600 dark:text-green-400'
    },
    'no-third-party': {
      icon: Lock,
      label: 'No Third-Party AI APIs',
      description: 'Your data never leaves our secure platform',
      color: 'text-blue-600 dark:text-blue-400'
    },
    proprietary: {
      icon: Sparkles,
      label: 'Proprietary ML',
      description: 'WPL-owned machine learning technology',
      color: 'text-purple-600 dark:text-purple-400'
    }
  }

  // Determine which badges to display
  const displayBadges = badges || ['hipaa', 'no-third-party', 'proprietary']

  // Render different variants
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        {displayBadges.map((badgeKey) => {
          const badge = badgeConfig[badgeKey as keyof typeof badgeConfig]
          const Icon = badge.icon
          return (
            <div
              key={badgeKey}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-full text-xs font-medium text-muted-foreground"
              title={badge.description}
            >
              <Icon className={`h-3 w-3 ${badge.color}`} />
              <span>{badge.label}</span>
            </div>
          )
        })}
      </div>
    )
  }

  if (variant === 'stacked') {
    return (
      <div className={`space-y-2 ${className}`}>
        {displayBadges.map((badgeKey) => {
          const badge = badgeConfig[badgeKey as keyof typeof badgeConfig]
          const Icon = badge.icon
          return (
            <div
              key={badgeKey}
              className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border border-border/50"
            >
              <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${badge.color}`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground">{badge.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{badge.description}</div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Default variant - horizontal with full details
  return (
    <div className={`flex items-center gap-4 flex-wrap ${className}`}>
      {displayBadges.map((badgeKey) => {
        const badge = badgeConfig[badgeKey as keyof typeof badgeConfig]
        const Icon = badge.icon
        return (
          <div
            key={badgeKey}
            className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border/50"
            title={badge.description}
          >
            <Icon className={`h-4 w-4 ${badge.color}`} />
            <span className="text-sm font-medium text-foreground">{badge.label}</span>
          </div>
        )
      })}
    </div>
  )
})

/**
 * Trust Message Component
 *
 * Displays a prominent trust message with visual emphasis.
 * Use for high-value conversion points like after meal photo upload.
 *
 * @example
 * <TrustMessage />
 */
export function TrustMessage({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-muted/20 border border-border/50 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1">Your Privacy is Protected</h3>
          <p className="text-sm text-muted-foreground mb-3">
            WPL uses proprietary machine learning technology built in-house. Your health data
            never leaves our HIPAA-secure platform and is never sent to third-party AI services.
          </p>
          <TrustBadge variant="compact" />
        </div>
      </div>
    </div>
  )
}
