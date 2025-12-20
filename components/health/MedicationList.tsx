'use client'

import { useState } from 'react'
import { PlusIcon, CameraIcon } from '@heroicons/react/24/outline'
import { MedicationCard } from './MedicationCard'
import { PatientMedication } from '@/types/medical'
import { ScannedMedication } from '@/lib/medication-lookup'

interface MedicationListProps {
  medications: (PatientMedication | ScannedMedication)[]
  onChange: (medications: (PatientMedication | ScannedMedication)[]) => void
  prescribedFor?: string // Condition name
  label?: string
  description?: string
  onAddClick?: () => void
}

export default function MedicationList({
  medications,
  onChange,
  prescribedFor,
  label = 'Medications',
  description = 'Add your medications',
  onAddClick
}: MedicationListProps) {
  const handleRemoveMedication = (index: number) => {
    const updated = medications.filter((_, i) => i !== index)
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {/* Label */}
      {label && (
        <div>
          <label className="text-label block mb-1">{label}</label>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      {/* Medication list */}
      {medications.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medications.map((med, index) => (
            <MedicationCard
              key={('id' in med ? med.id : undefined) || index}
              medication={med}
              onDelete={() => handleRemoveMedication(index)}
              showActions={true}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {medications.length === 0 && (
        <div className="text-center py-8 rounded-lg border-2 border-dashed border-border">
          <CameraIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            No medications added yet
          </p>
        </div>
      )}

      {/* Add medication button */}
      {onAddClick && (
        <button
          onClick={onAddClick}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-primary hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
        >
          <PlusIcon className="w-5 h-5 text-primary" />
          <span className="text-primary font-medium">
            {medications.length === 0 ? 'Add Medication' : 'Add Another Medication'}
          </span>
        </button>
      )}
    </div>
  )
}
