/**
 * Per-vital-type color schemes for cards, headers, trend charts.
 *
 * The same palette already in use on the wizard's success modal —
 * extracted here so the patient-detail dashboard's small-multiples
 * grid AND the modal AND any future surface (vitals history, daily
 * summary cards) read from one place. Visual consistency without
 * each component re-deciding what color "blood pressure" means.
 */

export interface VitalColorScheme {
  bg: string
  border: string
  text: string
  icon: string
}

const SCHEMES: Record<string, VitalColorScheme> = {
  blood_pressure: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-900 dark:text-red-100',
    icon: 'text-red-600 dark:text-red-400',
  },
  temperature: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-900 dark:text-orange-100',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  pulse_oximeter: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-900 dark:text-purple-100',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  blood_sugar: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-900 dark:text-green-100',
    icon: 'text-green-600 dark:text-green-400',
  },
  weight: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-900 dark:text-blue-100',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  mood: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    border: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-900 dark:text-indigo-100',
    icon: 'text-indigo-600 dark:text-indigo-400',
  },
}

const FALLBACK: VitalColorScheme = {
  bg: 'bg-gray-100 dark:bg-gray-800',
  border: 'border-gray-200 dark:border-gray-700',
  text: 'text-gray-900 dark:text-gray-100',
  icon: 'text-gray-600 dark:text-gray-400',
}

export function getVitalColors(type: string): VitalColorScheme {
  return SCHEMES[type] ?? FALLBACK
}
