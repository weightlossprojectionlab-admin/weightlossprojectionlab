'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { PatientProfile } from '@/types/medical'
import { useSelectedPatient } from '@/hooks/useSelectedPatient'

interface AccountContextType {
  selectedPatient: PatientProfile | null
  setSelectedPatient: (patient: PatientProfile | null) => void
  clearSelection: () => void
  isSelected: (patientId: string) => boolean
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const selectedPatientHook = useSelectedPatient()

  return (
    <AccountContext.Provider value={selectedPatientHook}>
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
