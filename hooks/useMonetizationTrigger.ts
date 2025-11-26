/**
 * Hook for event-driven monetization triggers
 */

import { useState } from 'react'
import { useAuth } from './useAuth'
import { checkTrigger, logTriggerEvent, type TriggerType, type UpgradePrompt } from '@/lib/monetization-triggers'

export function useMonetizationTrigger(trigger: TriggerType) {
  const { user } = useAuth()
  const [prompt, setPrompt] = useState<UpgradePrompt | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [checking, setChecking] = useState(false)

  /**
   * Check if user can proceed with action
   * Returns true if allowed, false if blocked (and shows upgrade modal)
   */
  async function checkAndPrompt(): Promise<boolean> {
    if (!user) return false

    setChecking(true)

    try {
      const upgradePrompt = await checkTrigger(user.uid, trigger)

      if (upgradePrompt) {
        setPrompt(upgradePrompt)
        setShowModal(true)

        // Log that trigger was shown
        await logTriggerEvent(user.uid, trigger, 'shown')

        // Hard urgency = block action
        return upgradePrompt.urgency !== 'hard'
      }

      // No upgrade needed - allow action
      return true
    } catch (error) {
      console.error('Error checking monetization trigger:', error)
      // On error, allow action (fail open)
      return true
    } finally {
      setChecking(false)
    }
  }

  /**
   * Dismiss the upgrade modal
   */
  async function dismissModal() {
    if (user && prompt) {
      await logTriggerEvent(user.uid, trigger, 'dismissed')
    }
    setShowModal(false)
  }

  /**
   * User clicked upgrade button
   */
  async function handleUpgrade() {
    if (user && prompt) {
      await logTriggerEvent(user.uid, trigger, 'upgraded')
    }
    // TODO: Navigate to Stripe checkout or upgrade flow
    console.log('Navigate to upgrade:', prompt?.tier)
  }

  return {
    checkAndPrompt,
    prompt,
    showModal,
    setShowModal,
    dismissModal,
    handleUpgrade,
    checking
  }
}
