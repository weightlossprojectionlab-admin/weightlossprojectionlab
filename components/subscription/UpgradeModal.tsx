/**
 * UpgradeModal Component
 *
 * Shows subscription upgrade options with plan comparison
 */

'use client'

import { UserSubscription } from '@/types'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan?: UserSubscription['plan']
  suggestedUpgrade?: 'plan' | 'addon' | 'both'
}

export function UpgradeModal({ isOpen, onClose, currentPlan = 'free', suggestedUpgrade = 'plan' }: UpgradeModalProps) {
  if (!isOpen) return null

  const isDevelopment = process.env.NODE_ENV === 'development'

  const plans = [
    {
      id: 'single',
      name: 'Single User',
      icon: '👤',
      price: '$9.99',
      period: '/month',
      features: [
        '1 patient profile (yourself)',
        'Basic health tracking',
        'Meal logging & recipes',
        'Weight & step tracking',
        'Basic AI coaching'
      ],
      highlighted: false
    },
    {
      id: 'single-plus',
      name: 'Single + Features',
      icon: '✨',
      price: '$14.99',
      period: '/month',
      features: [
        'Everything in Single User',
        'Advanced analytics & insights',
        'Family data sharing',
        'Enhanced AI coaching',
        'Health reports & exports',
        'Priority support'
      ],
      highlighted: suggestedUpgrade === 'addon'
    },
    {
      id: 'family',
      name: 'Family Plan',
      icon: '👨‍👩‍👧‍👦',
      price: '$19.99',
      period: '/month',
      features: [
        'Up to 10 family members',
        'Track humans & pets',
        'All Basic features',
        'Family health dashboard',
        'Shared meal planning'
      ],
      highlighted: suggestedUpgrade === 'plan'
    },
    {
      id: 'family-plus',
      name: 'Family + Features',
      icon: '🌟',
      price: '$24.99',
      period: '/month',
      features: [
        'Everything in Family Plan',
        'All premium features',
        'Advanced analytics for all',
        'Priority support',
        'Early access to new features'
      ],
      highlighted: suggestedUpgrade === 'both',
      badge: 'Best Value'
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Upgrade Your Plan</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Choose the plan that's right for you
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Plans Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-lg border-2 p-6 relative ${
                  plan.highlighted
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-bold">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{plan.icon}</div>
                  <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-primary text-white hover:bg-primary-hover'
                      : 'bg-muted text-foreground hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    // Close modal and show a toast notification
                    onClose()
                    // TODO: Implement actual payment/upgrade flow
                    if (typeof window !== 'undefined') {
                      const toast = (window as any).toast
                      if (toast) {
                        toast.success(`Upgrade to ${plan.name} coming soon!`)
                      }
                    }
                  }}
                >
                  {currentPlan === plan.id ? 'Current Plan' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="mt-6 space-y-3">
            {isDevelopment && (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                  🔧 Development Mode
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  To test plan changes, use the <strong>Dev Tools</strong> simulator in the bottom-right corner.
                  This modal is a placeholder for the real payment flow.
                </p>
              </div>
            )}
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">
                💡 All plans include a 14-day free trial. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
