/**
 * usePatientLimit Hook
 *
 * Check patient limits based on user's subscription
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { getPatientLimitInfo, canAddPatient } from '@/lib/feature-gates'

export function usePatientLimit(currentPatientCount: number) {
  const { user } = useAuth()
  const [limitInfo, setLimitInfo] = useState<{
    current: number
    max: number | undefined
    canAdd: boolean
    percentage: number
  }>({
    current: 0,
    max: 0,
    canAdd: false,
    percentage: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLimitInfo({
        current: 0,
        max: 0,
        canAdd: false,
        percentage: 0
      })
      setLoading(false)
      return
    }

    const info = getPatientLimitInfo(user as any, currentPatientCount)
    setLimitInfo(info)
    setLoading(false)

    // Listen for simulation changes in dev mode
    if (process.env.NODE_ENV === 'development') {
      const handleSimulationChange = () => {
        const updated = getPatientLimitInfo(user as any, currentPatientCount)
        setLimitInfo(updated)
      }

      window.addEventListener('subscription-simulation-changed', handleSimulationChange)
      return () => {
        window.removeEventListener('subscription-simulation-changed', handleSimulationChange)
      }
    }
  }, [user, currentPatientCount])

  return {
    ...limitInfo,
    loading
  }
}
