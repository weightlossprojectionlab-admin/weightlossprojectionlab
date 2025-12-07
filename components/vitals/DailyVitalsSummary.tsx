'use client'

import React from 'react'
import { VitalSign } from '@/types/medical'
import {
  HeartIcon,
  BeakerIcon,
  FireIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { formatVitalForDisplay, getVitalTypeLabel } from '@/lib/vitals-wizard-transform'

interface DailyVitalsSummaryProps {
  vitals: VitalSign[]
  patientName: string
}

/**
 * DailyVitalsSummary - Report-style summary of today's vitals
 *
 * Shows all vitals recorded today in a clean, scannable format.
 * Complements the "Recent Vitals" historic view with today's snapshot.
 *
 * DRY principle: Reuses formatVitalForDisplay and getVitalTypeLabel utilities
 */
export default function DailyVitalsSummary({ vitals, patientName }: DailyVitalsSummaryProps) {
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
            <VitalSummaryCard key={vital.id} vital={vital} />
          ))}
        </div>

        {/* Footer Notes */}
        {todayReadings.some(v => v.notes) && (
          <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Notes
            </h3>
            <div className="space-y-2">
              {todayReadings
                .filter(v => v.notes)
                .map(vital => (
                  <div key={vital.id} className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {getVitalTypeLabel(vital.type)}:
                    </span>{' '}
                    <span className="text-gray-600 dark:text-gray-400">{vital.notes}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * VitalSummaryCard - Individual vital reading card for daily summary
 */
function VitalSummaryCard({ vital }: { vital: VitalSign }) {
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
            <span>{vital.takenBy}</span>
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
