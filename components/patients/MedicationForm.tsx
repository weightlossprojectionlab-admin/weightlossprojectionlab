'use client'

import { useState } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import { DocumentReader } from '@/components/medications/DocumentReader'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

interface MedicationFormProps {
  patientId: string
  onSuccess?: () => void
}

export function MedicationForm({ patientId, onSuccess }: MedicationFormProps) {
  const [loading, setLoading] = useState(false)
  const [showDocumentReader, setShowDocumentReader] = useState(false)

  // Debug: Log patientId on mount and when it changes
  console.log('🔍 [MedicationForm] patientId =', patientId)
  logger.info('[MedicationForm] Component rendered', {
    patientId: patientId,
    patientIdType: typeof patientId,
    patientIdValue: JSON.stringify(patientId),
    patientIdLength: patientId?.length
  })

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


  return (
    <>
      <div>
        {/* Scanner option */}
        <button
          onClick={() => setShowDocumentReader(true)}
          className="w-full mb-4 px-4 py-3 bg-primary-light text-primary-dark rounded-lg hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

      {/* Document Reader Modal */}
      <DocumentReader
        isOpen={showDocumentReader}
        onClose={() => setShowDocumentReader(false)}
        onSuccess={() => {
          logger.info('[MedicationForm] Medication saved successfully from review modal')
          setShowDocumentReader(false)
          onSuccess?.()
        }}
        patientId={patientId}
      />
    </>
  )
}
