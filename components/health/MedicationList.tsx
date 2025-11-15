'use client'

import { useState } from 'react'
import { PlusIcon, CameraIcon } from '@heroicons/react/24/outline'
import MedicationScanner from './MedicationScanner'
import { MedicationCard } from './MedicationCard'
import { ScannedMedication } from '@/lib/medication-lookup'

interface MedicationListProps {
  medications: ScannedMedication[]
  onChange: (medications: ScannedMedication[]) => void
  prescribedFor?: string // Condition name
  label?: string
  description?: string
}

export default function MedicationList({
  medications,
  onChange,
  prescribedFor,
  label = 'Medications',
  description = 'Scan or add your medications'
}: MedicationListProps) {
  const [scannerOpen, setScannerOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const handleAddMedication = (medication: ScannedMedication) => {
    if (editingIndex !== null) {
      // Editing existing medication
      const updated = [...medications]
      updated[editingIndex] = medication
      onChange(updated)
      setEditingIndex(null)
    } else {
      // Adding new medication
      onChange([...medications, medication])
    }
  }

  const handleRemoveMedication = (index: number) => {
    const updated = medications.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleEditMedication = (index: number) => {
    setEditingIndex(index)
    setScannerOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Label */}
      {label && (
        <div>
          <label className="text-label block mb-1">{label}</label>
          {description && (
            <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
          )}
        </div>
      )}

      {/* Medication list */}
      {medications.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medications.map((med, index) => (
            <MedicationCard
              key={index}
              medication={med}
              onEdit={() => handleEditMedication(index)}
              onDelete={() => handleRemoveMedication(index)}
              showActions={true}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {medications.length === 0 && (
        <div className="text-center py-8 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
          <CameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            No medications added yet
          </p>
        </div>
      )}

      {/* Add medication button */}
      <button
        onClick={() => {
          setEditingIndex(null)
          setScannerOpen(true)
        }}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-primary hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
      >
        <PlusIcon className="w-5 h-5 text-primary" />
        <span className="text-primary font-medium">
          {medications.length === 0 ? 'Scan or Add Medication' : 'Add Another Medication'}
        </span>
      </button>

      {/* Medication Scanner Modal */}
      <MedicationScanner
        isOpen={scannerOpen}
        onClose={() => {
          setScannerOpen(false)
          setEditingIndex(null)
        }}
        onMedicationScanned={handleAddMedication}
        prescribedFor={prescribedFor}
      />
    </div>
  )
}
