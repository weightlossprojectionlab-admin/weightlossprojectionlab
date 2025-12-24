/**
 * useVitalDatePicker Hook
 *
 * Reusable hook for managing vital date selection with validation.
 * Handles date state, validation, and backdate warnings.
 *
 * Separation of Concerns:
 * - UI logic separated from business logic
 * - Delegates validation to service layer
 * - Returns clean API for components
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { validateVitalDate } from '@/lib/vital-date-validator'
import { checkDuplicateVital } from '@/lib/services/vital-service'
import type { VitalSign } from '@/types/medical'

export interface UseVitalDatePickerOptions {
  patientCreatedAt: string | Date
  userPlanTier?: 'free' | 'premium' | 'enterprise'
  existingVitals?: VitalSign[]
  vitalType?: string
  initialDate?: string | Date
  onValidationChange?: (isValid: boolean) => void
}

export interface VitalDatePickerState {
  // Date state
  selectedDate: string // ISO string
  isValid: boolean
  error: string | null

  // Backdate info
  isBackdated: boolean
  daysDifference: number

  // Duplicate detection
  hasDuplicate: boolean
  duplicateVital?: VitalSign
  duplicateWarning?: string

  // Actions
  setDate: (date: string | Date) => void
  reset: () => void
  validateDate: () => boolean
}

export function useVitalDatePicker({
  patientCreatedAt,
  userPlanTier = 'free',
  existingVitals = [],
  vitalType,
  initialDate,
  onValidationChange
}: UseVitalDatePickerOptions): VitalDatePickerState {
  // Convert initial date to ISO string
  const getInitialDate = () => {
    if (initialDate) {
      return typeof initialDate === 'string'
        ? initialDate
        : initialDate.toISOString()
    }
    return new Date().toISOString()
  }

  const [selectedDate, setSelectedDate] = useState<string>(getInitialDate())
  const [isValid, setIsValid] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isBackdated, setIsBackdated] = useState<boolean>(false)
  const [daysDifference, setDaysDifference] = useState<number>(0)
  const [hasDuplicate, setHasDuplicate] = useState<boolean>(false)
  const [duplicateVital, setDuplicateVital] = useState<VitalSign | undefined>()
  const [duplicateWarning, setDuplicateWarning] = useState<string | undefined>()

  // Validate date using service layer (DRY)
  const validateDate = useCallback((): boolean => {
    if (!selectedDate) {
      setIsValid(false)
      setError('Date is required')
      return false
    }

    const patientCreated = typeof patientCreatedAt === 'string'
      ? new Date(patientCreatedAt)
      : patientCreatedAt

    const validation = validateVitalDate(
      new Date(selectedDate),
      patientCreated,
      userPlanTier,
      new Date()
    )

    setIsValid(validation.isValid)
    setError(validation.error || null)
    setIsBackdated(validation.isBackdated || false)
    setDaysDifference(validation.daysDifference || 0)

    // Check for duplicates if vital type is provided
    if (validation.isValid && vitalType && existingVitals.length > 0) {
      const duplicateCheck = checkDuplicateVital(
        existingVitals,
        vitalType,
        new Date(selectedDate)
      )

      setHasDuplicate(duplicateCheck.isDuplicate)
      setDuplicateVital(duplicateCheck.existingVital)
      setDuplicateWarning(duplicateCheck.message)

      // Duplicates are considered invalid
      if (duplicateCheck.isDuplicate) {
        setIsValid(false)
        setError(duplicateCheck.message || 'Duplicate entry detected')
        return false
      }
    }

    return validation.isValid
  }, [selectedDate, patientCreatedAt, userPlanTier, vitalType, existingVitals])

  // Validate whenever dependencies change
  useEffect(() => {
    const valid = validateDate()
    onValidationChange?.(valid)
  }, [validateDate, onValidationChange])

  // Set date handler
  const setDate = useCallback((date: string | Date) => {
    const isoDate = typeof date === 'string' ? date : date.toISOString()
    setSelectedDate(isoDate)
  }, [])

  // Reset to today
  const reset = useCallback(() => {
    setSelectedDate(new Date().toISOString())
    setIsValid(true)
    setError(null)
    setIsBackdated(false)
    setDaysDifference(0)
    setHasDuplicate(false)
    setDuplicateVital(undefined)
    setDuplicateWarning(undefined)
  }, [])

  return {
    selectedDate,
    isValid,
    error,
    isBackdated,
    daysDifference,
    hasDuplicate,
    duplicateVital,
    duplicateWarning,
    setDate,
    reset,
    validateDate
  }
}
