/**
 * Vitals Wizard Transformation Utility
 *
 * Shared utility for transforming wizard vitals data into VitalSign format.
 * This consolidates duplicate transformation logic across the application.
 *
 * DRY principle: Single source of truth for vitals data transformation.
 */

import type { VitalSign } from '@/types/medical'

export interface WizardVitalData {
  bloodPressure?: {
    systolic: number
    diastolic: number
  }
  temperature?: number
  heartRate?: number
  oxygenSaturation?: number
  bloodSugar?: number
  timestamp: Date
  notes?: string
}

export interface VitalSignInput {
  type: 'blood_pressure' | 'temperature' | 'pulse_oximeter' | 'blood_sugar'
  value: number | { systolic: number; diastolic: number } | { spo2: number; pulseRate: number }
  unit: string
  recordedAt: string
  notes: string
  method: 'manual' | 'device'
}

/**
 * Transforms wizard vital data into an array of VitalSign inputs ready for API submission.
 *
 * @param wizardData - The vitals data collected from the wizard
 * @returns Array of VitalSignInput objects ready for logging
 *
 * @example
 * const wizardData = {
 *   bloodPressure: { systolic: 120, diastolic: 80 },
 *   temperature: 98.6,
 *   timestamp: new Date(),
 *   notes: 'Feeling fine'
 * }
 * const vitalsToLog = transformWizardDataToVitals(wizardData)
 * // Returns array with blood_pressure and temperature vitals
 */
export function transformWizardDataToVitals(
  wizardData: WizardVitalData
): VitalSignInput[] {
  const vitals: VitalSignInput[] = []
  const recordedAt = wizardData.timestamp.toISOString()
  const notes = wizardData.notes || ''

  // Blood Pressure
  if (wizardData.bloodPressure) {
    vitals.push({
      type: 'blood_pressure',
      value: {
        systolic: wizardData.bloodPressure.systolic,
        diastolic: wizardData.bloodPressure.diastolic
      },
      unit: 'mmHg',
      recordedAt,
      notes,
      method: 'manual'
    })
  }

  // Temperature
  if (wizardData.temperature) {
    vitals.push({
      type: 'temperature',
      value: wizardData.temperature,
      unit: '°F',
      recordedAt,
      notes,
      method: 'manual'
    })
  }

  // Pulse Oximeter (combines heart rate and oxygen saturation)
  // Only create if at least one measurement is present
  if (wizardData.heartRate !== undefined || wizardData.oxygenSaturation !== undefined) {
    vitals.push({
      type: 'pulse_oximeter',
      value: {
        spo2: wizardData.oxygenSaturation ?? 98,  // Default to 98% if not measured
        pulseRate: wizardData.heartRate ?? 72     // Default to 72 bpm if not measured
      },
      unit: 'SpO₂% / bpm',
      recordedAt,
      notes,
      method: 'manual'
    })
  }

  // Blood Sugar
  if (wizardData.bloodSugar) {
    vitals.push({
      type: 'blood_sugar',
      value: wizardData.bloodSugar,
      unit: 'mg/dL',
      recordedAt,
      notes,
      method: 'manual'
    })
  }

  return vitals
}

/**
 * Validates that at least one vital measurement is present in the wizard data.
 *
 * @param wizardData - The vitals data to validate
 * @returns true if at least one measurement exists, false otherwise
 */
export function hasAnyVitalMeasurement(wizardData: WizardVitalData): boolean {
  return !!(
    wizardData.bloodPressure ||
    wizardData.temperature ||
    wizardData.heartRate ||
    wizardData.oxygenSaturation ||
    wizardData.bloodSugar
  )
}

/**
 * Formats a vital sign value for display in summary views.
 *
 * @param type - The type of vital sign
 * @param value - The vital sign value
 * @param unit - The unit of measurement
 * @returns Formatted string for display
 */
export function formatVitalForDisplay(
  type: string,
  value: number | { systolic: number; diastolic: number } | { spo2: number; pulseRate: number },
  unit: string
): string {
  switch (type) {
    case 'blood_pressure':
      if (typeof value === 'object' && 'systolic' in value) {
        return `${value.systolic}/${value.diastolic} ${unit}`
      }
      return `${value} ${unit}`

    case 'pulse_oximeter':
      if (typeof value === 'object' && 'spo2' in value) {
        return `SpO₂: ${value.spo2}%, HR: ${value.pulseRate} bpm`
      }
      return `${value} ${unit}`

    default:
      return `${value} ${unit}`
  }
}

/**
 * Gets a human-readable label for a vital type.
 *
 * @param type - The vital sign type
 * @returns Human-readable label
 */
export function getVitalTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    blood_pressure: 'Blood Pressure',
    temperature: 'Temperature',
    pulse_oximeter: 'Pulse Oximeter',
    blood_sugar: 'Blood Sugar',
    weight: 'Weight',
    height: 'Height',
    bmi: 'BMI'
  }

  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
