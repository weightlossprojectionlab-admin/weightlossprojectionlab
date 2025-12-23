/**
 * Household Duties & Task Management Types
 *
 * Types for managing household duties that caregivers perform
 * as part of their caregiving responsibilities.
 */

// ==================== DUTY TYPES ====================

export type DutyCategory =
  | 'laundry'
  | 'shopping'
  | 'cleaning_bedroom'
  | 'cleaning_bathroom'
  | 'cleaning_kitchen'
  | 'cleaning_living_areas'
  | 'meal_preparation'
  | 'grocery_shopping'
  | 'medication_pickup'
  | 'transportation'
  | 'personal_care'
  | 'pet_care'
  | 'yard_work'
  | 'custom'

export type DutyFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'as_needed'
  | 'custom'

export type DutyStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'overdue'

export type DutyPriority = 'low' | 'medium' | 'high' | 'urgent'

// ==================== PREDEFINED DUTIES ====================

export interface PredefinedDuty {
  id: string
  category: DutyCategory
  name: string
  description: string
  estimatedDuration?: number // in minutes
  defaultFrequency?: DutyFrequency
  subtasks?: string[]
}

export const PREDEFINED_DUTIES: Record<DutyCategory, PredefinedDuty[]> = {
  laundry: [
    {
      id: 'laundry_wash',
      category: 'laundry',
      name: 'Wash Laundry',
      description: 'Wash clothes, bedding, or towels',
      estimatedDuration: 90,
      defaultFrequency: 'weekly',
      subtasks: ['Sort clothes', 'Load washer', 'Add detergent', 'Transfer to dryer', 'Fold and put away']
    },
    {
      id: 'laundry_fold',
      category: 'laundry',
      name: 'Fold and Put Away Laundry',
      description: 'Fold clean laundry and organize in closet/drawers',
      estimatedDuration: 30,
      defaultFrequency: 'weekly'
    },
    {
      id: 'laundry_iron',
      category: 'laundry',
      name: 'Iron Clothes',
      description: 'Iron shirts, pants, or other garments',
      estimatedDuration: 20,
      defaultFrequency: 'as_needed'
    }
  ],
  shopping: [
    {
      id: 'grocery_shopping',
      category: 'shopping',
      name: 'Grocery Shopping',
      description: 'Purchase groceries based on shopping list',
      estimatedDuration: 60,
      defaultFrequency: 'weekly',
      subtasks: ['Review shopping list', 'Shop for items', 'Check expiration dates', 'Unpack and organize']
    },
    {
      id: 'pharmacy_pickup',
      category: 'shopping',
      name: 'Pharmacy Pickup',
      description: 'Pick up prescriptions from pharmacy',
      estimatedDuration: 20,
      defaultFrequency: 'as_needed'
    },
    {
      id: 'household_supplies',
      category: 'shopping',
      name: 'Household Supplies',
      description: 'Purchase cleaning supplies, toiletries, etc.',
      estimatedDuration: 30,
      defaultFrequency: 'monthly'
    }
  ],
  cleaning_bedroom: [
    {
      id: 'bedroom_clean',
      category: 'cleaning_bedroom',
      name: 'Clean Bedroom',
      description: 'Vacuum, dust, and organize bedroom',
      estimatedDuration: 30,
      defaultFrequency: 'weekly',
      subtasks: ['Make bed', 'Vacuum floor', 'Dust surfaces', 'Organize belongings', 'Empty trash']
    },
    {
      id: 'change_bedding',
      category: 'cleaning_bedroom',
      name: 'Change Bedding',
      description: 'Replace sheets and pillowcases',
      estimatedDuration: 15,
      defaultFrequency: 'weekly'
    }
  ],
  cleaning_bathroom: [
    {
      id: 'bathroom_clean',
      category: 'cleaning_bathroom',
      name: 'Clean Bathroom',
      description: 'Clean toilet, sink, shower/tub, and floors',
      estimatedDuration: 45,
      defaultFrequency: 'weekly',
      subtasks: ['Clean toilet', 'Scrub sink', 'Clean shower/tub', 'Wipe mirrors', 'Mop floor', 'Restock supplies']
    },
    {
      id: 'bathroom_deep_clean',
      category: 'cleaning_bathroom',
      name: 'Deep Clean Bathroom',
      description: 'Thorough bathroom cleaning including grout and fixtures',
      estimatedDuration: 90,
      defaultFrequency: 'monthly'
    }
  ],
  cleaning_kitchen: [
    {
      id: 'kitchen_clean',
      category: 'cleaning_kitchen',
      name: 'Clean Kitchen',
      description: 'Wipe counters, clean appliances, wash dishes',
      estimatedDuration: 45,
      defaultFrequency: 'daily',
      subtasks: ['Wash dishes', 'Wipe counters', 'Clean stovetop', 'Clean sink', 'Sweep floor', 'Empty trash']
    },
    {
      id: 'kitchen_deep_clean',
      category: 'cleaning_kitchen',
      name: 'Deep Clean Kitchen',
      description: 'Deep clean oven, fridge, and cabinets',
      estimatedDuration: 120,
      defaultFrequency: 'monthly'
    },
    {
      id: 'fridge_organize',
      category: 'cleaning_kitchen',
      name: 'Organize Refrigerator',
      description: 'Remove expired items and organize fridge',
      estimatedDuration: 30,
      defaultFrequency: 'weekly'
    }
  ],
  cleaning_living_areas: [
    {
      id: 'living_areas_clean',
      category: 'cleaning_living_areas',
      name: 'Clean Living Areas',
      description: 'Vacuum, dust, and organize common spaces',
      estimatedDuration: 60,
      defaultFrequency: 'weekly',
      subtasks: ['Vacuum carpets', 'Dust furniture', 'Clean windows', 'Organize items', 'Empty trash']
    }
  ],
  meal_preparation: [
    {
      id: 'prepare_breakfast',
      category: 'meal_preparation',
      name: 'Prepare Breakfast',
      description: 'Make breakfast for patient/household',
      estimatedDuration: 30,
      defaultFrequency: 'daily'
    },
    {
      id: 'prepare_lunch',
      category: 'meal_preparation',
      name: 'Prepare Lunch',
      description: 'Make lunch for patient/household',
      estimatedDuration: 45,
      defaultFrequency: 'daily'
    },
    {
      id: 'prepare_dinner',
      category: 'meal_preparation',
      name: 'Prepare Dinner',
      description: 'Make dinner for patient/household',
      estimatedDuration: 60,
      defaultFrequency: 'daily'
    },
    {
      id: 'meal_prep_weekly',
      category: 'meal_preparation',
      name: 'Weekly Meal Prep',
      description: 'Prepare meals in advance for the week',
      estimatedDuration: 180,
      defaultFrequency: 'weekly'
    }
  ],
  grocery_shopping: [
    {
      id: 'weekly_groceries',
      category: 'grocery_shopping',
      name: 'Weekly Groceries',
      description: 'Main grocery shopping trip',
      estimatedDuration: 90,
      defaultFrequency: 'weekly'
    }
  ],
  medication_pickup: [
    {
      id: 'prescription_pickup',
      category: 'medication_pickup',
      name: 'Pick Up Prescriptions',
      description: 'Collect medications from pharmacy',
      estimatedDuration: 20,
      defaultFrequency: 'as_needed'
    }
  ],
  transportation: [
    {
      id: 'transport_appointment',
      category: 'transportation',
      name: 'Transport to Appointment',
      description: 'Drive patient to medical appointment',
      estimatedDuration: 120,
      defaultFrequency: 'as_needed'
    },
    {
      id: 'transport_errands',
      category: 'transportation',
      name: 'Transport for Errands',
      description: 'Drive patient for errands or activities',
      estimatedDuration: 60,
      defaultFrequency: 'as_needed'
    }
  ],
  personal_care: [
    {
      id: 'bathing_assistance',
      category: 'personal_care',
      name: 'Bathing Assistance',
      description: 'Help patient with bathing/showering',
      estimatedDuration: 30,
      defaultFrequency: 'daily'
    },
    {
      id: 'dressing_assistance',
      category: 'personal_care',
      name: 'Dressing Assistance',
      description: 'Help patient get dressed',
      estimatedDuration: 15,
      defaultFrequency: 'daily'
    },
    {
      id: 'grooming_assistance',
      category: 'personal_care',
      name: 'Grooming Assistance',
      description: 'Help with hair, teeth brushing, shaving',
      estimatedDuration: 20,
      defaultFrequency: 'daily'
    }
  ],
  pet_care: [
    {
      id: 'feed_pet',
      category: 'pet_care',
      name: 'Feed Pet',
      description: 'Give pet food and fresh water',
      estimatedDuration: 10,
      defaultFrequency: 'daily'
    },
    {
      id: 'walk_pet',
      category: 'pet_care',
      name: 'Walk Pet',
      description: 'Take pet for a walk',
      estimatedDuration: 30,
      defaultFrequency: 'daily'
    },
    {
      id: 'clean_litter_box',
      category: 'pet_care',
      name: 'Clean Litter Box',
      description: 'Clean cat litter box',
      estimatedDuration: 10,
      defaultFrequency: 'daily'
    }
  ],
  yard_work: [
    {
      id: 'mow_lawn',
      category: 'yard_work',
      name: 'Mow Lawn',
      description: 'Cut grass in yard',
      estimatedDuration: 60,
      defaultFrequency: 'weekly'
    },
    {
      id: 'rake_leaves',
      category: 'yard_work',
      name: 'Rake Leaves',
      description: 'Rake and bag fallen leaves',
      estimatedDuration: 45,
      defaultFrequency: 'weekly'
    },
    {
      id: 'water_plants',
      category: 'yard_work',
      name: 'Water Plants',
      description: 'Water indoor and outdoor plants',
      estimatedDuration: 15,
      defaultFrequency: 'daily'
    }
  ],
  custom: []
}

// ==================== HOUSEHOLD DUTY ====================

export interface HouseholdDuty {
  id: string
  householdId: string // PRIMARY: Which household this duty belongs to
  forPatientId?: string // OPTIONAL: Specific patient context (e.g., "Give medication to Mom")
  userId: string // Account owner who created this duty

  // Duty details
  category: DutyCategory
  name: string
  description?: string
  isCustom: boolean // true if user created custom duty

  // Assignment
  assignedTo: string[] // userId(s) of caregiver(s) assigned
  assignedBy: string // userId who made the assignment
  assignedAt: string // ISO 8601

  // Scheduling
  frequency: DutyFrequency
  customSchedule?: {
    // For custom frequency
    days?: string[] // ['monday', 'wednesday', 'friday']
    times?: string[] // ['09:00', '14:00'] in 24-hour format
    interval?: number // Every N days
  }
  nextDueDate?: string // ISO 8601

  // Tracking
  priority: DutyPriority
  estimatedDuration?: number // in minutes
  subtasks?: string[]

  // Status
  status: DutyStatus
  lastCompletedAt?: string // ISO 8601
  lastCompletedBy?: string // userId

  // Completion history
  completionCount: number
  skipCount: number

  // Notifications
  notifyOnCompletion: boolean
  notifyOnOverdue: boolean
  reminderEnabled: boolean
  reminderTime?: string // HH:MM format for reminder

  // Metadata
  createdAt: string // ISO 8601
  createdBy: string // userId
  lastModified: string // ISO 8601
  modifiedBy?: string // userId
  isActive: boolean // Can be deactivated without deleting

  // Notes
  notes?: string // Additional instructions
  specialInstructions?: string[]
}

// ==================== DUTY COMPLETION ====================

export interface DutyCompletion {
  id: string
  dutyId: string
  patientId?: string // Optional - only for patient-specific duties

  // Completion details
  completedBy: string // userId of caregiver
  completedAt: string // ISO 8601
  duration?: number // Actual time taken in minutes

  // Quality tracking
  rating?: number // 1-5 stars (optional, for quality tracking)
  feedback?: string
  issuesEncountered?: string[]

  // Photos (optional proof of completion)
  photos?: string[] // URLs to completion photos

  // Subtask completion
  subtasksCompleted?: string[]

  // Notes
  notes?: string

  // Metadata
  createdAt: string // ISO 8601
}

// ==================== DUTY TEMPLATE ====================

export interface DutyTemplate {
  id: string
  userId: string // Account owner who created template

  // Template details
  name: string
  description?: string
  category: DutyCategory

  // Duty configuration
  duties: {
    name: string
    category: DutyCategory
    frequency: DutyFrequency
    priority: DutyPriority
    estimatedDuration?: number
    subtasks?: string[]
  }[]

  // Usage tracking
  usageCount: number
  lastUsedAt?: string

  // Metadata
  createdAt: string
  isPublic: boolean // Can other users see/use this template?
}

// ==================== FILTERS & QUERIES ====================

export interface DutyFilters {
  householdId?: string // PRIMARY filter
  forPatientId?: string // OPTIONAL - filter duties for specific patient
  assignedTo?: string // Filter by caregiver
  category?: DutyCategory | DutyCategory[]
  status?: DutyStatus | DutyStatus[]
  priority?: DutyPriority | DutyPriority[]
  frequency?: DutyFrequency
  isActive?: boolean
  overdueOnly?: boolean
  dueSoon?: boolean // Due within next 24 hours
}

export interface DutyStats {
  total: number
  byStatus: Record<DutyStatus, number>
  byCategory: Record<DutyCategory, number>
  overdue: number
  completedThisWeek: number
  completedThisMonth: number
  averageCompletionTime?: number
  completionRate?: number // Percentage
}

// ==================== API TYPES ====================

export interface CreateDutyRequest {
  householdId: string // PRIMARY - which household
  forPatientId?: string // OPTIONAL - patient-specific context
  category: DutyCategory
  name: string
  description?: string
  assignedTo: string[]
  frequency: DutyFrequency
  customSchedule?: HouseholdDuty['customSchedule']
  priority: DutyPriority
  estimatedDuration?: number
  subtasks?: string[]
  notifyOnCompletion?: boolean
  notifyOnOverdue?: boolean
  reminderEnabled?: boolean
  reminderTime?: string
  notes?: string
  specialInstructions?: string[]
}

export interface UpdateDutyRequest {
  name?: string
  description?: string
  assignedTo?: string[]
  frequency?: DutyFrequency
  customSchedule?: HouseholdDuty['customSchedule']
  priority?: DutyPriority
  estimatedDuration?: number
  subtasks?: string[]
  notifyOnCompletion?: boolean
  notifyOnOverdue?: boolean
  reminderEnabled?: boolean
  reminderTime?: string
  notes?: string
  specialInstructions?: string[]
  isActive?: boolean
}

export interface CompleteDutyRequest {
  duration?: number
  rating?: number
  feedback?: string
  issuesEncountered?: string[]
  photos?: string[]
  subtasksCompleted?: string[]
  notes?: string
}

export interface DutyListResponse {
  duties: HouseholdDuty[]
  stats: DutyStats
  total: number
  page: number
  limit: number
  hasMore: boolean
}
