'use client'

import { useState } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import toast from 'react-hot-toast'

interface StepLogFormProps {
  patientId: string
  onSuccess?: () => void
}

export function StepLogForm({ patientId, onSuccess }: StepLogFormProps) {
  const [steps, setSteps] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [distance, setDistance] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!steps || parseInt(steps) < 0) {
      toast.error('Please enter a valid step count')
      return
    }

    try {
      setLoading(true)
      await medicalOperations.stepLogs.logSteps(patientId, {
        steps: parseInt(steps),
        date,
        distance: distance ? parseFloat(distance) : undefined,
        source: 'manual'
      })

      toast.success('Steps logged successfully')
      setSteps('')
      setDistance('')
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || 'Failed to log steps')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-foreground mb-1">
          Date *
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          required
        />
      </div>

      <div>
        <label htmlFor="steps" className="block text-sm font-medium text-foreground mb-1">
          Steps *
        </label>
        <input
          id="steps"
          type="number"
          step="1"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="e.g., 10000"
          required
        />
      </div>

      <div>
        <label htmlFor="distance" className="block text-sm font-medium text-foreground mb-1">
          Distance (km, optional)
        </label>
        <input
          id="distance"
          type="number"
          step="0.1"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="e.g., 8.5"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? 'Logging...' : 'Log Steps'}
      </button>
    </form>
  )
}
