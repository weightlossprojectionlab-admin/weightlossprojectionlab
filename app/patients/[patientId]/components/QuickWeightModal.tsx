'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { medicalOperations } from '@/lib/medical-operations'
import { PatientProfile } from '@/types/medical'
import { capitalizeName } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { getHumanLifeStage, getDefaultWeightUnit } from '@/lib/life-stage-utils'
import toast from 'react-hot-toast'

export interface QuickWeightModalProps {
  patient: PatientProfile
  onClose: () => void
  onSuccess: () => void
}

export function QuickWeightModal({ patient, onClose, onSuccess }: QuickWeightModalProps) {
  const { user } = useAuth()
  const [weight, setWeight] = useState('')

  const isNewbornOrInfant = patient.type === 'human' && patient.dateOfBirth
    ? (['newborn', 'infant'] as const).includes(getHumanLifeStage(patient.dateOfBirth).stage as 'newborn' | 'infant')
    : false

  const defaultUnit: 'lbs' | 'kg' | 'oz' | 'g' = patient.type === 'human' && patient.dateOfBirth
    ? getDefaultWeightUnit(patient.dateOfBirth, 'human')
    : patient.species && ['Hamster', 'Guinea Pig', 'Bird'].includes(patient.species) ? 'g' : 'lbs'

  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg' | 'oz' | 'g'>(defaultUnit)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const weightValue = parseFloat(weight)
    if (!weightValue || weightValue <= 0) {
      toast.error('Please enter a valid weight')
      return
    }

    setSaving(true)
    try {
      if (!user) throw new Error('Not authenticated')

      // Weight must be logged via the canonical weight-logs API, not the
      // vitals API (the server rejects type:'weight' vitals). weight-logs also
      // sets the startWeight baseline on the first log. It tracks progress in
      // lbs/kg, so convert oz→lbs and g→kg (this modal offers oz/g for newborns
      // + small pets) to keep the unit type-correct and the charts consistent.
      let logValue = weightValue
      let logUnit: 'lbs' | 'kg'
      if (weightUnit === 'oz') {
        logValue = weightValue / 16
        logUnit = 'lbs'
      } else if (weightUnit === 'g') {
        logValue = weightValue / 1000
        logUnit = 'kg'
      } else {
        logUnit = weightUnit
      }

      await medicalOperations.weightLogs.logWeight(patient.id, {
        weight: logValue,
        unit: logUnit,
        loggedAt: new Date().toISOString(),
        source: 'manual',
        tags: []
      })
      toast.success('Weight saved successfully!')
      onSuccess()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('[QuickWeightModal] Error saving weight', error instanceof Error ? error : new Error(msg))
      // Show user-friendly message for duplicate entries
      if (msg.includes('already exists')) {
        toast.error('A weight entry already exists for today. Edit the existing entry instead.')
      } else {
        toast.error(msg || 'Failed to save weight')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-semibold mb-2">Add {capitalizeName(patient.name)}'s Weight</h3>
        <p className="text-sm text-muted-foreground mb-6">
          To retrieve the starting weight, we need at least one weight measurement.
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Weight *</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.0"
                className="flex-1 px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
                autoFocus
              />
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value as 'lbs' | 'kg' | 'oz' | 'g')}
                className="px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
              >
                {isNewbornOrInfant ? (
                  <>
                    <option value="oz">oz</option>
                    <option value="lbs">lbs</option>
                  </>
                ) : patient.species && ['Hamster', 'Guinea Pig', 'Bird'].includes(patient.species) ? (
                  <>
                    <option value="g">grams</option>
                    <option value="kg">kg</option>
                  </>
                ) : (
                  <>
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !weight}
            className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Weight'}
          </button>
        </div>
      </div>
    </div>
  )
}
