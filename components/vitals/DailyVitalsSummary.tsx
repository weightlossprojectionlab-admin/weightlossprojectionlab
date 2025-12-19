'use client'

import React, { useState, useEffect } from 'react'
import { VitalSign, Appointment } from '@/types/medical'
import {
  HeartIcon,
  BeakerIcon,
  FireIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { formatVitalForDisplay, getVitalTypeLabel } from '@/lib/vitals-wizard-transform'
import { medicalOperations } from '@/lib/medical-operations'
import { useRouter } from 'next/navigation'

interface DailyVitalsSummaryProps {
  vitals: VitalSign[]
  patientName: string
  patientId: string
  caregivers?: Array<{
    id: string
    name: string
    relationship?: string
    userId?: string
  }>
}

/**
 * DailyVitalsSummary - Report-style summary of today's vitals
 *
 * Shows all vitals recorded today in a clean, scannable format.
 * Complements the "Recent Vitals" historic view with today's snapshot.
 *
 * DRY principle: Reuses formatVitalForDisplay and getVitalTypeLabel utilities
 */
export default function DailyVitalsSummary({ vitals, patientName, patientId, caregivers = [] }: DailyVitalsSummaryProps) {
  const router = useRouter()
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [loadingAppointments, setLoadingAppointments] = useState(true)

  // Fetch upcoming appointments (next 7 days)
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoadingAppointments(true)
        const appointments = await medicalOperations.appointments.getAppointments({ patientId })

        const now = new Date()
        const sevenDaysFromNow = new Date()
        sevenDaysFromNow.setDate(now.getDate() + 7)

        const upcoming = appointments.filter(apt => {
          const aptDate = new Date(apt.dateTime)
          return apt.status === 'scheduled' && aptDate >= now && aptDate <= sevenDaysFromNow
        }).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())

        setUpcomingAppointments(upcoming)
      } catch (error) {
        console.error('Error fetching appointments:', error)
      } finally {
        setLoadingAppointments(false)
      }
    }

    fetchAppointments()
  }, [patientId])

  // Get display name for the person who logged the vitals
  const getDisplayName = (userId?: string): string => {
    if (!userId) return 'Unknown'

    // Check if it's the patient themselves
    if (userId === patientId) {
      return `${patientName} (Self)`
    }

    // Check if it's a caregiver
    const caregiver = caregivers.find(c => c.userId === userId)
    if (caregiver) {
      return caregiver.relationship ? `${caregiver.name} (${caregiver.relationship})` : caregiver.name
    }

    return 'Unknown User'
  }
  // Filter vitals from today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayVitals = vitals.filter(vital => {
    const vitalDate = new Date(vital.recordedAt)
    vitalDate.setHours(0, 0, 0, 0)
    return vitalDate.getTime() === today.getTime()
  })

  // Get latest reading for each type today
  const latestByType = new Map<string, VitalSign>()
  todayVitals.forEach(vital => {
    const existing = latestByType.get(vital.type)
    if (!existing || new Date(vital.recordedAt) > new Date(existing.recordedAt)) {
      latestByType.set(vital.type, vital)
    }
  })

  const todayReadings = Array.from(latestByType.values())
  const totalReadingsToday = todayVitals.length

  if (totalReadingsToday === 0) {
    return null // Don't show if no vitals today
  }

  // Extract mood from notes (format: [MOOD: emoji mood])
  const extractMood = (notes?: string): { mood: string; emoji: string; moodNotes?: string; otherNotes?: string } | null => {
    if (!notes) return null

    const moodMatch = notes.match(/^\[MOOD: (.+?) (.+?)\]/)
    if (!moodMatch) return null

    const [fullMatch, emoji, mood] = moodMatch
    const remainingText = notes.substring(fullMatch.length).trim()

    // Split remaining text into mood notes and other notes
    const parts = remainingText.split('\n\n')
    const moodNotes = parts[0] || undefined
    const otherNotes = parts.slice(1).join('\n\n') || undefined

    return { mood, emoji, moodNotes, otherNotes }
  }

  // Get mood from any of today's vitals (they all have the same notes)
  const moodData = todayReadings.length > 0 ? extractMood(todayReadings[0].notes) : null

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <HeartIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Today's Vitals</h2>
              <p className="text-sm text-blue-100">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-white">
              <CheckCircleIcon className="h-5 w-5" />
              <span className="text-2xl font-bold">{totalReadingsToday}</span>
            </div>
            <p className="text-xs text-blue-100">reading{totalReadingsToday !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {todayReadings.map((vital) => (
            <VitalSummaryCard key={vital.id} vital={vital} getDisplayName={getDisplayName} />
          ))}
        </div>

        {/* Upcoming Appointments Section */}
        {upcomingAppointments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Upcoming Appointments
              </h3>
              <button
                onClick={() => router.push('/calendar')}
                className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
              >
                View Calendar →
              </button>
            </div>
            <div className="space-y-2">
              {upcomingAppointments.map((apt) => {
                const aptDate = new Date(apt.dateTime)
                const now = new Date()
                const hoursUntil = Math.round((aptDate.getTime() - now.getTime()) / (1000 * 60 * 60))
                const daysUntil = Math.floor(hoursUntil / 24)

                let timeUntil = ''
                if (hoursUntil < 24) {
                  if (hoursUntil <= 2) {
                    timeUntil = `in ${hoursUntil}h`
                  } else {
                    timeUntil = 'today'
                  }
                } else if (daysUntil === 1) {
                  timeUntil = 'tomorrow'
                } else {
                  timeUntil = `in ${daysUntil} days`
                }

                return (
                  <button
                    key={apt.id}
                    onClick={() => router.push('/calendar')}
                    className="w-full bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 p-3 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-green-900 dark:text-green-100">
                            {apt.providerName || 'Appointment'}
                          </span>
                          {hoursUntil <= 24 && (
                            <span className="px-2 py-0.5 bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 rounded-full text-xs font-medium">
                              {timeUntil}
                            </span>
                          )}
                        </div>
                        {apt.specialty && (
                          <p className="text-xs text-green-700 dark:text-green-300 mb-1">
                            {apt.specialty}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                          <ClockIcon className="h-3.5 w-3.5" />
                          <span>
                            {aptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {' at '}
                            {aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      {daysUntil > 0 && hoursUntil > 24 && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-bold text-green-700 dark:text-green-300">
                            {daysUntil}
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400">
                            day{daysUntil !== 1 ? 's' : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Mood Section */}
        {moodData && (
          <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Mood
            </h3>
            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{moodData.emoji}</span>
                <span className="text-lg font-medium text-purple-900 dark:text-purple-100 capitalize">
                  {moodData.mood}
                </span>
              </div>
              {moodData.moodNotes && (
                <p className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap mt-2">
                  {moodData.moodNotes}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer Notes */}
        {(() => {
          // Since all vitals share the same notes, only display once
          const firstVital = todayReadings[0]
          if (!firstVital) return null

          const extracted = extractMood(firstVital.notes)
          const displayNotes = extracted ? extracted.otherNotes : firstVital.notes

          if (!displayNotes) return null

          return (
            <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4" />
                Notes
              </h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {displayNotes}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

/**
 * VitalSummaryCard - Individual vital reading card for daily summary
 */
function VitalSummaryCard({ vital, getDisplayName }: { vital: VitalSign; getDisplayName: (userId?: string) => string }) {
  const time = new Date(vital.recordedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  const label = getVitalTypeLabel(vital.type)
  const displayValue = formatVitalForDisplay(vital.type, vital.value, vital.unit)

  // Color schemes by vital type
  const colorSchemes: Record<string, { bg: string; border: string; icon: string; text: string }> = {
    blood_pressure: {
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      text: 'text-red-900 dark:text-red-100'
    },
    temperature: {
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      border: 'border-orange-200 dark:border-orange-800',
      icon: 'text-orange-600 dark:text-orange-400',
      text: 'text-orange-900 dark:text-orange-100'
    },
    pulse_oximeter: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-200 dark:border-purple-800',
      icon: 'text-purple-600 dark:text-purple-400',
      text: 'text-purple-900 dark:text-purple-100'
    },
    blood_sugar: {
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      text: 'text-green-900 dark:text-green-100'
    },
    weight: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      text: 'text-blue-900 dark:text-blue-100'
    },
    mood: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/30',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      text: 'text-yellow-900 dark:text-yellow-100'
    }
  }

  const colors = colorSchemes[vital.type] || {
    bg: 'bg-gray-50 dark:bg-gray-950/30',
    border: 'border-gray-200 dark:border-gray-800',
    icon: 'text-gray-600 dark:text-gray-400',
    text: 'text-gray-900 dark:text-gray-100'
  }

  // Status indicator based on validation (could be enhanced with actual validation logic)
  const status = getVitalStatus(vital)

  return (
    <div className={`${colors.bg} rounded-lg border ${colors.border} p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <HeartIcon className={`h-5 w-5 ${colors.icon}`} />
          <h3 className={`font-semibold ${colors.text}`}>{label}</h3>
        </div>
        {status && (
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.className}`}>
            {status.label}
          </span>
        )}
      </div>

      <div className="mb-2">
        <p className={`text-2xl font-bold ${colors.text}`}>{displayValue}</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <ClockIcon className="h-3.5 w-3.5" />
        <span>{time}</span>
        {vital.takenBy && (
          <>
            <span>•</span>
            <span>{getDisplayName(vital.takenBy)}</span>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Get status indicator for vital (can be enhanced with actual validation rules)
 */
function getVitalStatus(vital: VitalSign): { label: string; className: string } | null {
  // Basic validation logic - can be enhanced with proper ranges
  if (vital.type === 'blood_pressure' && typeof vital.value === 'object' && 'systolic' in vital.value) {
    const { systolic, diastolic } = vital.value
    if (systolic > 140 || diastolic > 90) {
      return { label: 'High', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
    }
    if (systolic < 90 || diastolic < 60) {
      return { label: 'Low', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' }
    }
    return { label: 'Normal', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' }
  }

  if (vital.type === 'temperature') {
    const temp = vital.value as number
    if (temp > 100.4) {
      return { label: 'Fever', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
    }
    if (temp < 97) {
      return { label: 'Low', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' }
    }
    return { label: 'Normal', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' }
  }

  if (vital.type === 'pulse_oximeter' && typeof vital.value === 'object' && 'spo2' in vital.value) {
    const { spo2 } = vital.value
    if (spo2 < 90) {
      return { label: 'Low', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
    }
    return { label: 'Normal', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' }
  }

  return null
}
