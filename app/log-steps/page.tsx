'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/auth/AuthGuard'
import { useStepTracking, StepTrackingProvider } from '@/components/StepTrackingProvider'
import { useUserProfile } from '@/hooks/useUserProfile'
import { stepLogOperations } from '@/lib/firebase-operations'
import { Spinner } from '@/components/ui/Spinner'
import { logger } from '@/lib/logger'

interface StepLogData {
  id: string
  steps: number
  date: string
  loggedAt: string
  source: string
}

function LogStepsContent() {
  // Get automatic tracking status from provider
  const { todaysSteps, isTracking, isEnabled, enableTracking, disableTracking, lastSaveStepCount, manualSave } = useStepTracking()

  // Get user profile for goal steps
  const { profile } = useUserProfile()

  // State for recent activity
  const [recentLogs, setRecentLogs] = useState<StepLogData[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [togglingTracking, setTogglingTracking] = useState(false)
  const [savingProgress, setSavingProgress] = useState(false)

  // Fetch recent step logs on mount
  useEffect(() => {
    const fetchRecentLogs = async () => {
      try {
        const response = await stepLogOperations.getStepLogs({ limit: 7 })
        setRecentLogs(response.data || [])
      } catch (error) {
        logger.error('Error fetching recent logs:', error as Error)
      } finally {
        setLoadingLogs(false)
      }
    }

    fetchRecentLogs()
  }, [])

  const handleToggleTracking = async () => {
    setTogglingTracking(true)
    try {
      if (isEnabled) {
        disableTracking()
        toast.success('Automatic tracking disabled')
      } else {
        await enableTracking()
        toast.success('Automatic tracking enabled! Your steps will be counted in the background.')
      }
    } catch (err) {
      toast.error('Failed to toggle tracking. Please check device permissions.')
    } finally {
      setTogglingTracking(false)
    }
  }

  const handleManualSave = async () => {
    setSavingProgress(true)
    try {
      await manualSave()
      toast.success('Progress saved successfully!')
      // Refresh recent logs
      const response = await stepLogOperations.getStepLogs({ limit: 7 })
      setRecentLogs(response.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save progress'
      toast.error(message)
    } finally {
      setSavingProgress(false)
    }
  }

  // Format relative date (Today, Yesterday, X days ago)
  const formatRelativeDate = (dateString: string) => {
    const logDate = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const logDateStr = logDate.toDateString()
    const todayStr = today.toDateString()
    const yesterdayStr = yesterday.toDateString()

    if (logDateStr === todayStr) return 'Today'
    if (logDateStr === yesterdayStr) return 'Yesterday'

    const diffTime = today.getTime() - logDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return `${diffDays} days ago`
  }

  const goalSteps = profile?.goals?.dailySteps || 10000
  const currentSteps = todaysSteps
  const progressPercentage = Math.min((currentSteps / goalSteps) * 100, 100)

  return (
    <main className="min-h-screen bg-card">
      {/* Header */}
      <header className="bg-card shadow-sm">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-primary hover:text-primary-hover"
              aria-label="Back to dashboard"
            >
              ← Back
            </Link>
            <h1 className="text-xl font-semibold text-foreground">Log Steps</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Automatic Tracking Card - PRIMARY */}
        <div className={`border rounded-lg p-6 shadow-sm ${isEnabled ? 'bg-success-light dark:bg-success-dark/20 border-success dark:border-success' : 'bg-card border-border'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">Today's Steps</h2>
            {isEnabled && isTracking && (
              <span className="flex items-center space-x-2 text-sm text-success-dark dark:text-success">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-success-light dark:bg-success"></span>
                </span>
                <span>Tracking</span>
              </span>
            )}
          </div>

          {/* Step Count Display */}
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-foreground mb-2">
              {currentSteps.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">
              {isEnabled ? 'steps tracked automatically' : 'steps today'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Daily Goal</span>
              <span className="font-medium">
                {currentSteps.toLocaleString()} / {goalSteps.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Step progress: ${Math.round(progressPercentage)}%`}
              />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {currentSteps >= goalSteps ? (
                <span className="text-success font-medium">🎉 Goal achieved!</span>
              ) : (
                <span>
                  {(goalSteps - currentSteps).toLocaleString()} steps to reach your goal
                </span>
              )}
            </p>
          </div>

          {/* Tracking Status & Controls */}
          {isEnabled ? (
            <div className="space-y-3">
              <div className="bg-success-light dark:bg-success-dark/20 border border-success rounded-lg p-3">
                <p className="text-sm text-success-dark dark:text-success mb-1">
                  ✓ Automatic tracking enabled
                </p>
                <p className="text-xs text-success-dark dark:text-success">
                  Your steps are being counted automatically in the background whenever you move
                </p>
              </div>

              {/* Save Progress Info */}
              {currentSteps > lastSaveStepCount && (
                <div className="bg-secondary-light border border-secondary-light rounded-lg p-3">
                  <p className="text-xs text-secondary-dark mb-2">
                    💾 {currentSteps - lastSaveStepCount} unsaved steps
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Auto-saves every 100 steps or 5 minutes
                  </p>
                </div>
              )}

              {/* Manual Save Button */}
              {currentSteps > lastSaveStepCount && (
                <button
                  onClick={handleManualSave}
                  disabled={savingProgress}
                  className={`btn btn-primary w-full inline-flex items-center justify-center space-x-2 ${savingProgress ? 'cursor-wait' : ''}`}
                  aria-label="Save progress now"
                >
                  {savingProgress && <Spinner size="sm" />}
                  <span>{savingProgress ? 'Saving...' : 'Save Progress Now'}</span>
                </button>
              )}

              <button
                onClick={handleToggleTracking}
                disabled={togglingTracking}
                className={`btn btn-secondary w-full inline-flex items-center justify-center space-x-2 ${togglingTracking ? 'cursor-wait' : ''}`}
                aria-label="Disable automatic tracking"
              >
                {togglingTracking && <Spinner size="sm" />}
                <span>{togglingTracking ? 'Disabling...' : 'Disable Automatic Tracking'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-indigo-100 dark:bg-indigo-900/20 border border-accent rounded-lg p-3">
                <p className="text-sm text-accent-dark mb-1">
                  💡 Enable automatic tracking
                </p>
                <p className="text-xs text-accent-dark">
                  Let the app count your steps automatically throughout the day using your device sensors
                </p>
              </div>
              <button
                onClick={handleToggleTracking}
                disabled={togglingTracking}
                className={`btn btn-primary w-full text-lg inline-flex items-center justify-center space-x-2 ${togglingTracking ? 'cursor-wait' : ''}`}
                aria-label="Enable automatic tracking"
              >
                {togglingTracking && <Spinner size="sm" />}
                <span>{togglingTracking ? 'Enabling...' : 'Enable Automatic Tracking'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Activity Tips */}
        <div className="bg-indigo-100 dark:bg-indigo-900/20 rounded-lg p-4">
          <h3 className="text-sm font-medium text-accent-dark mb-2">💡 Activity Tips</h3>
          <ul className="text-sm text-accent-dark space-y-1">
            <li>• Aim for at least 10,000 steps per day</li>
            <li>• Take the stairs instead of elevators</li>
            <li>• Park farther away or get off transit one stop early</li>
            <li>• Take walking meetings or phone calls</li>
            <li>• Set hourly reminders to move</li>
          </ul>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-foreground mb-4">Recent Activity</h3>

          {loadingLogs ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading activity...</p>
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">No activity logged yet</p>
              <p className="text-sm text-muted-foreground">Enable automatic tracking to start recording your steps</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {recentLogs.map((log, index) => {
                  const goalProgress = Math.round((log.steps / goalSteps) * 100)
                  const isLastItem = index === recentLogs.length - 1

                  return (
                    <div
                      key={log.id}
                      className={`flex items-center justify-between py-2 ${!isLastItem ? 'border-b border-border' : ''}`}
                    >
                      <div>
                        <p className="font-medium">{log.steps.toLocaleString()} steps</p>
                        <p className="text-sm text-muted-foreground">{formatRelativeDate(log.date)}</p>
                      </div>
                      <div className="text-right">
                        {goalProgress >= 100 ? (
                          <span className="text-sm text-success">✓ Goal reached</span>
                        ) : goalProgress >= 75 ? (
                          <span className="text-sm text-accent-dark">{goalProgress}% of goal</span>
                        ) : (
                          <span className="text-sm text-warning">{goalProgress}% of goal</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <Link
                href="/dashboard"
                className="inline-flex items-center mt-4 text-sm text-primary hover:text-primary-hover"
                aria-label="View full activity history"
              >
                View full history →
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default function LogStepsPage() {
  return (
    <AuthGuard>
      <StepTrackingProvider>
        <LogStepsContent />
      </StepTrackingProvider>
    </AuthGuard>
  )
}