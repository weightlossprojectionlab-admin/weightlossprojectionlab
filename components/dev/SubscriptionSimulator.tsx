/**
 * Subscription Simulator - Development Tool
 *
 * Allows developers and admins to simulate different subscription states
 * for testing feature gates, patient limits, and upgrade flows.
 *
 * Only visible in development mode or for admin users.
 */

'use client'

import { useState, useEffect } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import { getSimulationPresets, setSimulatedSubscription } from '@/lib/feature-gates'
import { UserSubscription } from '@/types'

export function SubscriptionSimulator() {
  const { subscription, isAdmin } = useSubscription()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string>('Real Subscription')
  const [isSimulating, setIsSimulating] = useState(false)

  // Check if we should show the simulator
  const shouldShow = process.env.NODE_ENV === 'development' || isAdmin

  useEffect(() => {
    // Check if there's an active simulation
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const simulated = localStorage.getItem('dev_subscription')
      setIsSimulating(!!simulated)
    }
  }, [])

  if (!shouldShow) return null

  const presets = getSimulationPresets()

  const handlePresetChange = (presetName: string) => {
    console.log('[SubscriptionSimulator] Changing preset to:', presetName)
    setSelectedPreset(presetName)

    if (presetName === 'Real Subscription') {
      // Reset to real subscription
      console.log('[SubscriptionSimulator] Resetting to real subscription')
      setSimulatedSubscription(null)
      setIsSimulating(false)

      // Show toast notification
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success('Switched back to real subscription')
      }
    } else {
      // Apply simulated subscription
      const preset = presets[presetName]
      if (preset) {
        console.log('[SubscriptionSimulator] Applying preset:', preset)
        setSimulatedSubscription(preset)
        setIsSimulating(true)

        // Show toast notification with plan details
        if (typeof window !== 'undefined' && (window as any).toast) {
          (window as any).toast.success(
            `Simulating ${presetName}${preset.addons?.familyFeatures ? ' (Family Features)' : ''}`,
            { duration: 3000 }
          )
        }
      } else {
        console.error('[SubscriptionSimulator] Preset not found:', presetName)
      }
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-medium transition-colors animate-pulse"
          title="Open Subscription Simulator (Dev Tool)"
        >
          <span className="text-lg">🔧</span>
          <span>Dev Tools</span>
          {isSimulating && (
            <span className="bg-yellow-400 text-purple-900 px-2 py-0.5 rounded text-xs font-bold">
              SIM
            </span>
          )}
        </button>
      )}

      {/* Simulator Panel */}
      {isOpen && (
        <div className="bg-card border border-border rounded-lg shadow-2xl w-80 overflow-hidden">
          {/* Header */}
          <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔧</span>
              <span className="font-bold">Subscription Simulator</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-purple-700 rounded p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Warning Badge */}
            {isSimulating && (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <span className="text-lg">⚠️</span>
                  <span className="text-sm font-bold">Simulation Active</span>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  You're testing with a simulated subscription
                </p>
              </div>
            )}

            {/* Current Subscription Display */}
            {subscription && (
              <div className="bg-muted rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Plan:</span>
                  <span className="text-sm font-bold text-foreground capitalize">
                    {subscription.plan}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <span className={`text-sm font-medium capitalize ${
                    subscription.status === 'active' ? 'text-success' :
                    subscription.status === 'trialing' ? 'text-warning-dark' :
                    'text-error'
                  }`}>
                    {subscription.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Max Patients:</span>
                  <span className="text-sm font-bold text-foreground">
                    {subscription.maxPatients}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Family Features:</span>
                  <span className={`text-sm font-medium ${
                    subscription.addons?.familyFeatures ? 'text-success' : 'text-muted-foreground'
                  }`}>
                    {subscription.addons?.familyFeatures ? '✓ Enabled' : '✗ Disabled'}
                  </span>
                </div>
              </div>
            )}

            {/* Preset Selector */}
            <div>
              <label htmlFor="preset-selector" className="block text-sm font-medium text-foreground mb-2">
                Test Subscription State
              </label>
              <select
                id="preset-selector"
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              >
                <option value="Real Subscription">Real Subscription</option>
                <optgroup label="Simulated Plans">
                  {Object.keys(presets).map((presetName) => (
                    <option key={presetName} value={presetName}>
                      {presetName}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Help Text */}
            <div className="text-xs text-muted-foreground bg-muted rounded p-2">
              <p>
                <strong>💡 Tip:</strong> Select a preset to test different subscription states.
                The UI will update in real-time to reflect feature gates and limits.
              </p>
            </div>

            {/* Reset Button */}
            {isSimulating && (
              <button
                onClick={() => handlePresetChange('Real Subscription')}
                className="w-full px-4 py-2 bg-muted hover:bg-gray-300 dark:hover:bg-gray-700 text-foreground rounded-lg font-medium transition-colors"
              >
                Reset to Real Subscription
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="bg-muted px-4 py-2 text-xs text-muted-foreground">
            {process.env.NODE_ENV === 'development' ? (
              <span>🔨 Development Mode</span>
            ) : (
              <span>👑 Admin Access</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
