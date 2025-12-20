/**
 * DATA ARCHITECTURE: Weight Tracking
 *
 * We use a two-tier system for weight data:
 *
 * 1. UserProfile.currentWeight (users/{uid}/profile.currentWeight)
 *    - Fallback weight from onboarding
 *    - Used when no weight logs exist yet
 *    - Static snapshot (not updated automatically)
 *
 * 2. WeightLog collection (weight-logs/{id})
 *    - PRIMARY SOURCE OF TRUTH for weight tracking
 *    - Historical entries for trends and charts
 *    - Dashboard uses most recent log for current weight
 *
 * 3. UserGoals.startWeight (users/{uid}/goals.startWeight)
 *    - Baseline weight for goal calculations
 *    - Used to calculate progress (% to target)
 *    - Set once during onboarding, rarely changes
 *
 * Why this architecture?
 * - WeightLog is the source of truth for tracking/analytics
 * - profile.currentWeight provides fallback for new users
 * - goals.startWeight is a fixed reference point for goal progress
 */

import { JsonObject } from './common'

// Caregiver Context - When user is invited as caregiver to someone else's family plan
export interface CaregiverContext {
  accountOwnerId: string // The account owner's userId
  accountOwnerName: string // Display name of account owner
  accountOwnerEmail?: string // Account owner's email
  role: string // Their role in that family ('caregiver', 'viewer', etc.)
  patientsAccess: string[] // Patient IDs they can access
  permissions: Record<string, boolean> // Granted permissions
  addedAt: string // ISO 8601 - when they were added as caregiver
  invitationId?: string // Original invitation ID
  familyPlan: true // Flag to indicate this is family plan caregiver access
}

// User Types
export interface User {
  id: string
  email: string
  name: string
  profile?: UserProfile
  goals?: UserGoals
  preferences: UserPreferences
  subscription?: UserSubscription  // Subscription plan and features
  caregiverOf?: CaregiverContext[]  // Accounts where this user is a caregiver (family plan only)
  createdAt: Date
  lastActiveAt: Date
}

// UNIFIED PRD - User Modes (from onboarding)
export type UserMode = 'single' | 'household' | 'caregiver'

export type PrimaryRole =
  | 'myself'
  | 'family'
  | 'caregiver'

export type FeaturePreference =
  | 'weight_loss'
  | 'meal_planning'
  | 'medical_tracking'
  | 'caregiving'
  | 'shopping_automation'
  | 'recipes'
  | 'fitness'
  | 'vitals'
  | 'medications'

export type HouseholdType =
  | 'alone'
  | 'partner'
  | 'family'
  | 'roommates'
  | 'dependents'

export type KitchenMode =
  | 'self'
  | 'others'
  | 'shared'
  | 'i_shop'
  | 'i_dont_shop'
  | 'delivery'
  | 'meal_kits'

export type MealLoggingOption =
  | 'photo'
  | 'manual'
  | 'both'
  | 'with_reminders'

// For backward compatibility and single-select scenarios
export type MealLoggingMode = MealLoggingOption | MealLoggingOption[]

export type AutomationLevel = 'yes' | 'no'

// Onboarding V2 Data (UNIFIED PRD)
export interface OnboardingAnswers {
  userMode: UserMode
  primaryRole: PrimaryRole
  featurePreferences: FeaturePreference[]
  householdType?: HouseholdType // Optional - legacy field, no longer collected
  kitchenMode: KitchenMode
  mealLoggingMode: MealLoggingMode
  automationLevel: AutomationLevel
  addFamilyNow: boolean
  completedAt: Date
}

// Person-Centric Onboarding (for family members, care recipients, pets)
export type PersonRole = 'self' | 'family_member' | 'care_recipient' | 'caregiver' | 'pet'
export type AutomationLevelExtended = 'light' | 'normal' | 'high'

export interface PersonOnboardingAnswers {
  personId: string // userId or patientId
  role: PersonRole
  goals: string[] // ['weight_loss', 'meal_planning', ...]
  conditions: string[] // ['diabetes', 'hypertension', ...]
  medicationsKnown: boolean
  trackingPreferences: {
    meals: boolean
    weight: boolean
    vitals: string[] // ['blood_pressure', 'blood_sugar', ...]
    meds: boolean
  }
  carePreferences: {
    automationLevel: AutomationLevelExtended
    notify: string[] // caregiver userIds
  }
  environment: {
    livesWithUser: boolean
    managesShopping: boolean
  }
  createdAt: Date
  updatedAt: Date
}

export interface UserPreferences {
  units: 'metric' | 'imperial'
  notifications: boolean
  biometricEnabled: boolean
  themePreference: 'light' | 'dark' | 'system' // Theme setting synced to Firestore
  stepTrackingEnabled?: boolean
  dietaryPreferences?: string[]
  mealReminderTimes?: {
    breakfast?: string
    lunch?: string
    dinner?: string
    snacks?: string
  }
  // Typical meal schedule - when user actually eats (used for meal suggestions)
  mealSchedule?: {
    breakfastTime: string  // e.g., "07:00" in 24-hour format
    lunchTime: string      // e.g., "12:30"
    dinnerTime: string     // e.g., "18:00"
    hasSnacks: boolean     // Whether user typically snacks
    snackWindows?: string[] // Optional snack times e.g., ["10:00", "15:00", "21:00"]
  }
  weightCheckInFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  primaryPatientId?: string // Default patient to show in dashboard (handles non-self accounts)

  // VITAL REMINDERS - Simple frequency-based reminders for all vital types
  // NOTE: This is separate from VitalMonitoringSchedule (advanced wizard schedules)
  // Profile reminders = simple frequency for casual monitoring
  // Wizard schedules = advanced multi-time schedules for medical compliance
  vitalReminders?: {
    blood_pressure?: {
      enabled: boolean
      frequency: 'daily' | 'twice-daily' | 'weekly' | 'monthly'
    }
    blood_sugar?: {
      enabled: boolean
      frequency: 'daily' | 'twice-daily' | 'three-times-daily' | 'four-times-daily'
    }
    temperature?: {
      enabled: boolean
      frequency: 'daily' | 'weekly' | 'biweekly'
    }
    pulse_oximeter?: {
      enabled: boolean
      frequency: 'daily' | 'twice-daily' | 'weekly'
    }
    weight?: {
      enabled: boolean
      frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
    }
  }

  // Legacy weight reminder fields (kept for backward compatibility)
  disableWeightReminders?: boolean

  // UNIFIED PRD - Onboarding V2
  onboardingAnswers?: OnboardingAnswers
  userMode?: UserMode  // Cached for quick access

  // Family Account Management
  isAccountOwner?: boolean // True if this user is the Account Owner (super admin) of their family
  accountOwnerSince?: string // ISO 8601 - when they became Account Owner
}

// Subscription & Feature Gating
// Subscription Plan Tiers
export type SubscriptionPlan =
  | 'free'             // Free trial: 1 seat, 14 days, basic features
  | 'single'           // Single User: 1 seat, weight loss only, 0 caregivers
  | 'single_plus'      // Single User Plus: 1 seat, weight loss + medical + 3 caregivers
  | 'family_basic'     // Family Basic: 5 seats, family features
  | 'family_plus'      // Family Plus: 10 seats, premium features (POPULAR)
  | 'family_premium'   // Family Premium: Unlimited seats, all features

// Billing Interval
export type BillingInterval = 'monthly' | 'yearly'

// Subscription Pricing (in USD cents)
export const SUBSCRIPTION_PRICING = {
  free: { monthly: 0, yearly: 0 },
  single: { monthly: 999, yearly: 9900 },           // $9.99/mo or $99/yr (17% off)
  single_plus: { monthly: 1499, yearly: 14900 },    // $14.99/mo or $149/yr (17% off)
  family_basic: { monthly: 1999, yearly: 19900 },   // $19.99/mo or $199/yr (17% off)
  family_plus: { monthly: 2999, yearly: 29900 },    // $29.99/mo or $299/yr (17% off) ⭐
  family_premium: { monthly: 3999, yearly: 39900 }, // $39.99/mo or $399/yr (17% off)
} as const

// Seat Limits per Plan
export const SEAT_LIMITS = {
  free: 1,
  single: 1,
  single_plus: 1,
  family_basic: 5,
  family_plus: 10,
  family_premium: 999, // Unlimited (using 999 as max)
} as const

// External Caregiver Limits per Plan
export const EXTERNAL_CAREGIVER_LIMITS = {
  free: 0,
  single: 0,
  single_plus: 3,
  family_basic: 5,
  family_plus: 10,
  family_premium: 999, // Unlimited
} as const

export interface UserSubscription {
  // Base plan tier
  plan: SubscriptionPlan

  // Billing
  billingInterval: BillingInterval
  currentPeriodStart: Date
  currentPeriodEnd: Date | null  // null means no expiration (grandfathered users)

  // Status
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'
  trialEndsAt?: Date

  // Grandfathering (for early adopters)
  isGrandfathered?: boolean  // True if user gets permanent free access
  grandfatheredAt?: Date     // When user was grandfathered
  grandfatheredReason?: string // Why they were grandfathered (e.g., 'founding_member')

  // Seat Management
  maxSeats: number // Family members (billable)
  currentSeats: number // Current family member count
  maxExternalCaregivers: number // Non-billable professional caregivers
  currentExternalCaregivers: number // Current external caregiver count

  // Feature add-ons (deprecated - now included in tiers)
  addons?: {
    familyFeatures?: boolean  // Legacy field
  }

  // Payment integration (Stripe)
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string

  // Legacy field (for backward compatibility)
  maxPatients?: number  // Deprecated: use maxSeats instead
}

// Biometric Authentication
export interface BiometricCredential {
  id: string // WebAuthn credential ID (base64url encoded)
  deviceInfo: string // Device name/type (e.g., "iPhone 14 Pro - Safari")
  createdAt: Date // When the credential was registered
  lastUsed?: Date // Last successful authentication
}

export interface BiometricAuthData {
  primaryAuthMethod: 'biometric' | 'email' | 'google'
  biometricCredentials: BiometricCredential[]
}

export interface UserProfile {
  // Basic Info
  birthDate: Date // User's date of birth (for accurate age calculation and COPPA compliance)
  age: number // Calculated from birthDate, auto-updated
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say'
  height: number // in cm or inches based on units

  // Weight Info
  currentWeight: number // Fallback weight from onboarding - weight-logs is primary source

  // Activity & Health
  activityLevel: 'sedentary' | 'lightly-active' | 'moderately-active' | 'very-active' | 'extremely-active'
  healthConditions?: string[]
  conditionDetails?: Record<string, Record<string, any>> // Detailed health condition questionnaire responses
  medications?: Array<{
    name: string           // Generic drug name (e.g., "Metformin")
    brandName?: string     // Brand name if applicable (e.g., "Glucophage")
    strength: string       // e.g., "500 mg", "10 mg"
    dosageForm: string     // e.g., "tablet", "capsule", "gel", "injection"
    frequency?: string     // COMPLETE dosage instructions (e.g., "Take 1 tablet by mouth every day")
    prescribedFor?: string // Condition name (e.g., "Type 2 Diabetes")
    patientName?: string   // Who this medication is for (e.g., "Mom", "Dad", "Me")
    rxcui?: string        // RxNorm Concept Unique Identifier
    ndc?: string          // National Drug Code
    rxNumber?: string     // Prescription number
    drugClass?: string    // Therapeutic class
    quantity?: string     // Quantity dispensed (e.g., "30 tablets", "60 capsules")
    refills?: string      // Refills remaining (e.g., "3 refills", "No refills")
    fillDate?: string     // Date prescription was filled (ISO string)
    expirationDate?: string // Expiration date (ISO string)
    warnings?: string[]   // Special warnings
    pharmacyName?: string // Pharmacy name
    pharmacyPhone?: string // Pharmacy phone number
    patientAddress?: string // Patient address
    scannedAt: string     // ISO timestamp
  }>
  foodAllergies?: string[]

  // Lifestyle Factors (for accurate metabolism calculations)
  lifestyle?: {
    // Smoking
    smoking: 'never' | 'quit-recent' | 'quit-old' | 'current-light' | 'current-heavy'
    smokingQuitDate?: Date // If quit within 6 months

    // Alcohol
    alcoholFrequency: 'never' | 'light' | 'moderate' | 'heavy' // Times per week
    weeklyDrinks: number // Average number of drinks

    // Recreational Drugs
    recreationalDrugs: 'no' | 'occasional' | 'regular'
    drugTypes?: string[] // ['marijuana', 'stimulants', etc.]
  }

  // Body Measurements (optional)
  bodyMeasurements?: {
    waist?: number
    hips?: number
    chest?: number
    arms?: number
    thighs?: number
  }

  // Completion Status
  onboardingCompleted: boolean
  onboardingCompletedAt?: Date
  currentOnboardingStep?: number // 1-6, tracks which step user is on, cleared on completion
}

export interface UserGoals {
  // Weight Goals
  targetWeight: number
  startWeight: number
  weeklyWeightLossGoal: number // 0.5-2 lbs per week
  targetDate?: Date
  primaryGoal: 'lose-weight' | 'maintain-weight' | 'gain-muscle' | 'improve-health'

  // Daily Targets
  dailyCalorieGoal: number
  dailySteps: number

  // Macro Targets (percentages)
  macroTargets: {
    protein: number // percentage
    carbs: number // percentage
    fat: number // percentage
  }

  // Calculated Values (from BMR/TDEE)
  bmr?: number // Basal Metabolic Rate
  tdee?: number // Total Daily Energy Expenditure
}

// Weight Tracking
export interface WeightLog {
  id: string
  userId: string
  weight: number
  unit: 'kg' | 'lbs'
  loggedAt: Date
  notes?: string
  dataSource: 'bluetooth-scale' | 'photo-verified' | 'manual' // Data provenance
  photoUrl?: string // Photo of scale display (if photo-verified)
  scaleDeviceId?: string // Bluetooth device ID (if bluetooth-scale)
}

// Meal Tracking
export interface MealLog {
  id: string
  userId: string
  title?: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  photoUrl?: string
  additionalPhotos?: string[] // Up to 4 additional photos for social media/documentation
  aiAnalysis: AIAnalysis
  manualAdjustments?: ManualAdjustments
  searchKeywords?: string[]
  loggedAt: Date
  notes?: string
  dataSource: 'ai-vision' | 'template' // Data provenance - always from photo AI or saved template
  usdaVerified?: boolean // True if all food items were USDA validated
  confidenceScore?: number // Overall confidence (0-100) from AI + USDA validation
}

export interface MealTemplate {
  id: string
  userId: string
  name: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  foodItems: string[]
  calories: number
  macros: MacroNutrients
  notes?: string
  usageCount: number
  lastUsed?: Date
  createdAt: Date
}

export interface FoodItem {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  // USDA Verification (added after AI analysis)
  fdcId?: number // USDA FoodData Central ID
  usdaVerified?: boolean // True if matched and validated with USDA database
  confidence?: number // Confidence score (0-100)
  source?: 'usda' | 'estimated' // Data source for nutrition values
}

export interface AIAnalysis {
  foodItems: FoodItem[]
  totalCalories: number
  totalMacros: MacroNutrients
  confidence: number
  suggestions?: string[]
  suggestedMealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  isMockData?: boolean
  usdaValidation?: string[] // Validation messages from USDA lookup
}

export interface MacroNutrients {
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface ManualAdjustments {
  calories?: number
  macros?: Partial<MacroNutrients>
  foodItems?: string[]
}

// Step Tracking
export interface StepLog {
  id: string
  userId: string
  steps: number
  loggedAt: Date
  dataSource: 'device-sensor' | 'apple-health' | 'google-fit' | 'manual' // Data provenance
  source?: 'manual' | 'device' | 'healthkit' | 'googlefit' // Deprecated - use dataSource
}

// Health Vitals Tracking (HIPAA-sensitive data)
// Health Vitals Summary (for admin analytics dashboard)
export interface HealthVitalsSummary {
  latestBloodSugar?: {
    value: number
    type: string
    date: Date
    isAbnormal: boolean // true if <70 (hypoglycemia) or >180 (hyperglycemia)
  }
  latestBloodPressure?: {
    systolic: number
    diastolic: number
    date: Date
    isAbnormal: boolean // true if systolic >140 or <90, or diastolic >90 or <60
  }
  weeklyExercise: {
    totalMinutes: number
    sessionsCount: number
    avgIntensity: string
  }
  trends: {
    bloodSugarTrend: 'improving' | 'worsening' | 'stable' | 'insufficient-data'
    bloodPressureTrend: 'improving' | 'worsening' | 'stable' | 'insufficient-data'
    exerciseTrend: 'improving' | 'worsening' | 'stable' | 'insufficient-data'
  }
}

// AI & Recommendations
export interface AIRecommendation {
  id: string
  userId: string
  type: 'nutrition' | 'exercise' | 'habit'
  priority: 'high' | 'medium' | 'low'
  message: string
  reasoning: string
  actionItems: string[]
  timeframe: string
  createdAt: Date
  acknowledged: boolean
}

// AI Health Profile (Gemini-powered health condition management)
export interface AIRestriction {
  limit?: number
  unit?: 'mg' | 'g' | 'kcal' | '%' | 'IU'
  reason?: string
}

export interface AIHealthProfile {
  restrictions: {
    sodium?: AIRestriction
    potassium?: AIRestriction
    phosphorus?: AIRestriction
    protein?: AIRestriction
    carbs?: AIRestriction
    sugar?: AIRestriction
    saturatedFat?: AIRestriction
    cholesterol?: AIRestriction
    // Extensible: Gemini can return any new nutrients
    [key: string]: AIRestriction | undefined
  }
  calorieAdjustment?: {
    multiplier?: number
    reason?: string
  }
  monitorNutrients?: string[] // Nutrients to track prominently (e.g., ['sodium', 'potassium'])
  criticalWarnings?: string[] // High-priority warnings (e.g., medication interactions)
  confidence: number // 0-100 confidence score from Gemini
  reviewStatus: 'unreviewed' | 'approved' | 'modified'
  generatedAt: string // ISO timestamp
  lastReviewedBy?: string // Admin UID who reviewed
}

// AI Decision (for admin review workflow)
export interface AIDecision {
  id: string
  type: 'meal-analysis' | 'health-profile' | 'meal-safety'
  userId: string
  payload: any // Type varies by decision type
  confidence: number
  reviewStatus: 'unreviewed' | 'approved' | 'rejected' | 'reversed'
  adminNotes?: string
  reviewedAt?: Date
  reviewedBy?: string // Admin UID
  createdAt: Date
}

// Meal Safety Check Response
export interface MealSafetyCheck {
  isSafe: boolean
  warnings: string[] // Human-readable warnings
  severity: 'safe' | 'caution' | 'critical' // Severity level
  nutrientBreakdown?: {
    [nutrient: string]: {
      amount: number
      limit: number
      percentage: number
    }
  }
  confidence: number
}

// Dashboard Data
export interface DashboardData {
  weightTrend: WeightTrend
  nutritionSummary: NutritionSummary
  activitySummary: ActivitySummary
  recommendations: AIRecommendation[]
}

export interface WeightTrend {
  current: number
  change: number
  trend: 'up' | 'down' | 'stable'
  goalProgress: number
}

export interface NutritionSummary {
  todayCalories: number
  goalCalories: number
  macros: MacroNutrients
  mealsLogged: number
}

export interface ActivitySummary {
  todaySteps: number
  goalSteps: number
  weeklyAverage: number
}

// Form Types
export interface WeightLogForm {
  weight: number
  unit: 'kg' | 'lbs'
  notes?: string
}

export interface UserProfileForm {
  name: string
  email: string
  preferences: UserPreferences
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Health Insights
export interface HealthInsights {
  weeklyTrends: WeeklyTrends
  goalProgress: GoalProgress
  recommendations: AIRecommendation[]
  generatedAt: Date
}

export interface WeeklyTrends {
  weightChange: number
  calorieAverage: number
  macroBalance: MacroNutrients
  stepAverage: number
}

export interface GoalProgress {
  weightLoss: number
  targetMet: boolean
  daysRemaining: number
  projectedCompletion: Date
}

// Error Types
export interface AppError {
  code: string
  message: string
  details?: JsonObject
}

// Auth Context Types
export interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

// Recipe Cooking & Queue
export interface StepTimer {
  stepIndex: number
  stepText: string
  duration: number | null // Duration in seconds, null if no timer needed
  startedAt?: Date
  completedAt?: Date
  status: 'pending' | 'active' | 'completed' | 'skipped'
}

export interface CookingSession {
  id: string
  userId: string
  recipeId: string
  recipeName: string
  servingSize: number
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  currentStep: number
  totalSteps: number
  stepTimers: StepTimer[]
  startedAt: Date
  pausedAt?: Date
  completedAt?: Date
  status: 'in-progress' | 'paused' | 'completed' | 'abandoned'
  // Scaled recipe data for logging
  scaledCalories: number
  scaledMacros: {
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  scaledIngredients: string[]
}

export interface QueuedRecipe {
  id: string
  userId: string
  recipeId: string
  recipeName: string
  servingSize: number
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  plannedFor?: Date
  addedAt: Date
}

// Medical Records System Types
export * from './medical'

// Caregiver Profile Types
export * from './caregiver-profile'