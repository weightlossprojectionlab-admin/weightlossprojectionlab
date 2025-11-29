'use client'

import { useState, useEffect } from 'react'
import { PatientProfile } from '@/types/medical'

const STORAGE_KEY = 'selectedPatientId'
const PATIENT_DATA_KEY = 'selectedPatientData'

interface SelectedPatientHook {
  selectedPatient: PatientProfile | null
  setSelectedPatient: (patient: PatientProfile | null) => void
  clearSelection: () => void
  isSelected: (patientId: string) => boolean
}

export const useSelectedPatient = (): SelectedPatientHook => {
  const [selectedPatient, setSelectedPatientState] = useState<PatientProfile | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem(PATIENT_DATA_KEY)
      if (storedData) {
        const patient = JSON.parse(storedData) as PatientProfile
        setSelectedPatientState(patient)
      }
    } catch (error) {
      console.error('Error hydrating selected patient:', error)
      sessionStorage.removeItem(PATIENT_DATA_KEY)
      sessionStorage.removeItem(STORAGE_KEY)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  const setSelectedPatient = (patient: PatientProfile | null) => {
    setSelectedPatientState(patient)
    if (patient) {
      sessionStorage.setItem(STORAGE_KEY, patient.id)
      sessionStorage.setItem(PATIENT_DATA_KEY, JSON.stringify(patient))
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(PATIENT_DATA_KEY)
    }
  }

  const clearSelection = () => {
    setSelectedPatientState(null)
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(PATIENT_DATA_KEY)
  }

  const isSelected = (patientId: string): boolean => {
    return selectedPatient?.id === patientId
  }

  return {
    selectedPatient,
    setSelectedPatient,
    clearSelection,
    isSelected,
  }
}

// Helper to get stored patient ID (useful for initial routing decisions)
export const getStoredPatientId = (): string | null => {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(STORAGE_KEY)
}
