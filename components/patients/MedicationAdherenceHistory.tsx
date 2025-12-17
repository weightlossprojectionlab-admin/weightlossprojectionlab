'use client'

import { useState, useEffect } from 'react'
import { db, auth } from '@/lib/firebase'
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore'
import { PatientMedication } from '@/types/medical'
import { logger } from '@/lib/logger'
import { CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface AdherenceLog {
  id: string
  takenAt: string
  loggedBy: string
  loggedAt: string
  notes?: string
}

interface MedicationAdherenceHistoryProps {
  patientId: string
  medication: PatientMedication
}

export default function MedicationAdherenceHistory({ patientId, medication }: MedicationAdherenceHistoryProps) {
  const [logs, setLogs] = useState<AdherenceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const user = auth.currentUser
    if (!user || !patientId || !medication.id) {
      setLoading(false)
      return
    }

    setLoading(true)

    // Subscribe to adherence logs
    const logsRef = collection(
      db,
      `users/${user.uid}/patients/${patientId}/medications/${medication.id}/adherenceLogs`
    )
    const q = query(logsRef, orderBy('takenAt', 'desc'), limit(showAll ? 100 : 10))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const adherenceLogs: AdherenceLog[] = snapshot.docs.map(doc => ({
          id: doc.id,
          takenAt: doc.data().takenAt?.toDate?.()?.toISOString() || doc.data().takenAt,
          loggedBy: doc.data().loggedBy,
          loggedAt: doc.data().loggedAt?.toDate?.()?.toISOString() || doc.data().loggedAt,
          notes: doc.data().notes
        }))

        setLogs(adherenceLogs)
        setLoading(false)
        logger.debug('[MedicationAdherenceHistory] Logs updated', { count: adherenceLogs.length })
      },
      (error) => {
        // Ignore permission-denied errors (collection might not exist yet)
        if (error.code !== 'permission-denied') {
          logger.error('[MedicationAdherenceHistory] Error loading logs', error)
        }
        setLogs([])
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [patientId, medication.id, showAll])

  // Group logs by date
  const groupedLogs = logs.reduce((groups, log) => {
    const date = new Date(log.takenAt).toLocaleDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(log)
    return groups
  }, {} as Record<string, AdherenceLog[]>)

  // Calculate streak (consecutive days with at least one dose)
  const calculateStreak = () => {
    if (logs.length === 0) return 0

    const dates = Array.from(new Set(logs.map(log => new Date(log.takenAt).toDateString())))
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => b.getTime() - a.getTime())

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)
      expectedDate.setHours(0, 0, 0, 0)

      const logDate = new Date(dates[i])
      logDate.setHours(0, 0, 0, 0)

      if (logDate.getTime() === expectedDate.getTime()) {
        streak++
      } else {
        break
      }
    }

    return streak
  }

  const streak = calculateStreak()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No doses logged yet</p>
        <p className="text-xs mt-1">Use "Mark as Taken" to track adherence</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-primary-light/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-primary-dark dark:text-purple-200">
            {logs.length}
          </div>
          <div className="text-xs text-muted-foreground">Total Doses</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {streak}
          </div>
          <div className="text-xs text-muted-foreground">Day Streak</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {medication.adherenceRate?.toFixed(0) || 0}%
          </div>
          <div className="text-xs text-muted-foreground">Adherence</div>
        </div>
      </div>

      {/* Adherence Timeline */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          Recent History
        </h4>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date} className="border-l-2 border-primary/30 pl-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">{date}</div>
              {dateLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-muted/50 rounded-lg p-2 mb-2 flex items-start justify-between"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5" />
                    <div>
                      <div className="text-sm text-foreground">
                        {new Date(log.takenAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {log.notes && (
                        <div className="text-xs text-muted-foreground italic mt-1">
                          {log.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Show more button */}
        {logs.length >= 10 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full mt-3 px-3 py-2 text-sm text-primary hover:text-primary-dark border border-primary/30 hover:border-primary rounded-lg transition-colors"
          >
            Show All History
          </button>
        )}
      </div>

      {/* Refill reminder */}
      {medication.quantityRemaining !== undefined && medication.quantityRemaining <= 7 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Time to Refill
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Only {medication.quantityRemaining} doses remaining. Contact your pharmacy for a refill.
              </div>
              {medication.pharmacyPhone && (
                <a
                  href={`tel:${medication.pharmacyPhone}`}
                  className="text-xs text-amber-600 dark:text-amber-400 underline hover:no-underline mt-2 inline-block"
                >
                  Call {medication.pharmacyName || 'pharmacy'}: {medication.pharmacyPhone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
