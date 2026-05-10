'use client'

/**
 * ImmunizationForm — add-only modal for recording a vaccine.
 *
 * Phase B of the medical-binder gap close. Edit-in-place isn't
 * surfaced for v1; immunizations are historical records, and the
 * common operation is "add what happened" not "fix what was
 * entered." If a user wants to correct a record, they delete and
 * re-add. (Delete affordance lives on the card itself.)
 *
 * Submit calls medicalOperations.immunizations.createImmunization
 * which posts to /api/patients/[patientId]/immunizations.
 */

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface ImmunizationFormProps {
  patientId: string
  patientName: string
  onClose: () => void
  onSubmit: (data: {
    vaccineName: string
    administeredAt: string
    doseNumber?: number
    lotNumber?: string
    administeredBy?: string
    nextDueAt?: string
    notes?: string
  }) => Promise<void>
}

export default function ImmunizationForm({
  patientId: _patientId,
  patientName,
  onClose,
  onSubmit,
}: ImmunizationFormProps) {
  const [vaccineName, setVaccineName] = useState('')
  const [administeredAt, setAdministeredAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [doseNumber, setDoseNumber] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [administeredBy, setAdministeredBy] = useState('')
  const [nextDueAt, setNextDueAt] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vaccineName.trim()) {
      toast.error('Vaccine name is required')
      return
    }
    if (!administeredAt) {
      toast.error('Date administered is required')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        vaccineName: vaccineName.trim(),
        administeredAt,
        doseNumber: doseNumber ? parseInt(doseNumber, 10) : undefined,
        lotNumber: lotNumber.trim() || undefined,
        administeredBy: administeredBy.trim() || undefined,
        nextDueAt: nextDueAt || undefined,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (error) {
      console.error('[ImmunizationForm] Save failed', error)
      toast.error('Could not save — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Add Immunization</h2>
            <p className="text-sm text-muted-foreground mt-1">for {patientName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="vaccineName" className="block text-sm font-medium text-foreground mb-2">
              Vaccine *
            </label>
            <input
              id="vaccineName"
              type="text"
              value={vaccineName}
              onChange={(e) => setVaccineName(e.target.value)}
              placeholder="e.g. Tetanus, MMR, Influenza, COVID-19"
              required
              autoFocus
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="administeredAt" className="block text-sm font-medium text-foreground mb-2">
              Date administered *
            </label>
            <input
              id="administeredAt"
              type="date"
              value={administeredAt}
              onChange={(e) => setAdministeredAt(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              required
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="doseNumber" className="block text-sm font-medium text-foreground mb-2">
                Dose # <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="doseNumber"
                type="number"
                min="1"
                value={doseNumber}
                onChange={(e) => setDoseNumber(e.target.value)}
                placeholder="e.g. 2"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="lotNumber" className="block text-sm font-medium text-foreground mb-2">
                Lot # <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="lotNumber"
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="From the vial"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="administeredBy" className="block text-sm font-medium text-foreground mb-2">
              Administered by <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="administeredBy"
              type="text"
              value={administeredBy}
              onChange={(e) => setAdministeredBy(e.target.value)}
              placeholder="Clinic, pharmacy, or provider"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="nextDueAt" className="block text-sm font-medium text-foreground mb-2">
              Next dose due <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="nextDueAt"
              type="date"
              value={nextDueAt}
              onChange={(e) => setNextDueAt(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground mt-1">
              We'll surface this on the card so you remember when the booster is due.
            </p>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Reactions, special handling, etc."
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-background transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-write="true"
              disabled={saving || !vaccineName.trim() || !administeredAt}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
