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
import { CalendarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    if (!newDate) {
      onChange('')
      return
    }

    // Convert YYYY-MM-DD to ISO string at midnight UTC
    const selectedDate = new Date(newDate + 'T00:00:00.000Z')
    onChange(selectedDate.toISOString())
  }

  // Get display value (YYYY-MM-DD format)
  const displayValue = value
    ? new Date(value).toISOString().split('T')[0]
    : ''

  return (
    <div className="space-y-1">
      {/* Label */}
      <label className="block text-sm font-medium text-gray-900">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Date Input - Mobile optimized with larger touch targets */}
      <div className="relative">
        <input
          type="date"
          value={displayValue}
          onChange={handleDateChange}
          disabled={disabled}
          required={required}
          min={minDate}
          max={maxDate}
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
