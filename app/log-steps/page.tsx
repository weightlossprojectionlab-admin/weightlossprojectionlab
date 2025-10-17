'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { stepLogOperations, formatters } from '@/lib/firebase-operations'

function LogStepsContent() {
  const [steps, setSteps] = useState('')
  const [autoDetected, setAutoDetected] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [pedometer, setPedometer] = useState<any>(null)

  // Try to access device pedometer on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      // Check for permissions and pedometer support
      checkPedometerSupport()
    }
  }, [])

  const checkPedometerSupport = async () => {
    try {
      // Check if we can access device motion
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission()
        if (permission === 'granted') {
          // Device motion is available
          startStepDetection()
        }
      } else if ('DeviceMotionEvent' in window) {
        // Android or older iOS - motion events available without permission
        startStepDetection()
      }
    } catch (error) {
      console.log('Pedometer not available:', error)
    }
  }

  const startStepDetection = () => {
    // Simplified step detection - in real app, you'd use a proper library
    const handleMotion = (event: DeviceMotionEvent) => {
      // This is a very basic implementation
      // Real step detection would need more sophisticated algorithms
      try {
        // Check for acceleration data with null safety
        const acceleration = event.acceleration || event.accelerationIncludingGravity
        if (acceleration && acceleration.x !== null && acceleration.y !== null && acceleration.z !== null) {
          const magnitude = Math.sqrt(
            Math.pow(acceleration.x || 0, 2) +
            Math.pow(acceleration.y || 0, 2) +
            Math.pow(acceleration.z || 0, 2)
          )

          // Very basic step detection threshold
          if (magnitude > 12) {
            setAutoDetected(prev => (prev || 0) + 1)
          }
        }
      } catch (error) {
        console.log('Motion detection error:', error)
        // Silently handle motion detection errors
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    setPedometer(handleMotion)

    // Simulate getting steps from health data
    setTimeout(() => {
      setAutoDetected(8420) // Mock step count
    }, 2000)
  }

  const syncWithHealthApp = async () => {
    setLoading(true)

    try {
      // TODO: Implement HealthKit (iOS) or Google Fit (Android) integration
      console.log('Syncing with health app...')

      // Simulate health app sync
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Mock synced step count
      const syncedSteps = Math.floor(Math.random() * 3000) + 7000
      setSteps(syncedSteps.toString())
      setAutoDetected(syncedSteps)

    } catch (error) {
      console.error('Health sync error:', error)
      alert('Unable to sync with health app. Please enter manually.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!steps) {
      alert('Please enter your step count')
      return
    }

    setLoading(true)

    try {
      // Save to Firebase using real API
      const response = await stepLogOperations.createStepLog({
        steps: parseInt(steps),
        date: formatters.formatDate(new Date()),
        source: autoDetected ? 'device' : 'manual',
        loggedAt: new Date().toISOString()
      })

      console.log('Steps logged successfully:', response.data)
      alert('Steps logged successfully!')

      // Reset form
      setSteps('')
      setAutoDetected(null)

    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save steps. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const goalSteps = 10000
  const currentSteps = parseInt(steps) || autoDetected || 0
  const progressPercentage = Math.min((currentSteps / goalSteps) * 100, 100)

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
            <h1 className="text-xl font-semibold text-gray-900">Log Steps</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Auto Detection Card */}
        {autoDetected && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl" role="img" aria-label="footprints">👣</span>
              <div>
                <p className="font-medium text-green-900">
                  {autoDetected.toLocaleString()} steps detected
                </p>
                <p className="text-sm text-green-700">
                  Automatically detected from your device
                </p>
              </div>
            </div>
            <button
              onClick={() => setSteps(autoDetected.toString())}
              className="mt-3 btn btn-primary w-full"
              aria-label="Use detected step count"
            >
              Use This Count
            </button>
          </div>
        )}

        {/* Health App Sync */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Sync with Health App</h2>
          <p className="text-sm text-gray-600 mb-4">
            Get your step count automatically from Apple Health or Google Fit
          </p>
          <button
            onClick={syncWithHealthApp}
            disabled={loading}
            className="btn btn-secondary w-full"
            aria-label="Sync with health app"
          >
            {loading ? (
              <span className="flex items-center justify-center space-x-2">
                <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
                <span>Syncing...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <span role="img" aria-label="sync">🔄</span>
                <span>Sync Health Data</span>
              </span>
            )}
          </button>
        </div>

        {/* Manual Entry Form */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Manual Entry</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Steps Input */}
            <div className="space-y-2">
              <label htmlFor="steps" className="block text-sm font-medium text-gray-700">
                Step Count
              </label>
              <input
                id="steps"
                type="number"
                min="0"
                max="100000"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                className="form-input text-lg font-semibold"
                placeholder="0"
                aria-label="Enter your step count"
              />
            </div>

            {/* Progress Visualization */}
            {currentSteps > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Progress to Goal</span>
                  <span className="font-medium">
                    {currentSteps.toLocaleString()} / {goalSteps.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={progressPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Step progress: ${Math.round(progressPercentage)}%`}
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {currentSteps >= goalSteps ? (
                    <span className="text-green-600 font-medium">🎉 Goal achieved!</span>
                  ) : (
                    <span>
                      {(goalSteps - currentSteps).toLocaleString()} steps to reach your goal
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !steps}
              className="btn btn-primary w-full text-lg"
              aria-label="Save step count"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  <span>Saving...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center space-x-2">
                  <span role="img" aria-label="footprints">👣</span>
                  <span>Log Steps</span>
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Activity Tips */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Activity Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Aim for at least 10,000 steps per day</li>
            <li>• Take the stairs instead of elevators</li>
            <li>• Park farther away or get off transit one stop early</li>
            <li>• Take walking meetings or phone calls</li>
            <li>• Set hourly reminders to move</li>
          </ul>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {/* Mock recent entries - replace with real data */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="font-medium">8,420 steps</p>
                <p className="text-sm text-gray-500">Yesterday</p>
              </div>
              <div className="text-right">
                <span className="text-sm text-blue-600">84% of goal</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="font-medium">12,156 steps</p>
                <p className="text-sm text-gray-500">2 days ago</p>
              </div>
              <div className="text-right">
                <span className="text-sm text-green-600">✓ Goal reached</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">6,789 steps</p>
                <p className="text-sm text-gray-500">3 days ago</p>
              </div>
              <div className="text-right">
                <span className="text-sm text-orange-600">68% of goal</span>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center mt-4 text-sm text-indigo-600 hover:text-indigo-500"
            aria-label="View full activity history"
          >
            View full history →
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function LogStepsPage() {
  return (
    <AuthGuard>
      <LogStepsContent />
    </AuthGuard>
  )
}