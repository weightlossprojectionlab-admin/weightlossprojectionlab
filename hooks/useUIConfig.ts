/**
 * Hook to access dynamic UI configuration
 */

import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getUIConfig, type UIConfig } from '@/lib/user-mode-config'
import type { UserMode, FeaturePreference } from '@/types'

export function useUIConfig() {
  const { user } = useAuth()
  const [config, setConfig] = useState<UIConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setConfig(null)
      setLoading(false)
      return
    }

    const fetchConfig = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        const userData = userDoc.data()

        // Get user mode and feature preferences from onboarding answers
        const userMode: UserMode = userData?.preferences?.userMode || 'single'
        const featurePreferences: FeaturePreference[] =
          userData?.preferences?.onboardingAnswers?.featurePreferences || []

        const uiConfig = getUIConfig(userMode, featurePreferences)
        setConfig(uiConfig)
      } catch (error) {
        console.error('Error fetching UI config:', error)
        // Fallback to single mode
        setConfig(getUIConfig('single', []))
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [user])

  return { config, loading }
}
