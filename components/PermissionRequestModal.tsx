'use client'

import { useState } from 'react'
import { getSettingsInstructions, isMobile, isIOS, isAndroid } from '@/lib/permissions'
import { logger } from '@/lib/logger'

interface PermissionRequestModalProps {
  type: 'camera' | 'biometric'
  isOpen: boolean
  onClose: () => void
  onRequest: () => Promise<void>
  onUseAlternative?: () => void
  alternativeLabel?: string
}

export default function PermissionRequestModal({
  type,
  isOpen,
  onClose,
  onRequest,
  onUseAlternative,
  alternativeLabel = 'Use alternative method'
}: PermissionRequestModalProps) {
  const [isRequesting, setIsRequesting] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  if (!isOpen) return null

  const typeName = type === 'camera' ? 'Camera' : 'Biometric Authentication'
  const typeIcon = type === 'camera' ? '📸' : '🔐'

  const handleRequest = async () => {
    setIsRequesting(true)
    try {
      await onRequest()
      onClose()
    } catch (error) {
      logger.error('Permission request failed:', error as Error)
      setShowInstructions(true)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleUseAlternative = () => {
    onUseAlternative?.()
    onClose()
  }

  const getPermissionRationale = () => {
    if (type === 'camera') {
      return {
        title: 'Camera Access Required',
        description: 'We need access to your camera to take photos of your meals for AI analysis.',
        benefits: [
          'Automatically identify foods in your meals',
          'Get instant calorie and nutrition estimates',
          'Track your meals with visual records',
          'Improve accuracy of your food log'
        ]
      }
    } else {
      return {
        title: 'Biometric Authentication',
        description: `Set up ${isIOS() ? 'Face ID or Touch ID' : isAndroid() ? 'Fingerprint' : 'biometric authentication'} for quick and secure sign-in.`,
        benefits: [
          'Sign in quickly without typing passwords',
          'Enhanced security with device-level protection',
          'Your biometric data never leaves your device',
          'Optional - you can always use your password'
        ]
      }
    }
  }

  const rationale = getPermissionRationale()
  const instructions = getSettingsInstructions(type)
  const mobile = isMobile()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark p-6 text-white">
          <div className="flex items-center space-x-3">
            <span className="text-4xl" role="img" aria-label={typeName}>
              {typeIcon}
            </span>
            <div>
              <h2 className="text-xl font-bold">{rationale.title}</h2>
              <p className="text-sm text-white mt-1">{rationale.description}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!showInstructions ? (
            <>
              {/* Benefits */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Benefits:</h3>
                <ul className="space-y-2">
                  {rationale.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-foreground">
                      <span className="text-success mt-0.5">✓</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Privacy Note */}
              {type === 'biometric' && (
                <div className="bg-indigo-100 dark:bg-indigo-900/20 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <span className="text-accent-dark text-lg">🔒</span>
                    <p className="text-xs text-accent-dark">
                      <strong>Privacy First:</strong> Your biometric data stays on your device and is never
                      shared or uploaded. We only use it to verify your identity locally.
                    </p>
                  </div>
                </div>
              )}

              {/* Mobile Reminder */}
              {mobile && (
                <div className="bg-indigo-100 dark:bg-indigo-900/20 border border-accent rounded-lg p-4">
                  <p className="text-xs text-accent-dark">
                    <strong>Note:</strong> Your browser will show a permission prompt. Please tap "Allow" to enable {typeName.toLowerCase()}.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleRequest}
                  disabled={isRequesting}
                  className="btn btn-primary w-full"
                  aria-label={`Grant ${typeName} permission`}
                >
                  {isRequesting ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Requesting...</span>
                    </span>
                  ) : (
                    <span>Grant {typeName} Access</span>
                  )}
                </button>

                {onUseAlternative && (
                  <button
                    onClick={handleUseAlternative}
                    disabled={isRequesting}
                    className="btn btn-secondary w-full"
                    aria-label={alternativeLabel}
                  >
                    {alternativeLabel}
                  </button>
                )}

                <button
                  onClick={onClose}
                  disabled={isRequesting}
                  className="w-full text-sm text-muted-foreground hover:text-foreground py-2"
                  aria-label="Close dialog"
                >
                  Maybe later
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Settings Instructions */}
              <div className="space-y-4">
                <div className="bg-warning-light border border-warning-light rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <span className="text-warning text-xl">⚠️</span>
                    <div>
                      <h3 className="text-sm font-semibold text-warning-dark dark:text-yellow-300 mb-1">Permission Denied</h3>
                      <p className="text-xs text-yellow-700">
                        It looks like {typeName.toLowerCase()} access was denied or blocked. You'll need to enable it in your device settings.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">How to Enable:</h3>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-foreground whitespace-pre-line">{instructions}</p>
                  </div>
                </div>

                <ol className="text-sm text-foreground space-y-2 list-decimal list-inside">
                  <li>Follow the instructions above to access your settings</li>
                  <li>Find the {typeName.toLowerCase()} permission setting</li>
                  <li>Enable/Allow {typeName.toLowerCase()} access</li>
                  <li>Return to this page and try again</li>
                </ol>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleRequest}
                    className="btn btn-primary w-full"
                    aria-label="Try again"
                  >
                    Try Again
                  </button>

                  {onUseAlternative && (
                    <button
                      onClick={handleUseAlternative}
                      className="btn btn-secondary w-full"
                      aria-label={alternativeLabel}
                    >
                      {alternativeLabel}
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="w-full text-sm text-muted-foreground hover:text-foreground py-2"
                    aria-label="Close dialog"
                  >
                    Close
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
