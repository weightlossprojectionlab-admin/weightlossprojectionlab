'use client'

/**
 * FamilyHistoryForm — add-only modal for recording a relative's
 * health condition (mother had heart disease at 55, etc.).
 *
 * Phase D of the medical-binder gap close. Mirrors the
 * ImmunizationForm and MedicalEquipmentForm shape. Required:
 * relationship + condition. Everything else optional — patients
 * often don't know specifics.
 */

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { FamilyRelationship } from '@/types/medical'

interface FamilyHistoryFormProps {
  patientId: string
  patientName: string
  onClose: () => void
  onSubmit: (data: {
    relativeRelationship: FamilyRelationship
    condition: string
    ageOfOnset?: number
    isLiving?: boolean
    causeOfDeath?: string
    notes?: string
  }) => Promise<void>
}

const RELATIONSHIP_OPTIONS: Array<{ value: FamilyRelationship; label: string }> = [
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'maternal_grandparent', label: 'Maternal grandparent' },
  { value: 'paternal_grandparent', label: 'Paternal grandparent' },
  { value: 'aunt_uncle', label: 'Aunt / Uncle' },
  { value: 'child', label: 'Child' },
  { value: 'other', label: 'Other relative' },
]

export default function FamilyHistoryForm({
  patientId: _patientId,
  patientName,
  onClose,
  onSubmit,
}: FamilyHistoryFormProps) {
  const [relativeRelationship, setRelativeRelationship] = useState<FamilyRelationship>('mother')
  const [condition, setCondition] = useState('')
  const [ageOfOnset, setAgeOfOnset] = useState('')
  const [livingStatus, setLivingStatus] = useState<'unknown' | 'living' | 'deceased'>('unknown')
  const [causeOfDeath, setCauseOfDeath] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!condition.trim()) {
      toast.error('Condition is required')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        relativeRelationship,
        condition: condition.trim(),
        ageOfOnset: ageOfOnset ? parseInt(ageOfOnset, 10) : undefined,
        isLiving: livingStatus === 'unknown' ? undefined : livingStatus === 'living',
        causeOfDeath: livingStatus === 'deceased' && causeOfDeath.trim() ? causeOfDeath.trim() : undefined,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (error) {
      console.error('[FamilyHistoryForm] Save failed', error)
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
            <h2 className="text-xl font-bold text-foreground">Add Family History</h2>
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
            <label htmlFor="relativeRelationship" className="block text-sm font-medium text-foreground mb-2">
              Relative *
            </label>
            <select
              id="relativeRelationship"
              value={relativeRelationship}
              onChange={(e) => setRelativeRelationship(e.target.value as FamilyRelationship)}
              required
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="condition" className="block text-sm font-medium text-foreground mb-2">
              Condition *
            </label>
            <input
              id="condition"
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g. Heart disease, type 2 diabetes, breast cancer"
              required
              autoFocus
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="ageOfOnset" className="block text-sm font-medium text-foreground mb-2">
              Age of onset <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="ageOfOnset"
              type="number"
              min="0"
              max="150"
              value={ageOfOnset}
              onChange={(e) => setAgeOfOnset(e.target.value)}
              placeholder="e.g. 55"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Early-onset matters for risk — record it if known.
            </p>
          </div>

          <div>
            <label htmlFor="livingStatus" className="block text-sm font-medium text-foreground mb-2">
              Living status <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <select
              id="livingStatus"
              value={livingStatus}
              onChange={(e) => setLivingStatus(e.target.value as 'unknown' | 'living' | 'deceased')}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="unknown">Don't know</option>
              <option value="living">Living</option>
              <option value="deceased">Deceased</option>
            </select>
          </div>

          {livingStatus === 'deceased' && (
            <div>
              <label htmlFor="causeOfDeath" className="block text-sm font-medium text-foreground mb-2">
                Cause of death <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="causeOfDeath"
                type="text"
                value={causeOfDeath}
                onChange={(e) => setCauseOfDeath(e.target.value)}
                placeholder="May differ from the condition above"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Specifics, treatments, family-line patterns"
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
              disabled={saving || !condition.trim()}
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
