'use client'

import { useState, useEffect } from 'react'
import { PatientProfile } from '@/types/medical'
import { medicalOperations } from '@/lib/medical-operations'
import { UserCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { useUserProfile } from '@/hooks/useUserProfile'
import toast from 'react-hot-toast'

interface PatientSelectorProps {
  selectedPatientId: string | null
  onSelectPatient?: (patientId: string | null) => void
  onPatientChange?: (patientId: string, patient: PatientProfile) => void
  patients?: PatientProfile[]
  placeholder?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function PatientSelector({
  selectedPatientId,
  onSelectPatient,
  onPatientChange,
  patients: externalPatients,
  placeholder,
  showLabel = true,
  size = 'md'
}: PatientSelectorProps) {
  const [internalPatients, setInternalPatients] = useState<PatientProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const { profile: userProfile } = useUserProfile()

  // Use external patients if provided, otherwise use internal
  const patients = externalPatients || internalPatients

  useEffect(() => {
    // Only load patients if not provided externally
    if (!externalPatients) {
      loadPatients()
    } else {
      setLoading(false)
    }
  }, [externalPatients])

  const loadPatients = async () => {
    try {
      setLoading(true)
      const data = await medicalOperations.patients.getPatients()
      setInternalPatients(data)

      // Auto-select family member if none selected
      if (!selectedPatientId && data.length > 0 && onPatientChange) {
        let defaultPatient: PatientProfile | undefined

        // Priority 1: Use primaryPatientId from user preferences
        if (userProfile?.preferences?.primaryPatientId) {
          defaultPatient = data.find(p => p.id === userProfile.preferences.primaryPatientId)
        }

        // Priority 2: Fall back to "Self" family member
        if (!defaultPatient) {
          defaultPatient = data.find(p => p.relationship === 'self')
        }

        // Priority 3: Use first family member in list
        if (!defaultPatient) {
          defaultPatient = data[0]
        }

        if (defaultPatient) {
          onPatientChange(defaultPatient.id, defaultPatient)
        }
      }
    } catch (error) {
      console.error('Error loading family members:', error)
      toast.error('Failed to load family members')
    } finally {
      setLoading(false)
    }
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId)

  const handlePatientSelect = (patientId: string, patient: PatientProfile) => {
    // Call onSelectPatient if provided (dashboard usage)
    if (onSelectPatient) {
      onSelectPatient(patientId)
    }
    // Call onPatientChange if provided (legacy usage)
    if (onPatientChange) {
      onPatientChange(patientId, patient)
    }
  }

  const sizeClasses = {
    sm: 'text-sm py-1.5 px-3',
    md: 'text-base py-2 px-4',
    lg: 'text-lg py-3 px-5'
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        {showLabel && <span className="text-sm text-muted-foreground">Loading...</span>}
        <div className="animate-pulse bg-muted rounded-lg h-10 w-40"></div>
      </div>
    )
  }

  if (patients.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <UserCircleIcon className="w-5 h-5" />
        <span>No family members found</span>
      </div>
    )
  }

  return (
    <div className="relative">
      {showLabel && (
        <label className="block text-sm font-medium text-foreground mb-1">
          Viewing data for:
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors w-full ${sizeClasses[size]}`}
      >
        <div className="flex items-center gap-2">
          <UserCircleIcon className="w-5 h-5 text-primary" />
          <div className="text-left">
            <div className="font-medium text-foreground">
              {selectedPatient?.name || placeholder || 'Select family member'}
            </div>
            {selectedPatient && (
              <div className="text-xs text-muted-foreground capitalize">
                {selectedPatient.relationship}
              </div>
            )}
          </div>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
            {patients.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => {
                  handlePatientSelect(patient.id, patient)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left ${
                  patient.id === selectedPatientId ? 'bg-primary/10' : ''
                }`}
              >
                <UserCircleIcon className={`w-5 h-5 ${
                  patient.id === selectedPatientId ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <div className="flex-1">
                  <div className={`font-medium ${
                    patient.id === selectedPatientId ? 'text-primary' : 'text-foreground'
                  }`}>
                    {patient.name}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {patient.relationship}
                    {patient.type === 'pet' && ` • ${patient.species}`}
                  </div>
                </div>
                {patient.id === selectedPatientId && (
                  <div className="text-primary">✓</div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
