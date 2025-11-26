'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useUserProfile } from '@/hooks/useUserProfile'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { weightLogOperations } from '@/lib/firebase-operations'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

export default function LogWeightPage() {
  return (
    <AuthGuard>
      <LogWeightContent />
    </AuthGuard>
  )
}

function LogWeightContent() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile } = useUserProfile()

  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState<'lbs' | 'kg'>(profile?.preferences?.units === 'metric' ? 'kg' : 'lbs')
  const [notes, setNotes] = useState('')
  const [logDate, setLogDate] = useState(() => {
    // Default to today in YYYY-MM-DD format
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [loading, setLoading] = useState(false)

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

      await weightLogOperations.createWeightLog({
        weight: parseFloat(weight),
        unit,
        notes: notes || undefined,
        dataSource: 'manual',
        loggedAt: logDateTime.toISOString()
      })

      logger.info('Weight logged successfully', { weight: parseFloat(weight), unit, date: logDate })
      toast.success(`Weight logged: ${weight} ${unit}`)

      // Reset form
      setWeight('')
      setNotes('')
      setLogDate(new Date().toISOString().split('T')[0]) // Reset to today

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    } catch (error) {
      logger.error('Error logging weight', error as Error)
      toast.error('Failed to log weight. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Log Weight"
        subtitle="Track your weight progress"
        actions={
          <a
            href="/weight-history"
            className="px-4 py-2 bg-primary-light text-primary-dark rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
          >
            View History
          </a>
        }
      />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-card rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Input */}
            <div>
              <label htmlFor="logDate" className="block text-sm font-medium text-foreground mb-2">
                Date
              </label>
              <input
                type="date"
                id="logDate"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-background text-foreground"
                required
              />
              <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                When was this weight measured? Defaults to today.
              </p>
            </div>

            {/* Weight Input */}
            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-foreground mb-2">
                Weight
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  id="weight"
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

            {/* Notes (Optional) */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="How are you feeling? Any observations?"
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent bg-background text-foreground"
              />
            </div>

            {/* Info Box */}
            <div className="bg-primary-light border border-primary-light rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="text-sm text-foreground">
                  <p className="font-medium mb-1">Best practices for accurate tracking:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Weigh yourself at the same time each day (morning is best)</li>
                    <li>Use the same scale for consistency</li>
                    <li>Weigh yourself before eating or drinking</li>
                    <li>Don't worry about daily fluctuations - focus on trends</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-border rounded-lg text-foreground hover:bg-background transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !weight || parseFloat(weight) <= 0}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Logging...' : 'Log Weight'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
