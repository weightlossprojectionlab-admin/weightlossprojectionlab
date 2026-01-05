/**
 * Pet Feeding System Type Definitions
 * Compliance-based feeding tracking (vs. variety-based meal logging for humans)
 */

import { Timestamp } from 'firebase/firestore'

// ==================== FOOD PROFILES ====================

/**
 * Pet Food Profile
 * One-time setup for each food brand/type the pet eats
 * Scan barcode or enter manually
 */
export interface PetFoodProfile {
  id: string
  petId: string

  // Food Information
  foodName: string // "Purina Dog Chow Complete Adult"
  brand: string // "Purina"
  foodType: 'dry' | 'wet' | 'raw' | 'freeze-dried' | 'homemade' | 'prescription'
  barcode?: string // UPC from barcode scan

  // Nutrition (per serving)
  servingSize: number // 1 cup, 100g, 1 can
  servingUnit: 'cups' | 'grams' | 'oz' | 'cans' | 'tbsp'
  caloriesPerServing: number
  proteinGrams?: number
  fatGrams?: number
  fiberGrams?: number
  carbsGrams?: number

  // Ingredients (optional, from barcode API)
  ingredients?: string[]
  allergens?: string[] // Chicken, beef, grain, dairy, etc.

  // Active Status
  isCurrentFood: boolean // Active food vs. historical
  startedAt: string // ISO 8601 - When pet started eating this food
  endedAt?: string // ISO 8601 - When pet stopped eating this food

  // Metadata
  imageUrl?: string // Photo of food bag/can
  purchaseLocation?: string // "Petco", "Amazon", "Vet"
  purchaseUrl?: string // Link to reorder
  notes?: string // "Sensitive stomach formula", "Prescription diet"

  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string // userId
}

// ==================== FEEDING SCHEDULE ====================

/**
 * Feeding Schedule
 * Defines when and how much pet should eat
 */
export interface FeedingSchedule {
  id: string
  petId: string

  // Schedule Configuration
  frequency: 'once' | 'twice' | 'three-times' | 'four-times' | 'free-feeding' | 'custom'
  feedingTimes: string[] // ["08:00", "18:00"] - Local time HH:mm format

  // Default Portions
  defaultPortionSize: number // 1.5 cups, 200g, 1 can
  defaultPortionUnit: 'cups' | 'grams' | 'oz' | 'cans' | 'tbsp'

  // Active Food Reference
  primaryFoodId: string // FK to PetFoodProfile
  secondaryFoodId?: string // For mixed feeding (e.g., kibble + wet food)
  mixRatio?: number // If using secondary food, what % (e.g., 75% primary, 25% secondary)

  // Treats Budget
  maxTreatsPerDay?: number // Limit treats to prevent overfeeding
  maxTreatCaloriesPerDay?: number // Or limit by calories

  // Notifications
  reminderEnabled: boolean
  reminderMinutesBefore: number // 15 minutes before feeding time
  notificationChannels: {
    push: boolean
    email: boolean
    sms: boolean
  }

  // Status
  isActive: boolean
  startedAt: string // ISO 8601
  endedAt?: string // ISO 8601 (if schedule was changed)

  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string // userId
}

// ==================== FEEDING LOGS ====================

/**
 * Feeding Log
 * Daily compliance tracking - did the pet eat?
 */
export interface FeedingLog {
  id: string
  petId: string

  // Scheduled vs. Actual
  scheduledFor: string // ISO 8601 - "2025-12-30T08:00:00Z"
  scheduledDate: string // YYYY-MM-DD for indexing
  scheduledTime: string // "08:00" - Local time for display
  fedAt?: string // ISO 8601 - Actual time fed (null if skipped/pending)

  // Compliance Status
  status: 'pending' | 'fed' | 'skipped' | 'late'
  skippedReason?: 'pet-refused' | 'forgot' | 'not-home' | 'vet-instructions' | 'other'

  // Appetite Assessment
  appetiteLevel: 'ate-all' | 'ate-most' | 'ate-some' | 'ate-little' | 'refused' | null
  appetitePercentage?: number // 0-100% - more precise than levels

  // Portion Details
  foodProfileId: string // FK to PetFoodProfile
  portionSize: number // Actual amount given (may differ from scheduled)
  portionUnit: 'cups' | 'grams' | 'oz' | 'cans' | 'tbsp'
  caloriesConsumed?: number // Calculated from portion + appetite

  // Exceptions
  wasTreat: boolean // If this was a treat instead of regular meal
  wasTableFood: boolean // If they got human food instead
  tableFoodDescription?: string // "chicken breast, green beans"
  tableFoodCalories?: number

  // Medication Tracking
  medicationHidden: boolean // If medication was mixed in food
  medicationIds?: string[] // FK to medications in medications collection
  medicationTaken: boolean // Did they eat the food with medication?

  // Health Observations
  vomitedAfter: boolean
  vomitedMinutesAfter?: number // How long after eating
  diarrheaAfter: boolean
  behaviorNotes?: string // "Seemed hungry", "Picked at food", "Ate slowly"

  // Speed of Eating (can indicate health issues)
  eatingSpeed?: 'very-fast' | 'normal' | 'slow' | 'very-slow'

  // Who Fed
  fedBy: string // userId of family member who fed pet
  fedByName?: string // Denormalized for display

  // Attachments
  photoUrl?: string // Photo of food bowl before/after

  createdAt: Timestamp
  updatedAt: Timestamp
}

// ==================== TREAT LOGS ====================

/**
 * Treat Log
 * Ad-hoc treats given throughout the day
 */
export interface TreatLog {
  id: string
  petId: string

  // Treat Information
  treatName: string // "Milk Bone", "Greenies Dental Chew", "Carrot"
  treatType: 'commercial-treat' | 'dental-chew' | 'training-treat' | 'table-food' | 'vegetable' | 'fruit' | 'other'
  brand?: string // "Milk Bone", "Greenies"

  // Quantity
  quantity: number // 3 treats, 1 bully stick, 1/4 apple
  quantityUnit?: string // "treats", "sticks", "slices"
  calories?: number // If known

  // Reason
  reason: 'reward' | 'training' | 'medication' | 'dental-health' | 'enrichment' | 'just-because'
  trainingContext?: string // "Sit command", "Recall training"

  // Timestamp
  givenAt: string // ISO 8601
  givenBy: string // userId
  givenByName?: string // Denormalized

  // Health Tracking
  vomitedAfter?: boolean
  diarrheaAfter?: boolean

  notes?: string
  createdAt: Timestamp
}

// ==================== FOOD TRANSITIONS ====================

/**
 * Food Transition
 * Track gradual food transitions (7-day method)
 */
export interface FoodTransition {
  id: string
  petId: string

  // Transition Details
  oldFoodId: string // FK to PetFoodProfile
  newFoodId: string // FK to PetFoodProfile
  reason: 'age-change' | 'health-issue' | 'preference' | 'prescription' | 'cost' | 'other'

  // Timeline
  startDate: string // ISO 8601
  endDate: string // ISO 8601 (usually 7 days later)
  currentDay: number // 1-7

  // Daily Mix Ratios
  transitionSchedule: {
    day: number // 1-7
    oldFoodPercentage: number // 75% old, 25% new on day 3
    newFoodPercentage: number
  }[]

  // Tolerance Tracking
  toleratingWell: boolean
  issues?: string[] // "vomiting", "diarrhea", "refusal", "gas"
  notes?: string

  // Status
  status: 'in-progress' | 'completed' | 'aborted'
  completedAt?: string // ISO 8601

  createdAt: Timestamp
  updatedAt: Timestamp
}

// ==================== FOOD INVENTORY ====================

/**
 * Food Inventory
 * Track how much food is left, auto-reorder reminders
 */
export interface FoodInventory {
  id: string
  petId: string
  foodProfileId: string // FK to PetFoodProfile

  // Bag/Container Info
  bagSize: number // 40 lbs, 24 cans, 12 pouches
  bagSizeUnit: 'lbs' | 'kg' | 'oz' | 'cans' | 'pouches'
  openedAt: string // ISO 8601

  // Consumption Tracking
  dailyConsumptionRate: number // Calculated from feeding logs
  estimatedDaysRemaining: number // Based on current usage

  // Reorder Alerts
  reorderThreshold: number // Notify when < 7 days remaining
  reorderAlertSent: boolean
  reorderAlertSentAt?: string // ISO 8601

  // Purchase Info
  purchasedAt?: string // ISO 8601
  purchaseLocation?: string
  purchaseUrl?: string // Amazon, Chewy, etc.
  pricePerBag?: number

  // Status
  status: 'full' | 'half' | 'low' | 'empty'

  createdAt: Timestamp
  updatedAt: Timestamp
}

// ==================== ANALYTICS ====================

/**
 * Feeding Analytics (Computed)
 * Weekly/monthly summaries
 */
export interface FeedingAnalytics {
  petId: string
  periodStart: string // ISO 8601
  periodEnd: string // ISO 8601
  periodType: 'week' | 'month' | 'year'

  // Compliance Metrics
  totalScheduledMeals: number
  totalMealsFed: number
  complianceRate: number // % (e.g., 95%)
  missedMeals: number
  lateMeals: number // Fed >30 min after scheduled time

  // Appetite Metrics
  averageAppetite: number // 0-100% average of appetitePercentage
  refusedMeals: number
  ateAllMeals: number

  // Appetite Trend
  appetiteTrend: 'improving' | 'stable' | 'declining' | 'volatile'
  appetiteByDay: { // Day-by-day breakdown
    date: string
    avgAppetite: number
    mealsCount: number
  }[]

  // Calorie Metrics
  totalCaloriesConsumed: number
  avgCaloriesPerDay: number
  targetCaloriesPerDay: number
  calorieDeficit?: number // Negative if under-eating
  calorieSurplus?: number // Positive if over-eating

  // Treat Metrics
  totalTreats: number
  totalTreatCalories: number
  avgTreatsPerDay: number

  // Health Alerts
  vomitingIncidents: number
  diarrheaIncidents: number
  refusalStreak: number // Days in a row with refused meals

  // Flags
  needsVetAttention: boolean // If appetite dropped >20% or 2+ consecutive refusals
  alertReason?: string

  generatedAt: string // ISO 8601
}

// ==================== HELPER TYPES ====================

export type AppetiteLevel = 'ate-all' | 'ate-most' | 'ate-some' | 'ate-little' | 'refused'
export type FeedingStatus = 'pending' | 'fed' | 'skipped' | 'late'
export type FoodType = 'dry' | 'wet' | 'raw' | 'freeze-dried' | 'homemade' | 'prescription'
export type TreatType = 'commercial-treat' | 'dental-chew' | 'training-treat' | 'table-food' | 'vegetable' | 'fruit' | 'other'
export type FeedingFrequency = 'once' | 'twice' | 'three-times' | 'four-times' | 'free-feeding' | 'custom'
export type PortionUnit = 'cups' | 'grams' | 'oz' | 'cans' | 'tbsp'

// ==================== REQUEST/RESPONSE TYPES ====================

/**
 * Request to create a feeding log
 */
export interface CreateFeedingLogRequest {
  petId: string
  scheduledFor: string
  foodProfileId: string
  portionSize: number
  portionUnit: PortionUnit
  appetiteLevel?: AppetiteLevel
  fedAt?: string
  medicationHidden?: boolean
  medicationIds?: string[]
  notes?: string
}

/**
 * Request to log a treat
 */
export interface CreateTreatLogRequest {
  petId: string
  treatName: string
  treatType: TreatType
  quantity: number
  reason: string
  calories?: number
  notes?: string
}

/**
 * Quick log response (just the essentials for UI)
 */
export interface QuickFeedingStatus {
  scheduledFor: string
  scheduledTime: string
  status: FeedingStatus
  isPast: boolean
  canLogNow: boolean
  foodName: string
  portionSize: number
  portionUnit: PortionUnit
}
