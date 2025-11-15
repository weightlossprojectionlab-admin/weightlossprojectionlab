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
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {prescribedFor ? `Medications for ${prescribedFor}` : 'Manage Medications'}
            </h2>
            {prescribedFor && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Add or manage medications specifically for this condition
              </p>
            )}
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <MedicationList
            medications={medications}
            onChange={setMedications}
            prescribedFor={prescribedFor}
            label={prescribedFor ? `Medications for ${prescribedFor}` : "Your Medications"}
            description={prescribedFor
              ? `Scan or add medications for ${prescribedFor}. New medications will be automatically tagged for this condition.`
              : "Scan prescription labels with NDC barcode or OCR. Add, edit, or remove your medications."
            }
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
