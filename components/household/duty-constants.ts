/**
 * Shared constants for household duty components
 */

import type { DutyCategory, DutyPriority } from '@/types/household-duties'

export const DUTY_CATEGORY_LABELS: Record<DutyCategory, string> = {
  laundry: 'Laundry',
  shopping: 'Shopping',
  cleaning_bedroom: 'Bedroom Cleaning',
  cleaning_bathroom: 'Bathroom Cleaning',
  cleaning_kitchen: 'Kitchen Cleaning',
  cleaning_living_areas: 'Living Areas',
  meal_preparation: 'Meal Prep',
  grocery_shopping: 'Grocery Shopping',
  medication_pickup: 'Medication',
  transportation: 'Transportation',
  personal_care: 'Personal Care',
  pet_care: 'Pet Care',
  yard_work: 'Yard Work',
  custom: 'Custom',
}

export const DUTY_CATEGORY_COLORS: Record<DutyCategory, string> = {
  laundry: 'bg-blue-500',
  shopping: 'bg-purple-500',
  cleaning_bedroom: 'bg-teal-500',
  cleaning_bathroom: 'bg-cyan-500',
  cleaning_kitchen: 'bg-orange-500',
  cleaning_living_areas: 'bg-emerald-500',
  meal_preparation: 'bg-amber-500',
  grocery_shopping: 'bg-violet-500',
  medication_pickup: 'bg-red-500',
  transportation: 'bg-indigo-500',
  personal_care: 'bg-pink-500',
  pet_care: 'bg-lime-500',
  yard_work: 'bg-green-500',
  custom: 'bg-gray-500',
}

export const DUTY_PRIORITY_COLORS: Record<DutyPriority, string> = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
  urgent: 'bg-red-500/20 text-red-400',
}
