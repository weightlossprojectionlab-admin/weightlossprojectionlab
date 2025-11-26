'use client'

import { useEffect } from 'react'
import {
  getHealthAppName,
  getHealthAppIcon,
  getSetupInstructions,
  getHealthSyncBenefits,
  openHealthApp,
  type HealthApp
} from '@/lib/health-sync-utils'

export interface HealthConnectModalProps {
  isOpen: boolean
  onClose: () => void
  healthApp: HealthApp
  onEnableSync: () => void
}

/**
 * Modal with setup instructions for connecting health app
 */
export function HealthConnectModal({
  isOpen,
  onClose,
  healthApp,
  onEnableSync
}: HealthConnectModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const appName = getHealthAppName(healthApp)
  const appIcon = getHealthAppIcon(healthApp)
  const instructions = getSetupInstructions(healthApp)
  const benefits = getHealthSyncBenefits()

  const handleOpenHealthApp = () => {
    openHealthApp(healthApp)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{appIcon}</span>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  Connect {appName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sync your steps automatically
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Benefits */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">
              ✨ Benefits
            </h4>
            <ul className="space-y-2">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-success mt-0.5">✓</span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">
              📋 Setup Instructions
            </h4>
            <ol className="space-y-3">
              {instructions.map((instruction, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-sm text-muted-foreground pt-0.5">
                    {instruction}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Important Note */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex gap-3">
              <span className="text-amber-600 text-xl flex-shrink-0">⚠️</span>
              <div>
                <h5 className="font-semibold text-amber-900 dark:text-amber-200 text-sm mb-1">
                  PWA Limitation
                </h5>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  As a web app (PWA), we use your device's motion sensors for automatic step tracking.
                  Full native {appName} integration requires additional permissions that may not be available in all browsers.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleOpenHealthApp}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium flex items-center justify-center gap-2"
            >
              <span>Open {appName}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>

            <button
              onClick={() => {
                onEnableSync()
                onClose()
              }}
              className="w-full px-4 py-3 bg-success text-white rounded-lg hover:bg-success-hover transition-colors font-medium"
            >
              I've Enabled Permissions - Activate Sync
            </button>

            <button
              onClick={onClose}
              className="w-full px-4 py-3 border border-border text-foreground rounded-lg hover:bg-background transition-colors font-medium"
            >
              Maybe Later
            </button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-center text-muted-foreground dark:text-muted-foreground">
            Need help? Contact support or check our documentation
          </p>
        </div>
      </div>
    </div>
  )
}
