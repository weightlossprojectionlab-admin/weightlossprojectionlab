/**
 * VitalDatePicker Component
 *
 * Reusable date picker for selecting when a vital was recorded.
 * Supports backdating with validation and warnings.
 *
 * Features:
 * - Date validation (no future dates, respects backdate limits)
 * - Visual feedback for backdated entries
 * - Plan-tier aware backdate limits
 * - Accessible date input
 */

'use client'

import { useState, useEffect } from 'react'
import { CalendarIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { validateVitalDate, getMaxBackdateDate } from '@/lib/vital-date-validator'

export interface VitalDatePickerProps {
  value: string // ISO string
  onChange: (date: string) => void
  patientCreatedAt: string // ISO string
  userPlanTier?: 'free' | 'premium' | 'enterprise'
  label?: string
  helperText?: string
  disabled?: boolean
  required?: boolean
}

export default function VitalDatePicker({
  value,
  onChange,
  patientCreatedAt,
  userPlanTier = 'free',
  label = 'Date Recorded',
  helperText,
  disabled = false,
  required = false
}: VitalDatePickerProps) {
  const [error, setError] = useState<string>('')
  const [isBackdated, setIsBackdated] = useState(false)
  const [daysDifference, setDaysDifference] = useState(0)

  // Calculate min and max dates
  const today = new Date()
  const maxDate = today.toISOString().split('T')[0]
  const minDate = getMaxBackdateDate(userPlanTier, today).toISOString().split('T')[0]

  // Validate date whenever value changes
  useEffect(() => {
    if (!value) {
      setError('')
      setIsBackdated(false)
      setDaysDifference(0)
      return
    }

    const validation = validateVitalDate(
      new Date(value),
      new Date(patientCreatedAt),
      userPlanTier,
      today
    )

    if (!validation.isValid) {
      setError(validation.error || 'Invalid date')
      setIsBackdated(false)
      setDaysDifference(0)
    } else {
      setError('')
      setIsBackdated(validation.isBackdated || false)
      setDaysDifference(validation.daysDifference || 0)
    }
  }, [value, patientCreatedAt, userPlanTier])

  // Current value as a local Date (or null). Date AND time are preserved so a
  // reading keeps the actual clock time it was taken — vitals mean different
  // things at different times of day (fasting vs post-meal glucose), and the
  // trend/analytics layer segments by time-of-day, so midnight-stamping loses
  // real signal (see lib/time-of-day.ts).
  const current = value ? new Date(value) : null
  const hasCurrent = current !== null && !isNaN(current.getTime())
  const pad = (n: number) => String(n).padStart(2, '0')

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    if (!newDate) {
      onChange('')
      return
    }
    // Combine the picked day with the existing time (default: now for a fresh
    // entry). Building from local Y/M/D avoids the UTC-shift bug where an
    // evening-local time rolls the date to the previous/next day.
    const [year, month, day] = newDate.split('-').map(Number)
    const base = hasCurrent ? current! : new Date()
    const combined = new Date(year, month - 1, day, base.getHours(), base.getMinutes(), 0, 0)
    onChange(combined.toISOString())
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value // HH:mm (24h)
    if (!newTime) return
    const [hours, minutes] = newTime.split(':').map(Number)
    const base = hasCurrent ? current! : new Date()
    const combined = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes, 0, 0)
    onChange(combined.toISOString())
  }

  // Display values from LOCAL parts (not toISOString, which is UTC and drifts).
  const displayValue = hasCurrent
    ? `${current!.getFullYear()}-${pad(current!.getMonth() + 1)}-${pad(current!.getDate())}`
    : ''
  const displayTime = hasCurrent
    ? `${pad(current!.getHours())}:${pad(current!.getMinutes())}`
    : ''
  // Cap the time to "now" only when the selected day IS today (no future readings).
  const isToday = displayValue === maxDate
  const maxTime = isToday ? `${pad(today.getHours())}:${pad(today.getMinutes())}` : undefined

  return (
    <div className="space-y-1">
      {/* Label */}
      <label className="block text-sm font-medium text-gray-900">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Date + Time inputs — mobile-first: stacked on phones, side-by-side on
          sm+. Time carries the real clock hour so multiple readings a day stay
          distinct and time-of-day analysis works. */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Date */}
        <div className="relative flex-1">
          <input
            type="date"
            value={displayValue}
            onChange={handleDateChange}
            disabled={disabled}
            required={required}
            min={minDate}
            max={maxDate}
            aria-label={label}
            className={`
              w-full px-3 py-3 pl-10 border rounded-lg text-base bg-white text-gray-900
              focus:outline-none focus:ring-2 focus:ring-primary
              disabled:bg-gray-100 disabled:cursor-not-allowed
              touch-manipulation
              sm:py-2 sm:text-sm
              ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
            `}
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none'
            }}
          />
          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 pointer-events-none" />
        </div>

        {/* Time */}
        <div className="relative flex-1">
          <input
            type="time"
            value={displayTime}
            onChange={handleTimeChange}
            disabled={disabled || !hasCurrent}
            required={required}
            max={maxTime}
            aria-label="Time recorded"
            className={`
              w-full px-3 py-3 pl-10 border rounded-lg text-base bg-white text-gray-900
              focus:outline-none focus:ring-2 focus:ring-primary
              disabled:bg-gray-100 disabled:cursor-not-allowed
              touch-manipulation
              sm:py-2 sm:text-sm
              ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
            `}
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none'
            }}
          />
          <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600 pointer-events-none" />
        </div>
      </div>

      {/* Helper Text */}
      {helperText && !error && !isBackdated && (
        <p className="text-sm text-gray-700">{helperText}</p>
      )}

      {/* Backdate Warning */}
      {isBackdated && !error && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 border-2 border-amber-400 rounded-lg">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-800 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-900 font-medium">
              Backdated Entry
            </p>
            <p className="text-amber-900">
              This vital will be recorded as logged {daysDifference} {daysDifference === 1 ? 'day' : 'days'} after it was taken.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-2 bg-red-50 border-2 border-red-400 rounded-lg">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-800 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-red-900 font-medium">Invalid Date</p>
            <p className="text-red-900">{error}</p>
          </div>
        </div>
      )}

      {/* Plan Limit Info */}
      {!disabled && (
        <p className="text-xs text-gray-700">
          {userPlanTier === 'free' && 'Free plan: Can backdate up to 7 days'}
          {userPlanTier === 'premium' && 'Premium plan: Can backdate up to 90 days'}
          {userPlanTier === 'enterprise' && 'Enterprise plan: Can backdate up to 365 days'}
        </p>
      )}
    </div>
  )
}
