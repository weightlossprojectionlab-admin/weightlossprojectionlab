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

// User Types
export interface User {
  id: string
  email: string
  name: string
  profile?: UserProfile
  goals?: UserGoals
  preferences: UserPreferences
  createdAt: Date
  lastActiveAt: Date
}

export interface UserPreferences {
  units: 'metric' | 'imperial'
  notifications: boolean
  biometricEnabled: boolean
  dietaryPreferences?: string[]
  mealReminderTimes?: {
    breakfast?: string
    lunch?: string
    dinner?: string
    snacks?: string
  }
  weightCheckInFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
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

// WebAuthn / Biometric Types
export interface BiometricCredential {
  id: string
  userId: string
  credentialId: string
  publicKey: string
  counter: number
  deviceName: string
  createdAt: Date
  lastUsed: Date
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
  details?: any
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