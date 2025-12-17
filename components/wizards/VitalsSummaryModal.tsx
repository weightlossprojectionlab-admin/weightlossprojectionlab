'use client'

import React from 'react'
import { CheckCircle, Activity, TrendingUp, Calendar, User } from 'lucide-react'
import type { VitalSign } from '@/types/medical'
import { formatVitalForDisplay, getVitalTypeLabel } from '@/lib/vitals-wizard-transform'

interface VitalsSummaryModalProps {
  vitals: VitalSign[]
  patientName: string
  patientId: string
  mood?: string
  moodNotes?: string
  isOpen: boolean
  onClose: () => void
  onViewDashboard?: () => void
  caregivers?: Array<{
    id: string
    name: string
    relationship?: string
    userId?: string
  }>
}

/**
 * VitalsSummaryModal - Reusable modal component for displaying vitals logging summary
 *
 * Shows a success confirmation with detailed breakdown of all vitals that were logged.
 * Used after wizard completion to provide immediate feedback to users.
 *
 * DRY principle: Single component for vitals summary across all pages.
 */
export default function VitalsSummaryModal({
  vitals,
  patientName,
  patientId,
  mood,
  moodNotes,
  isOpen,
  onClose,
  onViewDashboard,
  caregivers = []
}: VitalsSummaryModalProps) {
  if (!isOpen) return null

  const timestamp = vitals[0]?.recordedAt ? new Date(vitals[0].recordedAt) : new Date()

  // Get display name for the person who logged the vitals
  const getDisplayName = (userId?: string): string => {
    console.log('[VitalsSummaryModal] getDisplayName called with userId:', userId)
    console.log('[VitalsSummaryModal] patientId:', patientId)
    console.log('[VitalsSummaryModal] caregivers:', caregivers)

    if (!userId) {
      console.log('[VitalsSummaryModal] No userId provided, returning Unknown')
      return 'Unknown'
    }

    // Check if it's the patient themselves
    if (userId === patientId) {
      console.log('[VitalsSummaryModal] Matched patient ID, returning Self')
      return `${patientName} (Self)`
    }

    // Check if it's a caregiver
    const caregiver = caregivers.find(c => c.userId === userId)
    console.log('[VitalsSummaryModal] Found caregiver:', caregiver)
    if (caregiver) {
      return caregiver.relationship ? `${caregiver.name} (${caregiver.relationship})` : caregiver.name
    }

    console.log('[VitalsSummaryModal] No match found, returning Unknown User')
    return 'Unknown User'
  }

  console.log('[VitalsSummaryModal] vitals[0]?.takenBy:', vitals[0]?.takenBy)
  const takenBy = getDisplayName(vitals[0]?.takenBy)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">
            Vitals Logged Successfully
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mt-2">
            {vitals.length} vital sign{vitals.length !== 1 ? 's' : ''} recorded for{' '}
            <span className="font-semibold text-blue-600 dark:text-blue-400">{patientName}</span>
          </p>
        </div>

        {/* Metadata */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>{timestamp.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <User className="h-4 w-4" />
              <span>{takenBy}</span>
            </div>
          </div>
        </div>

        {/* Vitals Summary */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vitals.map((vital, index) => (
              <VitalCard key={`${vital.type}-${index}`} vital={vital} />
            ))}
          </div>

          {/* Mood Display */}
          {mood && (
            <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                Mood
              </h4>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">
                  {mood === 'happy' ? '😊' :
                   mood === 'calm' ? '😌' :
                   mood === 'okay' ? '😐' :
                   mood === 'worried' ? '😟' :
                   mood === 'sad' ? '😢' :
                   mood === 'pain' ? '😫' : '😐'}
                </span>
                <span className="text-lg font-medium text-purple-900 dark:text-purple-100 capitalize">
                  {mood}
                </span>
              </div>
              {moodNotes && (
                <>
                  <h5 className="text-xs font-semibold text-purple-800 dark:text-purple-200 mb-1 mt-3">
                    Notes:
                  </h5>
                  <p className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap">
                    {moodNotes}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Notes */}
          {vitals[0]?.notes && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Notes
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">{vitals[0].notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 justify-end">
          {onViewDashboard && (
            <button
              onClick={onViewDashboard}
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              View Dashboard
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * VitalCard - Individual vital sign display card
 */
function VitalCard({ vital }: { vital: VitalSign }) {
  const label = getVitalTypeLabel(vital.type)
  const displayValue = formatVitalForDisplay(vital.type, vital.value, vital.unit)

  // Color scheme based on vital type
  const colorSchemes: Record<string, { bg: string; text: string; icon: string }> = {
    blood_pressure: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-900 dark:text-red-100',
      icon: 'text-red-600 dark:text-red-400'
    },
    temperature: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-900 dark:text-orange-100',
      icon: 'text-orange-600 dark:text-orange-400'
    },
    pulse_oximeter: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-900 dark:text-purple-100',
      icon: 'text-purple-600 dark:text-purple-400'
    },
    blood_sugar: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-900 dark:text-green-100',
      icon: 'text-green-600 dark:text-green-400'
    }
  }

  const colors = colorSchemes[vital.type] || {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-900 dark:text-blue-100',
    icon: 'text-blue-600 dark:text-blue-400'
  }

  return (
    <div
      className={`${colors.bg} rounded-lg p-4 border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className={`h-5 w-5 ${colors.icon}`} />
          <h4 className={`text-sm font-semibold ${colors.text}`}>{label}</h4>
        </div>
      </div>
      <p className={`text-2xl font-bold ${colors.text} mt-2`}>{displayValue}</p>
      {vital.method && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 capitalize">
          {vital.method} entry
        </p>
      )}
    </div>
  )
}
