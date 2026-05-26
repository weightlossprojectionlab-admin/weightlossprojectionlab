'use client'

import { useState } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import toast from 'react-hot-toast'

interface WeightLogFormProps {
  patientId: string
  onSuccess?: () => void
}

export function WeightLogForm({ patientId, onSuccess }: WeightLogFormProps) {
  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!weight || parseFloat(weight) <= 0) {
      toast.error('Please enter a valid weight')
      return
    }

    try {
      setLoading(true)
      // Canonical weight-log path: writes to users/[owner]/weightLogs,
      // sets goals.startWeight on first ever log, caches currentWeight
      // on the profile. The vitals API rejects weight type now — every
      // weight surface goes through this one helper.
      await medicalOperations.weightLogs.logWeight(patientId, {
        weight: parseFloat(weight),
        unit,
        loggedAt: new Date().toISOString(),
        source: 'manual',
        tags: [],
        ...(notes ? { notes } : {}),
      })

      toast.success('Weight logged successfully')
      setWeight('')
      setNotes('')
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || 'Failed to log weight')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="weight" className="block text-sm font-medium text-foreground mb-1">
            Weight *
          </label>
          <input
            id="weight"
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder=""
            required
          />
        </div>

        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-foreground mb-1">
            Unit *
          </label>
          <select
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value as 'lbs' | 'kg')}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Any notes about this weight..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? 'Logging...' : 'Log Weight'}
      </button>
    </form>
  )
}
