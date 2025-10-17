// User Types
export interface User {
  id: string
  email: string
  name: string
  preferences: UserPreferences
  createdAt: Date
  lastActiveAt: Date
}

export interface UserPreferences {
  units: 'metric' | 'imperial'
  goals: UserGoals
  notifications: boolean
  biometricEnabled: boolean
}

export interface UserGoals {
  targetWeight: number
  dailyCalories: number
  weeklyWeightLoss: number
}

// Weight Tracking
export interface WeightLog {
  id: string
  userId: string
  weight: number
  unit: 'kg' | 'lbs'
  loggedAt: Date
  notes?: string
}

// Meal Tracking
export interface MealLog {
  id: string
  userId: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  photoUrl?: string
  aiAnalysis: AIAnalysis
  manualAdjustments?: ManualAdjustments
  loggedAt: Date
}

export interface AIAnalysis {
  foodItems: string[]
  estimatedCalories: number
  macros: MacroNutrients
  confidence: number
  suggestions?: string[]
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
  source: 'manual' | 'device' | 'healthkit' | 'googlefit'
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