'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import MedicationList from './MedicationList'
import { ScannedMedication } from '@/lib/medication-lookup'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

interface MedicationManagementModalProps {
  isOpen: boolean
  onClose: () => void
  medications: ScannedMedication[]
  onSave: (medications: ScannedMedication[]) => Promise<void>
  prescribedFor?: string // Optional: filter medications for specific condition
}

export function MedicationManagementModal({
  isOpen,
  onClose,
  medications: initialMedications,
  onSave,
  prescribedFor
}: MedicationManagementModalProps) {
  // Filter medications by condition if prescribedFor is specified
  const filteredMedications = prescribedFor
    ? initialMedications.filter(med => med.prescribedFor === prescribedFor)
    : initialMedications

  const [medications, setMedications] = useState<ScannedMedication[]>(filteredMedications)
  const [saving, setSaving] = useState(false)

  // Reset medications when modal opens or prescribedFor changes
  useEffect(() => {
    if (isOpen) {
      const filtered = prescribedFor
        ? initialMedications.filter(med => med.prescribedFor === prescribedFor)
        : initialMedications
      setMedications(filtered)
    }
  }, [isOpen, prescribedFor, initialMedications])

  const handleSave = async () => {
    setSaving(true)
    try {
      // If filtering by condition, merge with medications from other conditions
      // Otherwise, save all medications
      const medsToSave = prescribedFor
        ? [
            ...initialMedications.filter(med => med.prescribedFor !== prescribedFor),
            ...medications
          ]
        : medications

      await onSave(medsToSave)
      toast.success(prescribedFor
        ? `Medications for ${prescribedFor} updated successfully`
        : 'Medications updated successfully'
      )
      onClose()
    } catch (error) {
      logger.error('Error saving medications', error as Error)
      toast.error('Failed to save medications')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setMedications(initialMedications)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {prescribedFor ? `Medications for ${prescribedFor}` : 'Manage Medications'}
            </h2>
            {prescribedFor && (
              <p className="text-sm text-muted-foreground mt-1">
                Add or manage medications specifically for this condition
              </p>
            )}
          </div>
          <button
            onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <MedicationList
            medications={medications}
            onChange={setMedications as (medications: (import('@/types/medical').PatientMedication | import('@/lib/medication-lookup').ScannedMedication)[]) => void}
            prescribedFor={prescribedFor}
            label={prescribedFor ? `Medications for ${prescribedFor}` : "Your Medications"}
            description={prescribedFor
              ? `Scan or add medications for ${prescribedFor}. New medications will be automatically tagged for this condition.`
              : "Scan prescription labels with NDC barcode or OCR. Add, edit, or remove your medications."
            }
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-2 border border-border rounded-lg text-foreground hover:bg-background transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
