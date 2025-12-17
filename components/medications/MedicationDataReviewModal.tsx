'use client'

import { ParsedMedicationData } from '@/lib/medication-parser'
import { PatientMedication } from '@/types/medical'
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface MedicationDataReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: () => void
  extractedData: ParsedMedicationData | null
  currentMedication: PatientMedication
  applying: boolean
  isExtracting?: boolean
}

export default function MedicationDataReviewModal({
  isOpen,
  onClose,
  onApply,
  extractedData,
  currentMedication,
  applying,
  isExtracting = false
}: MedicationDataReviewModalProps) {
  if (!isOpen) return null

  // Compare current vs extracted data
  const changes: Array<{ field: string; current: string; extracted: string }> = []

  const fieldLabels: Record<string, string> = {
    name: 'Medication Name',
    brandName: 'Brand Name',
    strength: 'Strength',
    dosageForm: 'Dosage Form',
    frequency: 'Dosage Instructions',
    prescribedFor: 'Prescribed For',
    patientName: 'Patient Name',
    prescribingDoctor: 'Prescribing Doctor',
    rxNumber: 'Rx Number',
    ndc: 'NDC',
    quantity: 'Quantity',
    refills: 'Refills',
    fillDate: 'Fill Date',
    expirationDate: 'Expiration Date',
    pharmacyName: 'Pharmacy Name',
    pharmacyPhone: 'Pharmacy Phone',
    warnings: 'Warnings'
  }

  // Track which fields will be updated
  if (extractedData) {
    Object.entries(extractedData).forEach(([key, value]) => {
      if (value) {
        const currentValue = currentMedication[key as keyof PatientMedication]
        const extractedValue = Array.isArray(value) ? value.join(', ') : value
        const currentValueStr = Array.isArray(currentValue) ? currentValue.join(', ') : (currentValue || '')

        changes.push({
          field: fieldLabels[key] || key,
          current: currentValueStr.toString(),
          extracted: extractedValue.toString()
        })
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExtracting ? (
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
            ) : (
              <CheckCircleIcon className="w-8 h-8 text-white" />
            )}
            <div>
              <h2 className="text-xl font-bold text-white">
                {isExtracting ? 'Reading Medication Label...' : 'OCR Extraction Complete'}
              </h2>
              <p className="text-purple-100 text-sm">
                {isExtracting ? 'Extracting data from medication label' : 'Review the extracted medication data below'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={applying || isExtracting}
            className="text-white hover:text-purple-200 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isExtracting ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-4"></div>
              <p className="text-lg font-medium text-foreground">Extracting medication data...</p>
              <p className="text-sm text-muted-foreground mt-2">Using AI to read the label</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  {changes.length} field{changes.length !== 1 ? 's' : ''} will be updated. Review the changes below and click "Apply Changes" to update the medication.
                </p>
              </div>

              {/* Changes List */}
              <div className="space-y-3">
            {changes.map((change, idx) => {
              const isNew = !change.current || change.current.trim() === ''
              const isChanged = change.current !== change.extracted

              return (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 ${
                    isNew
                      ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                      : isChanged
                      ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-border bg-muted'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Field Name */}
                    <div className="min-w-[140px]">
                      <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {change.field}
                        {isNew && (
                          <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">New</span>
                        )}
                        {!isNew && isChanged && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">Updated</span>
                        )}
                      </div>
                    </div>

                    {/* Values */}
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      {/* Current Value */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Current</div>
                        <div className={`text-sm ${!change.current || change.current.trim() === '' ? 'text-muted-foreground italic' : 'text-foreground line-through opacity-60'}`}>
                          {change.current && change.current.trim() !== '' ? change.current : '(empty)'}
                        </div>
                      </div>

                      {/* Extracted Value */}
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Extracted</div>
                        <div className="text-sm font-medium text-foreground">
                          {change.extracted}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

              {changes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No data was extracted from the label.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-muted/50 flex gap-3">
          <button
            onClick={onClose}
            disabled={applying || isExtracting}
            className="flex-1 px-4 py-2.5 border-2 border-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            disabled={applying || isExtracting || changes.length === 0}
            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {applying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Applying...
              </>
            ) : isExtracting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Extracting...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                Apply Changes ({changes.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
