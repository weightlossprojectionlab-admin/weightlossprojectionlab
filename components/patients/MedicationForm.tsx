'use client'

import { useState } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import MedicationScanner from '@/components/health/MedicationScanner'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

interface MedicationFormProps {
  patientId: string
  onSuccess?: () => void
}

export function MedicationForm({ patientId, onSuccess }: MedicationFormProps) {
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // Manual entry fields
  const [name, setName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [strength, setStrength] = useState('')
  const [dosageForm, setDosageForm] = useState('tablet')
  const [frequency, setFrequency] = useState('')
  const [prescribedFor, setPrescribedFor] = useState('')
  const [notes, setNotes] = useState('')

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !strength.trim()) {
      toast.error('Medication name and strength are required')
      return
    }

    setLoading(true)

    try {
      await medicalOperations.medications.addMedication(patientId, {
        name: name.trim(),
        brandName: brandName.trim() || undefined,
        strength: strength.trim(),
        dosageForm,
        frequency: frequency.trim() || undefined,
        prescribedFor: prescribedFor.trim() || undefined,
        notes: notes.trim() || undefined
      })

      toast.success('Medication added successfully')

      // Reset form
      setName('')
      setBrandName('')
      setStrength('')
      setDosageForm('tablet')
      setFrequency('')
      setPrescribedFor('')
      setNotes('')

      onSuccess?.()
    } catch (error: any) {
      logger.error('[MedicationForm] Error adding medication', error)
      toast.error(error.message || 'Failed to add medication')
    } finally {
      setLoading(false)
    }
  }

  const handleScannedMedication = async (scannedData: any) => {
    try {
      // Initialize quantityRemaining from quantity if available
      const quantityRemaining = scannedData.quantity ? parseInt(scannedData.quantity) : undefined

      await medicalOperations.medications.addMedication(patientId, {
        name: scannedData.name,
        brandName: scannedData.brandName,
        strength: scannedData.strength,
        dosageForm: scannedData.dosageForm,
        frequency: scannedData.frequency,
        prescribedFor: scannedData.prescribedFor,
        prescribingDoctor: scannedData.prescribingDoctor, // Added prescribing doctor
        rxcui: scannedData.rxcui,
        ndc: scannedData.ndc,
        drugClass: scannedData.drugClass,
        rxNumber: scannedData.rxNumber,
        quantity: scannedData.quantity,
        quantityRemaining: quantityRemaining, // Initialize quantity remaining
        refills: scannedData.refills,
        fillDate: scannedData.fillDate,
        expirationDate: scannedData.expirationDate,
        warnings: scannedData.warnings,
        pharmacyName: scannedData.pharmacyName,
        pharmacyPhone: scannedData.pharmacyPhone,
        imageUrl: scannedData.imageUrl,
        photoUrl: scannedData.photoUrl,
        scannedAt: new Date().toISOString()
      })

      toast.success('Medication added from scan')
      setShowScanner(false)
      onSuccess?.()
    } catch (error: any) {
      logger.error('[MedicationForm] Error adding scanned medication', error)
      toast.error(error.message || 'Failed to add medication')
    }
  }

  if (showScanner) {
    return (
      <div>
        <button
          onClick={() => setShowScanner(false)}
          className="mb-4 text-sm text-primary hover:text-primary-dark"
        >
          ← Back to manual entry
        </button>
        <MedicationScanner
          isOpen={true}
          onMedicationScanned={handleScannedMedication}
          onClose={() => setShowScanner(false)}
        />
      </div>
    )
  }

  return (
    <div>
      {/* Scanner option */}
      <button
        onClick={() => setShowScanner(true)}
        className="w-full mb-4 px-4 py-3 bg-primary-light text-primary-dark rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Scan Medication Label
      </button>

      <div className="text-center text-sm text-muted-foreground mb-4">or enter manually</div>

      {/* Manual entry form */}
      <form onSubmit={handleManualSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Medication Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Metformin"
            required
            className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Brand Name (optional)
          </label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="e.g., Glucophage"
            className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Strength *
            </label>
            <input
              type="text"
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              placeholder="e.g., 500 mg"
              required
              className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Form
            </label>
            <select
              value={dosageForm}
              onChange={(e) => setDosageForm(e.target.value)}
              className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="tablet">Tablet</option>
              <option value="capsule">Capsule</option>
              <option value="liquid">Liquid</option>
              <option value="injection">Injection</option>
              <option value="cream">Cream</option>
              <option value="gel">Gel</option>
              <option value="patch">Patch</option>
              <option value="inhaler">Inhaler</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Dosage Instructions
          </label>
          <input
            type="text"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="e.g., Take 1 tablet twice daily with meals"
            className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Prescribed For
          </label>
          <input
            type="text"
            value={prescribedFor}
            onChange={(e) => setPrescribedFor(e.target.value)}
            placeholder="e.g., Type 2 Diabetes"
            className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes or instructions"
            rows={3}
            className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Adding...' : 'Add Medication'}
        </button>
      </form>
    </div>
  )
}
