'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { PatientProfile } from '@/types/medical'
import { useSelectedPatient } from '@/hooks/useSelectedPatient'

interface AccountContextType {
  selectedPatient: PatientProfile | null
  setSelectedPatient: (patient: PatientProfile | null) => void
  clearSelection: () => void
  isSelected: (patientId: string) => boolean

  /**
   * The account (workspace) whose data is currently being acted on — i.e. the
   * owner UID of the patient/household in view. Null means "the logged-in
   * user's own personal workspace". This is the single source the
   * subscription/feature gates key off (see hooks/useSubscription): a caregiver
   * operating inside an owner's account is gated by the OWNER's plan, never
   * their own. Set by the route surfaces that establish account context
   * (patient detail = patient.userId; caregiver dashboard = ownerId).
   */
  activeAccountId: string | null
  /**
   * True while the active account is still being resolved (e.g. the patient
   * detail page hasn't loaded patient.userId yet). Gates should render a
   * pending state rather than the viewer's personal plan, to avoid a flash of
   * "Upgrade" before the owner's plan loads.
   */
  isResolvingAccount: boolean
  /** Publish the active account. Pass resolving=true while it's still loading. */
  setActiveAccount: (accountId: string | null, resolving?: boolean) => void
}

export const AccountContext = createContext<AccountContextType | undefined>(undefined)

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const selectedPatientHook = useSelectedPatient()

  const [activeAccountId, setActiveAccountId] = useState<string | null>(null)
  const [isResolvingAccount, setIsResolvingAccount] = useState(false)

  const setActiveAccount = useCallback((accountId: string | null, resolving = false) => {
    setActiveAccountId((prev) => (prev === accountId ? prev : accountId))
    setIsResolvingAccount(resolving)
  }, [])

  return (
    <AccountContext.Provider
      value={{
        ...selectedPatientHook,
        activeAccountId,
        isResolvingAccount,
        setActiveAccount,
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export const useAccount = (): AccountContextType => {
  const context = useContext(AccountContext)
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider')
  }
  return context
}

/**
 * Non-throwing read of the active account for consumers that may render
 * outside an AccountProvider (e.g. useSubscription is used app-wide, including
 * the minimal home shell). Returns a safe "personal workspace" default.
 */
export const useActiveAccount = (): { activeAccountId: string | null; isResolvingAccount: boolean } => {
  const context = useContext(AccountContext)
  return {
    activeAccountId: context?.activeAccountId ?? null,
    isResolvingAccount: context?.isResolvingAccount ?? false,
  }
}
