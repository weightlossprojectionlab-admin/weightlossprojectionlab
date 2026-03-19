'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useVitals } from '@/hooks/useVitals'
import { PatientProfile } from '@/types/medical'
import { capitalizeName } from '@/lib/utils'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

export interface QuickWeightModalProps {
  patient: PatientProfile
  onClose: () => void
  onSuccess: () => void
}

export function QuickWeightModal({ patient, onClose, onSuccess }: QuickWeightModalProps) {
  const { user } = useAuth()
  const { logVital } = useVitals({ patientId: patient.id })
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg' | 'g'>(
    patient.species && ['Hamster', 'Guinea Pig', 'Bird'].includes(patient.species) ? 'g' : 'lbs'
  )
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

      // Save weight as a vital using the hook
      const vitalData = {
        type: 'weight' as const,
        value: weightValue,
        unit: weightUnit,
        recordedAt: new Date().toISOString(),
        method: 'manual' as const
      }

      await logVital(vitalData)
      toast.success('Weight saved successfully!')
      onSuccess()
    } catch (error: unknown) {
      logger.error('[QuickWeightModal] Error saving weight', error instanceof Error ? error : new Error(String(error)))
      toast.error('Failed to save weight')
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
                onChange={(e) => setWeightUnit(e.target.value as 'lbs' | 'kg' | 'g')}
                className="px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
              >
                {patient.species && ['Hamster', 'Guinea Pig', 'Bird'].includes(patient.species) ? (
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
