'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUserProfile } from '@/hooks/useUserProfile'
import { weightLogOperations } from '@/lib/firebase-operations'
import { medicalOperations } from '@/lib/medical-operations'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import type { PatientProfile } from '@/types/medical'

interface QuickWeightLogModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  patientId?: string | null  // Optional patient ID for patient-specific logging
}

export function QuickWeightLogModal({ isOpen, onClose, onSuccess, patientId }: QuickWeightLogModalProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [patient, setPatient] = useState<PatientProfile | null>(null)

  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState<'lbs' | 'kg'>(profile?.preferences?.units === 'metric' ? 'kg' : 'lbs')
  const [logDate, setLogDate] = useState(() => {
    // Default to today in YYYY-MM-DD format
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)

  // Fetch patient details if patientId is provided
  useEffect(() => {
    if (patientId) {
      medicalOperations.patients.getPatient(patientId)
        .then(setPatient)
        .catch((error) => {
          logger.error('Failed to fetch patient for weight modal', error)
          setPatient(null)
        })
    } else {
      setPatient(null)
    }
  }, [patientId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('You must be logged in to log weight')
      return
    }

    const weightValue = parseFloat(weight)

    if (!weight || weightValue <= 0) {
      toast.error('Please enter a valid weight')
      return
    }

    // Validate weight range (50-500 lbs or 23-227 kg)
    const minWeight = unit === 'lbs' ? 50 : 23
    const maxWeight = unit === 'lbs' ? 500 : 227

    if (weightValue < minWeight || weightValue > maxWeight) {
      toast.error(`Please enter a weight between ${minWeight} and ${maxWeight} ${unit}`)
      return
    }

    // Validate date (no future dates)
    const selectedDate = new Date(logDate)
    const today = new Date()
    today.setHours(23, 59, 59, 999) // End of today

    if (selectedDate > today) {
      toast.error('Cannot log weight for future dates')
      return
    }

    setLoading(true)

    try {
      // Parse date string as local date, not UTC
      const [year, month, day] = logDate.split('-').map(Number)
      const logDateTime = new Date(year, month - 1, day, 12, 0, 0, 0) // Local noon

      // Use patient-specific API if patientId is provided, otherwise use user's weight log
      if (patientId) {
        await medicalOperations.weightLogs.logWeight(patientId, {
          weight: parseFloat(weight),
          unit,
          loggedAt: logDateTime.toISOString(),
          source: 'manual',
          tags: []
        })
      } else {
        await weightLogOperations.createWeightLog({
          weight: parseFloat(weight),
          unit,
          dataSource: 'manual',
          loggedAt: logDateTime.toISOString()
        })
      }

      logger.info('Weight logged successfully via quick modal', { weight: parseFloat(weight), unit, date: logDate, patientId })
      toast.success(`⚖️ Weight logged: ${weight} ${unit}`)

      // Reset form
      setWeight('')
      setLogDate(new Date().toISOString().split('T')[0]) // Reset to today

      // Close modal and trigger callback
      onClose()
      onSuccess?.()
    } catch (error) {
      logger.error('Error logging weight', error as Error)
      toast.error('Failed to log weight. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Quick Weight Log</h2>
            {patient && (
              <p className="text-sm text-muted-foreground mt-1">
                for <span className="font-medium text-foreground">{patient.name}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Input */}
          <div>
            <label htmlFor="quick-logDate" className="block text-sm font-medium text-foreground mb-2">
              Date
            </label>
            <input
              type="date"
              id="quick-logDate"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-background text-foreground"
              required
            />
            <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
              When was this weight measured?
            </p>
          </div>

          {/* Weight Input */}
          <div>
            <label htmlFor="quick-weight" className="block text-sm font-medium text-foreground mb-2">
              Weight
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                id="quick-weight"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                step="0.1"
                min="0"
                placeholder={`Enter weight in ${unit}`}
                className="flex-1 px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-background text-foreground"
                required
                autoFocus
              />

              {/* Unit Toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setUnit('lbs')}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${
                    unit === 'lbs'
                      ? 'bg-primary text-white'
                      : 'bg-background text-foreground hover:bg-background'
                  }`}
                >
                  lbs
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('kg')}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-l border-border ${
                    unit === 'kg'
                      ? 'bg-primary text-white'
                      : 'bg-background text-foreground hover:bg-background'
                  }`}
                >
                  kg
                </button>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-background transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !weight || parseFloat(weight) <= 0}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Logging...' : 'Log Weight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
