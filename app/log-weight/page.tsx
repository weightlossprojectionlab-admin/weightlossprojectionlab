'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { weightLogOperations } from '@/lib/firebase-operations'

function LogWeightContent() {
  const [weight, setWeight] = useState('')
  const [unit, setUnit] = useState<'kg' | 'lbs'>('lbs')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!weight) {
      alert('Please enter your weight')
      return
    }

    setLoading(true)

    try {
      // Save to Firebase using real API
      const response = await weightLogOperations.createWeightLog({
        weight: parseFloat(weight),
        unit,
        notes: notes || undefined,
        loggedAt: new Date().toISOString()
      })

      console.log('Weight logged successfully:', response.data)
      alert('Weight logged successfully!')

      // Reset form
      setWeight('')
      setNotes('')

    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save weight. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const convertWeight = (value: string, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs') => {
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return ''

    if (fromUnit === toUnit) return value

    if (fromUnit === 'lbs' && toUnit === 'kg') {
      return (numValue * 0.453592).toFixed(1)
    } else if (fromUnit === 'kg' && toUnit === 'lbs') {
      return (numValue * 2.20462).toFixed(1)
    }

    return value
  }

  const handleUnitChange = (newUnit: 'kg' | 'lbs') => {
    if (weight) {
      const convertedWeight = convertWeight(weight, unit, newUnit)
      setWeight(convertedWeight)
    }
    setUnit(newUnit)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-indigo-600 hover:text-indigo-500"
              aria-label="Back to dashboard"
            >
              ← Back
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Log Weight</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6">
        {/* Weight Entry Form */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Weight Input */}
            <div className="space-y-2">
              <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
                Current Weight
              </label>
              <div className="relative">
                <input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1000"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="form-input pr-16 text-lg font-semibold"
                  placeholder="0.0"
                  aria-label="Enter your current weight"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center">
                  <div className="flex bg-gray-100 rounded-r-md">
                    <button
                      type="button"
                      onClick={() => handleUnitChange('lbs')}
                      className={`px-3 py-2 text-sm font-medium transition-colors ${
                        unit === 'lbs'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                      aria-label="Select pounds"
                    >
                      lbs
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnitChange('kg')}
                      className={`px-3 py-2 text-sm font-medium transition-colors rounded-r-md ${
                        unit === 'kg'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                      aria-label="Select kilograms"
                    >
                      kg
                    </button>
                  </div>
                </div>
              </div>

              {/* Weight Conversion Helper */}
              {weight && (
                <p className="text-sm text-gray-500">
                  That's approximately {convertWeight(weight, unit, unit === 'kg' ? 'lbs' : 'kg')} {unit === 'kg' ? 'lbs' : 'kg'}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-input resize-none"
                rows={3}
                placeholder="How are you feeling? Any observations about your progress?"
                aria-label="Optional notes about your weight entry"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !weight}
              className="btn btn-primary w-full text-lg"
              aria-label="Save weight entry"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  <span>Saving...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <span role="img" aria-label="scale">⚖️</span>
                  <span>Log Weight</span>
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Weigh-in Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Weigh yourself at the same time each day</li>
            <li>• Use the bathroom before weighing</li>
            <li>• Wear similar clothing each time</li>
            <li>• Focus on weekly trends, not daily fluctuations</li>
          </ul>
        </div>

        {/* Recent Entries Preview */}
        <div className="mt-6 bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Entries</h3>
          <div className="space-y-3">
            {/* Mock recent entries - replace with real data */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="font-medium">164.2 lbs</p>
                <p className="text-sm text-gray-500">Yesterday</p>
              </div>
              <span className="text-sm text-green-600">-0.8 lbs</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="font-medium">165.0 lbs</p>
                <p className="text-sm text-gray-500">2 days ago</p>
              </div>
              <span className="text-sm text-red-600">+0.3 lbs</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">164.7 lbs</p>
                <p className="text-sm text-gray-500">3 days ago</p>
              </div>
              <span className="text-sm text-green-600">-1.2 lbs</span>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center mt-4 text-sm text-indigo-600 hover:text-indigo-500"
            aria-label="View full weight history"
          >
            View full history →
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function LogWeightPage() {
  return (
    <AuthGuard>
      <LogWeightContent />
    </AuthGuard>
  )
}