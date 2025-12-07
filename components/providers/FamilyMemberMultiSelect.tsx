/**
 * Family Member Multi-Select Component
 *
 * Allows selecting multiple family members to assign to a healthcare provider
 */

'use client'

import { useState } from 'react'
import type { PatientProfile } from '@/types/medical'

interface FamilyMemberMultiSelectProps {
  patients: PatientProfile[]
  selectedPatientIds: string[]
  onChange: (selectedIds: string[]) => void
  disabled?: boolean
  placeholder?: string
}

export function FamilyMemberMultiSelect({
  patients,
  selectedPatientIds,
  onChange,
  disabled = false,
  placeholder = 'Select family members...'
}: FamilyMemberMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  const togglePatient = (patientId: string) => {
    if (selectedPatientIds.includes(patientId)) {
      onChange(selectedPatientIds.filter(id => id !== patientId))
    } else {
      onChange([...selectedPatientIds, patientId])
    }
  }

  const selectAll = () => {
    onChange(patients.map(p => p.id))
  }

  const clearAll = () => {
    onChange([])
  }

  const selectedCount = selectedPatientIds.length
  const selectedPatients = patients.filter(p => selectedPatientIds.includes(p.id))

  return (
    <div className="relative">
      {/* Selected Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-2 border-2 rounded-lg text-left
          flex items-center justify-between
          transition-colors
          ${disabled
            ? 'bg-gray-100 border-gray-200 cursor-not-allowed'
            : 'bg-white border-border hover:border-primary cursor-pointer'
          }
        `}
      >
        <div className="flex-1 min-w-0">
          {selectedCount === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selectedPatients.map(patient => (
                <span
                  key={patient.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-sm"
                >
                  {patient.name}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePatient(patient.id)
                    }}
                    className="hover:text-primary-dark"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-muted-foreground transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Options */}
          <div className="absolute z-20 w-full mt-1 bg-white border-2 border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {/* Select All / Clear All */}
            <div className="sticky top-0 bg-gray-50 border-b border-border px-4 py-2 flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-sm text-primary hover:text-primary-dark font-medium"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-sm text-muted-foreground hover:text-foreground font-medium"
              >
                Clear All
              </button>
            </div>

            {/* Patient List */}
            {patients.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                No family members found
              </div>
            ) : (
              <div className="py-1">
                {patients.map(patient => {
                  const isSelected = selectedPatientIds.includes(patient.id)

                  return (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => togglePatient(patient.id)}
                      className={`
                        w-full px-4 py-2 text-left flex items-center gap-3
                        transition-colors hover:bg-gray-50
                        ${isSelected ? 'bg-primary/5' : ''}
                      `}
                    >
                      {/* Checkbox */}
                      <div
                        className={`
                          w-5 h-5 border-2 rounded flex items-center justify-center
                          transition-colors
                          ${isSelected
                            ? 'bg-primary border-primary'
                            : 'border-gray-300'
                          }
                        `}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Patient Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground">
                          {patient.name}
                        </div>
                        {patient.relationship && (
                          <div className="text-sm text-muted-foreground capitalize">
                            {patient.relationship}
                          </div>
                        )}
                      </div>

                      {/* Photo */}
                      {patient.photo && (
                        <img
                          src={patient.photo}
                          alt={patient.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
