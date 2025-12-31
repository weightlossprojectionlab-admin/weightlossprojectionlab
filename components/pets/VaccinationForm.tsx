/**
 * VaccinationForm Component
 * Form for adding/editing vaccination records for pets
 */

'use client'

import { useState, useEffect } from 'react'
import { VaccinationRecord, SPECIES_VACCINES, VaccineType } from '@/types/pet-vaccinations'
import { logger } from '@/lib/logger'

interface VaccinationFormProps {
  species: string
  petName: string
  onSubmit: (data: Partial<VaccinationRecord>) => Promise<void>
  onCancel: () => void
  initialData?: Partial<VaccinationRecord>
}

export function VaccinationForm({ species, petName, onSubmit, onCancel, initialData }: VaccinationFormProps) {
  const [formData, setFormData] = useState({
    vaccineName: initialData?.vaccineName || '',
    vaccineType: initialData?.vaccineType || ('' as VaccineType),
    administeredDate: initialData?.administeredDate || new Date().toISOString().split('T')[0],
    expirationDate: initialData?.expirationDate || '',
    nextDueDate: initialData?.nextDueDate || '',
    batchNumber: initialData?.batchNumber || '',
    administeredBy: initialData?.administeredBy || '',
    administeredAt: initialData?.administeredAt || '',
    reactions: initialData?.reactions || '',
    notes: initialData?.notes || ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Get species-specific vaccine options
  const speciesVaccines = SPECIES_VACCINES[species as keyof typeof SPECIES_VACCINES] || SPECIES_VACCINES.Other

  // Auto-calculate next due date based on vaccine type
  useEffect(() => {
    if (formData.administeredDate && formData.vaccineType) {
      const administered = new Date(formData.administeredDate)
      let durationYears = 1 // Default

      // Species-specific durations
      const vaccineInfo = speciesVaccines.find(v => v.name === formData.vaccineType)
      if (vaccineInfo) {
        durationYears = vaccineInfo.frequencyYears
      }

      const nextDue = new Date(administered)
      nextDue.setFullYear(nextDue.getFullYear() + durationYears)

      setFormData(prev => ({
        ...prev,
        nextDueDate: nextDue.toISOString().split('T')[0]
      }))
    }
  }, [formData.administeredDate, formData.vaccineType, speciesVaccines])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validation
      if (!formData.vaccineName && !formData.vaccineType) {
        throw new Error('Vaccine name or type is required')
      }
      if (!formData.administeredDate) {
        throw new Error('Administration date is required')
      }

      const submitData: Partial<VaccinationRecord> = {
        vaccineName: formData.vaccineName || formData.vaccineType,
        vaccineType: formData.vaccineType || undefined,
        administeredDate: formData.administeredDate,
        expirationDate: formData.expirationDate || undefined,
        nextDueDate: formData.nextDueDate || undefined,
        batchNumber: formData.batchNumber || undefined,
        administeredBy: formData.administeredBy || undefined,
        administeredAt: formData.administeredAt || undefined,
        reactions: formData.reactions || undefined,
        notes: formData.notes || undefined
      }

      await onSubmit(submitData)
    } catch (err: any) {
      logger.error('[VaccinationForm] Submission error:', err)
      setError(err.message || 'Failed to save vaccination record')
    } finally {
      setLoading(false)
    }
  }

  // Check if this species typically doesn't require vaccinations
  const noVaccinesNeeded = speciesVaccines.length === 1 &&
                          speciesVaccines[0].name === 'other' &&
                          speciesVaccines[0].description.toLowerCase().includes('typically do not require')

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* No Vaccinations Needed Message */}
      {noVaccinesNeeded && (
        <div className="p-4 bg-info/10 border border-info/30 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="text-sm font-semibold text-info">No Routine Vaccinations Required for {petName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {speciesVaccines[0].description}. However, you can still add custom vaccination records for {petName} if needed for special circumstances.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vaccine Type Selection */}
      {!noVaccinesNeeded && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Vaccine Type <span className="text-error">*</span>
          </label>
          <select
          value={formData.vaccineType}
          onChange={(e) => {
            const selectedType = e.target.value as VaccineType
            const selectedVaccine = speciesVaccines.find(v => v.name === selectedType)
            setFormData(prev => ({
              ...prev,
              vaccineType: selectedType,
              vaccineName: selectedVaccine?.name || selectedType
            }))
          }}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
        >
          <option value="">Select a vaccine...</option>
          {speciesVaccines.map(vaccine => (
            <option key={vaccine.name} value={vaccine.name}>
              {vaccine.name} - {vaccine.description}
            </option>
          ))}
          <option value="Other">Other (Custom)</option>
        </select>
        </div>
      )}

      {/* Custom Vaccine Name (if Other selected) */}
      {formData.vaccineType === 'Other' && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Custom Vaccine Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={formData.vaccineName}
            onChange={(e) => setFormData(prev => ({ ...prev, vaccineName: e.target.value }))}
            placeholder="Enter vaccine name"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
      )}

      {/* Only show form fields if there are actual vaccines OR if user wants to add custom */}
      {(!noVaccinesNeeded || formData.vaccineType === 'Other') && (
        <>
      {/* Administered Date */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Date Administered <span className="text-error">*</span>
        </label>
        <input
          type="date"
          value={formData.administeredDate}
          onChange={(e) => setFormData(prev => ({ ...prev, administeredDate: e.target.value }))}
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </div>

      {/* Next Due Date */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Next Due Date
        </label>
        <input
          type="date"
          value={formData.nextDueDate}
          onChange={(e) => setFormData(prev => ({ ...prev, nextDueDate: e.target.value }))}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Auto-calculated based on vaccine type. You can adjust if needed.
        </p>
      </div>

      {/* Administered By */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Administered By
        </label>
        <input
          type="text"
          value={formData.administeredBy}
          onChange={(e) => setFormData(prev => ({ ...prev, administeredBy: e.target.value }))}
          placeholder="Veterinarian or clinic name"
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Administered At */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Location/Clinic
        </label>
        <input
          type="text"
          value={formData.administeredAt}
          onChange={(e) => setFormData(prev => ({ ...prev, administeredAt: e.target.value }))}
          placeholder="Clinic or location name"
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Batch Number */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Batch/Lot Number
        </label>
        <input
          type="text"
          value={formData.batchNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, batchNumber: e.target.value }))}
          placeholder="Vaccine batch number"
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Reactions */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Reactions/Side Effects
        </label>
        <textarea
          value={formData.reactions}
          onChange={(e) => setFormData(prev => ({ ...prev, reactions: e.target.value }))}
          placeholder="Any reactions or side effects observed..."
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes..."
          rows={2}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>
      </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? 'Saving...' : initialData ? 'Update Record' : 'Add Record'}
        </button>
      </div>
    </form>
  )
}
