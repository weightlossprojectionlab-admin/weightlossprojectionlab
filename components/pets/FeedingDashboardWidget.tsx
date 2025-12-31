/**
 * FeedingDashboardWidget Component
 * Shows today's feeding schedule and quick actions for pet dashboard
 */

'use client'

import { useState, useEffect } from 'react'
import { useFeedingSchedule } from '@/hooks/useFeedingSchedule'
import { useFeedingLogs } from '@/hooks/useFeedingLogs'
import { usePetFoodProfiles } from '@/hooks/usePetFoodProfiles'
import { useAuth } from '@/hooks/useAuth'
import { PatientProfile } from '@/types/medical'
import { FeedingLog } from '@/types/pet-feeding'
import { format, isPast, isFuture, differenceInMinutes } from 'date-fns'
import { logger } from '@/lib/logger'
import { FeedingQuickLogModal } from './FeedingQuickLogModal'
import { FeedingScheduleWizard } from './FeedingScheduleWizard'
import { capitalizeName } from '@/lib/utils'

interface FeedingDashboardWidgetProps {
  patient: PatientProfile
}

export function FeedingDashboardWidget({ patient }: FeedingDashboardWidgetProps) {
  const { user } = useAuth()
  const [showQuickLog, setShowQuickLog] = useState<string | null>(null) // scheduledFor of meal being logged
  const [showScheduleWizard, setShowScheduleWizard] = useState(false)

  const { schedule, loading: scheduleLoading } = useFeedingSchedule({
    userId: user?.uid || '',
    petId: patient.id,
    autoFetch: true,
    realtime: true
  })

  const { feedingLogs, loading: logsLoading, getAppetiteTrend } = useFeedingLogs({
    userId: user?.uid || '',
    petId: patient.id,
    date: new Date(),
    autoFetch: true,
    realtime: true
  })

  const { foodProfiles } = usePetFoodProfiles({
    userId: user?.uid || '',
    petId: patient.id,
    autoFetch: true
  })

  const [appetiteTrend, setAppetiteTrend] = useState<{ avgAppetite: number }[]>([])

  // Fetch appetite trend
  useEffect(() => {
    if (user?.uid && patient.id) {
      getAppetiteTrend(7).then(trend => setAppetiteTrend(trend))
    }
  }, [user?.uid, patient.id])

  // Helper: Get food name from ID
  const getFoodName = (foodId: string): string => {
    const food = foodProfiles.find(f => f.id === foodId)
    return food?.foodName || 'Unknown Food'
  }

  // Helper: Get feeding status emoji
  const getStatusEmoji = (log: FeedingLog): string => {
    if (log.status === 'fed') {
      if (log.appetiteLevel === 'ate-all') return '✅'
      if (log.appetiteLevel === 'ate-most') return '🟢'
      if (log.appetiteLevel === 'ate-some') return '🟡'
      if (log.appetiteLevel === 'ate-little') return '🟠'
      if (log.appetiteLevel === 'refused') return '🔴'
    }
    if (log.status === 'pending') {
      const scheduled = new Date(log.scheduledFor)
      return isPast(scheduled) ? '⏰' : '🔔'
    }
    if (log.status === 'skipped') return '⏭️'
    return '⏳'
  }

  // Helper: Get appetite trend emoji
  const getAppetiteEmoji = (avgAppetite: number): string => {
    if (avgAppetite >= 90) return '✅'
    if (avgAppetite >= 70) return '🟢'
    if (avgAppetite >= 50) return '🟡'
    if (avgAppetite >= 25) return '🟠'
    return '🔴'
  }

  // Helper: Get time until feeding
  const getTimeUntil = (scheduledFor: string): string => {
    const scheduled = new Date(scheduledFor)
    const now = new Date()
    const diff = differenceInMinutes(scheduled, now)

    if (diff < 0) return 'Overdue'
    if (diff < 60) return `in ${diff} min`
    if (diff < 120) return `in 1 hour`
    const hours = Math.floor(diff / 60)
    return `in ${hours} hours`
  }

  if (scheduleLoading || !schedule) {
    return (
      <>
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🍽️</span>
            <h3 className="text-lg font-semibold text-foreground">Feeding Schedule</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {scheduleLoading ? 'Loading schedule...' : 'No feeding schedule set up yet'}
          </p>
          {!scheduleLoading && !schedule && (
            <button
              onClick={() => {
                console.log('Button clicked - opening wizard')
                setShowScheduleWizard(true)
              }}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Set Up Feeding Schedule
            </button>
          )}
        </div>

        {/* Schedule Wizard - must be outside early return */}
        <FeedingScheduleWizard
          isOpen={showScheduleWizard}
          onClose={() => setShowScheduleWizard(false)}
          petId={patient.id}
          petName={capitalizeName(patient.name)}
          petSpecies={patient.species}
          onSuccess={() => {
            setShowScheduleWizard(false)
            // Schedule will auto-refresh via real-time listener
          }}
        />
      </>
    )
  }

  // Get today's logs sorted by scheduled time
  const todayLogs = feedingLogs.sort((a, b) =>
    a.scheduledFor.localeCompare(b.scheduledFor)
  )

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{patient.species === 'Dog' ? '🍖' : patient.species === 'Cat' ? '🐟' : patient.species === 'Bird' ? '🌾' : patient.species === 'Fish' ? '🐠' : '🍽️'}</span>
          <h3 className="text-lg font-semibold text-foreground">Feeding Schedule</h3>
        </div>
        <span className="text-xs text-muted-foreground">{format(new Date(), 'EEEE, MMM d')}</span>
      </div>

      {/* Today's Meals */}
      <div className="space-y-3 mb-6">
        {todayLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No meals scheduled for today</p>
        ) : (
          todayLogs.map((log) => {
            const scheduled = new Date(log.scheduledFor)
            const isPastMeal = isPast(scheduled)
            const foodName = getFoodName(log.foodProfileId)

            return (
              <div
                key={log.id}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  log.status === 'fed'
                    ? 'border-success/30 bg-success/5'
                    : isPastMeal
                    ? 'border-warning/30 bg-warning/5'
                    : 'border-border bg-background'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">{getStatusEmoji(log)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">
                          {log.scheduledTime === '08:00' || log.scheduledTime?.startsWith('0') ? 'Breakfast' :
                           log.scheduledTime === '12:00' ? 'Lunch' :
                           log.scheduledTime === '18:00' || log.scheduledTime === '17:00' ? 'Dinner' :
                           'Feeding'}
                        </h4>
                        <span className="text-sm text-muted-foreground">
                          ({log.scheduledTime})
                        </span>
                      </div>

                      {log.status === 'fed' ? (
                        <div className="text-sm">
                          <p className="text-success font-medium">
                            Fed at {log.fedAt ? format(new Date(log.fedAt), 'h:mm a') : log.scheduledTime}
                          </p>
                          {log.appetiteLevel && (
                            <p className="text-muted-foreground mt-1">
                              {log.appetiteLevel === 'ate-all' && '✅ Ate everything'}
                              {log.appetiteLevel === 'ate-most' && '🟢 Ate most (75%)'}
                              {log.appetiteLevel === 'ate-some' && '🟡 Ate some (50%)'}
                              {log.appetiteLevel === 'ate-little' && '🟠 Ate a little (25%)'}
                              {log.appetiteLevel === 'refused' && '🔴 Refused food'}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.portionSize} {log.portionUnit} {foodName}
                          </p>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <p className="text-muted-foreground">
                            {log.portionSize} {log.portionUnit} {foodName}
                          </p>
                          {isPastMeal && (
                            <p className="text-warning font-medium mt-1">
                              ⏰ {getTimeUntil(log.scheduledFor)}
                            </p>
                          )}
                          {!isPastMeal && (
                            <p className="text-muted-foreground mt-1">
                              🔔 Due {getTimeUntil(log.scheduledFor)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  {log.status === 'pending' && (
                    <button
                      onClick={() => setShowQuickLog(log.scheduledFor)}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                    >
                      Mark as Fed
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Appetite Trend */}
      {appetiteTrend.length > 0 && (
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Appetite This Week</h4>
          <div className="flex items-center gap-1">
            {appetiteTrend.map((day, index) => (
              <span key={index} className="text-xl" title={`${Math.round(day.avgAppetite)}% appetite`}>
                {getAppetiteEmoji(day.avgAppetite)}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {appetiteTrend.filter(d => d.avgAppetite >= 90).length}/{appetiteTrend.length} days with good appetite
          </p>
        </div>
      )}

      {/* Quick Log Modal */}
      {showQuickLog && (() => {
        const log = feedingLogs.find(l => l.scheduledFor === showQuickLog)
        if (!log) return null

        return (
          <FeedingQuickLogModal
            isOpen={true}
            onClose={() => setShowQuickLog(null)}
            petId={patient.id}
            scheduledFor={log.scheduledFor}
            scheduledTime={log.scheduledTime}
            foodProfileId={log.foodProfileId}
            foodName={getFoodName(log.foodProfileId)}
            portionSize={log.portionSize}
            portionUnit={log.portionUnit}
            mealName={
              log.scheduledTime === '08:00' ? 'Breakfast' :
              log.scheduledTime === '12:00' ? 'Lunch' :
              log.scheduledTime === '18:00' ? 'Dinner' :
              'Feeding'
            }
          />
        )
      })()}

      {/* Schedule Wizard */}
      <FeedingScheduleWizard
        isOpen={showScheduleWizard}
        onClose={() => setShowScheduleWizard(false)}
        petId={patient.id}
        petName={capitalizeName(patient.name)}
        petSpecies={patient.species}
        onSuccess={() => {
          setShowScheduleWizard(false)
          // Schedule will auto-refresh via real-time listener
        }}
      />
    </div>
  )
}
