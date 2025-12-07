'use client'

import { useState, useEffect } from 'react'
import { PatientMedication } from '@/types/medical'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { MedicationImageManager } from '@/components/medications/MedicationImageManager'
import toast from 'react-hot-toast'

interface EditMedicationModalProps {
  medication: PatientMedication
  patientId: string
  onClose: () => void
  onSave: (updates: Partial<PatientMedication>) => Promise<void>
}

export default function EditMedicationModal({
  medication,
  patientId,
  onClose,
  onSave
}: EditMedicationModalProps) {
  const [formData, setFormData] = useState<Partial<PatientMedication>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Pre-fill form with current medication data
    setFormData({
      name: medication.name,
      brandName: medication.brandName,
      strength: medication.strength,
      dosageForm: medication.dosageForm,
      frequency: medication.frequency,
      prescribedFor: medication.prescribedFor,
      prescribingDoctor: medication.prescribingDoctor,
      rxNumber: medication.rxNumber,
      quantity: medication.quantity,
      refills: medication.refills,
      fillDate: medication.fillDate,
      expirationDate: medication.expirationDate,
      pharmacyName: medication.pharmacyName,
      pharmacyPhone: medication.pharmacyPhone,
      notes: medication.notes,
      images: medication.images || []
    })
  }, [medication])

  // Auto-populate form fields from OCR results
  const handleOCRComplete = (extractedData: any) => {
    if (!extractedData) return

    const updates: Partial<PatientMedication> = {}
    let fieldsUpdated: string[] = []

    // Only populate empty fields to avoid overwriting user input
    if (extractedData.medicationName && !formData.name) {
      updates.name = extractedData.medicationName
      fieldsUpdated.push('name')
    }
    if (extractedData.brandName && !formData.brandName) {
      updates.brandName = extractedData.brandName
      fieldsUpdated.push('brand name')
    }
    if (extractedData.strength && !formData.strength) {
      updates.strength = extractedData.strength
      fieldsUpdated.push('strength')
    }
    if (extractedData.dosageForm && !formData.dosageForm) {
      updates.dosageForm = extractedData.dosageForm
      fieldsUpdated.push('dosage form')
    }
    if (extractedData.frequency && !formData.frequency) {
      updates.frequency = extractedData.frequency
      fieldsUpdated.push('dosage instructions')
    }
    if (extractedData.prescribedFor && !formData.prescribedFor) {
      updates.prescribedFor = extractedData.prescribedFor
      fieldsUpdated.push('prescribed for')
    }
    if (extractedData.prescribingDoctor && !formData.prescribingDoctor) {
      updates.prescribingDoctor = extractedData.prescribingDoctor
      fieldsUpdated.push('doctor')
    }
    if (extractedData.rxNumber && !formData.rxNumber) {
      updates.rxNumber = extractedData.rxNumber
      fieldsUpdated.push('Rx number')
    }
    if (extractedData.quantity && !formData.quantity) {
      updates.quantity = extractedData.quantity
      fieldsUpdated.push('quantity')
    }
    if (extractedData.refills && !formData.refills) {
      updates.refills = extractedData.refills
      fieldsUpdated.push('refills')
    }
    if (extractedData.pharmacyName && !formData.pharmacyName) {
      updates.pharmacyName = extractedData.pharmacyName
      fieldsUpdated.push('pharmacy name')
    }
    if (extractedData.pharmacyPhone && !formData.pharmacyPhone) {
      updates.pharmacyPhone = extractedData.pharmacyPhone
      fieldsUpdated.push('pharmacy phone')
    }

    if (fieldsUpdated.length > 0) {
      setFormData({ ...formData, ...updates })
      toast.success(`Auto-populated: ${fieldsUpdated.join(', ')}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(formData)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Edit Medication</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            disabled={saving}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Medication Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Medication Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Brand Name
              </label>
              <input
                type="text"
                value={formData.brandName || ''}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Strength & Dosage Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Strength <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={formData.strength || ''}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                placeholder="e.g., 500 mg"
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Dosage Form <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={formData.dosageForm || ''}
                onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                placeholder="e.g., tablet, capsule"
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Dosage Instructions
            </label>
            <input
              type="text"
              value={formData.frequency || ''}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              placeholder="e.g., Take 1 tablet by mouth every day"
              className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Prescribed For & Doctor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Prescribed For
              </label>
              <input
                type="text"
                value={formData.prescribedFor || ''}
                onChange={(e) => setFormData({ ...formData, prescribedFor: e.target.value })}
                placeholder="e.g., Type 2 Diabetes"
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Prescribing Doctor
              </label>
              <input
                type="text"
                value={formData.prescribingDoctor || ''}
                onChange={(e) => setFormData({ ...formData, prescribingDoctor: e.target.value })}
                placeholder="e.g., Dr. Smith"
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Rx Number & Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Rx Number
              </label>
              <input
                type="text"
                value={formData.rxNumber || ''}
                onChange={(e) => setFormData({ ...formData, rxNumber: e.target.value })}
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Quantity
              </label>
              <input
                type="text"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="e.g., 30 tablets"
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Refills & Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Refills
              </label>
              <input
                type="text"
                value={formData.refills || ''}
                onChange={(e) => setFormData({ ...formData, refills: e.target.value })}
                placeholder="e.g., 3 refills"
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Fill Date
              </label>
              <input
                type="date"
                value={formData.fillDate?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, fillDate: e.target.value })}
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Expiration Date
              </label>
              <input
                type="date"
                value={formData.expirationDate?.split('T')[0] || ''}
                onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Pharmacy Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Pharmacy Name
              </label>
              <input
                type="text"
                value={formData.pharmacyName || ''}
                onChange={(e) => setFormData({ ...formData, pharmacyName: e.target.value })}
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Pharmacy Phone
              </label>
              <input
                type="tel"
                value={formData.pharmacyPhone || ''}
                onChange={(e) => setFormData({ ...formData, pharmacyPhone: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Image Management Section */}
          <div className="border-t border-border pt-4 mt-4">
            <MedicationImageManager
              images={formData.images || []}
              medicationId={medication.id}
              patientId={patientId}
              onImagesChange={(images) => setFormData({ ...formData, images })}
              onOCRComplete={handleOCRComplete}
              maxImages={10}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 border-2 border-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
