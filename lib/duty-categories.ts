/**
 * Human-readable labels for DutyCategory — shared by the rate-card editor and
 * the package coverage toggles so the vocabulary stays in one place.
 */

import type { DutyCategory } from '@/types/household-duties'

export const DUTY_CATEGORY_LABEL: Record<DutyCategory, string> = {
  laundry: 'Laundry',
  shopping: 'Shopping',
  cleaning_bedroom: 'Bedroom cleaning',
  cleaning_bathroom: 'Bathroom cleaning',
  cleaning_kitchen: 'Kitchen cleaning',
  cleaning_living_areas: 'Living areas cleaning',
  meal_preparation: 'Meal preparation',
  grocery_shopping: 'Grocery run',
  medication_pickup: 'Medication pickup',
  transportation: 'Transportation',
  personal_care: 'Personal care',
  pet_care: 'Pet care',
  yard_work: 'Yard work',
  custom: 'Custom / other',
}

export const ALL_DUTY_CATEGORIES = Object.keys(DUTY_CATEGORY_LABEL) as DutyCategory[]
