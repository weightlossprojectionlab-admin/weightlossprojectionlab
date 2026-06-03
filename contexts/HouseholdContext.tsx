'use client'

/**
 * HouseholdContext
 *
 * Global context for managing active household selection
 * Allows users to switch between multiple households they manage
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useHouseholds } from '@/hooks/useHouseholds'
import { logger } from '@/lib/logger'
import type { Household } from '@/types/household'

interface HouseholdContextValue {
  // Current active household
  activeHousehold: Household | null
  setActiveHousehold: (household: Household | null) => void

  // All households user has access to
  households: Household[]
  loading: boolean
  error: string | null

  // Helper to get household by ID
  getHouseholdById: (id: string) => Household | undefined

  // Check if user has household access
  hasHouseholds: boolean
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined)

interface HouseholdProviderProps {
  children: ReactNode
}

export function HouseholdProvider({ children }: HouseholdProviderProps) {
  const { user } = useAuth()
  const { households, loading, error } = useHouseholds()
  const [activeHousehold, setActiveHousehold] = useState<Household | null>(null)

  // Restore the saved household, or auto-select the first.
  //
  // This used to only run while `!activeHousehold`, which created a
  // restore RACE: the persistent Firestore cache can serve a stale
  // households snapshot first. If the saved household isn't in that
  // first snapshot, the effect fell through to `households[0]` and
  // LOCKED IT IN — once `activeHousehold` was set it never re-checked
  // localStorage, so the user's last-selected household was silently
  // ignored on load. Now: whenever the saved household is present in
  // the current set, honor it (correcting an earlier auto-pick); only
  // fall back to households[0] when there's no saved id at all. A
  // manual switch writes localStorage (effect below), so saved === the
  // active one and this never fights the user's choice.
  useEffect(() => {
    if (households.length === 0) return
    const savedHouseholdId = localStorage.getItem('activeHouseholdId')

    if (savedHouseholdId) {
      const saved = households.find(h => h.id === savedHouseholdId)
      if (saved) {
        if (saved.id !== activeHousehold?.id) {
          setActiveHousehold(saved)
          logger.info('[HouseholdContext] Restored active household', { householdId: saved.id })
        }
        return
      }
      // Saved id not (yet) in this snapshot — don't clobber it with a
      // default; wait for a snapshot that includes it, unless nothing
      // is active at all.
    }

    if (!activeHousehold) {
      setActiveHousehold(households[0])
      logger.info('[HouseholdContext] Auto-selected first household', { householdId: households[0].id })
    }
  }, [households, activeHousehold])

  // Save active household to localStorage when it changes
  useEffect(() => {
    if (activeHousehold) {
      localStorage.setItem('activeHouseholdId', activeHousehold.id)
      logger.info('[HouseholdContext] Active household changed', {
        householdId: activeHousehold.id,
        householdName: activeHousehold.name
      })
    }
  }, [activeHousehold])

  // Clear active household when user logs out
  useEffect(() => {
    if (!user) {
      setActiveHousehold(null)
      localStorage.removeItem('activeHouseholdId')
    }
  }, [user])

  const getHouseholdById = (id: string): Household | undefined => {
    return households.find(h => h.id === id)
  }

  const value: HouseholdContextValue = {
    activeHousehold,
    setActiveHousehold,
    households,
    loading,
    error,
    getHouseholdById,
    hasHouseholds: households.length > 0
  }

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  )
}

/**
 * Hook to access household context
 */
export function useHousehold() {
  const context = useContext(HouseholdContext)
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider')
  }
  return context
}
