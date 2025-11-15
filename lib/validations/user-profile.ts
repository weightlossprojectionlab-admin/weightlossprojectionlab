/**
 * Validation schemas for user profiles and goals
 * Uses Zod for runtime validation and type inference
 */

import { z } from 'zod'

// ============================================
// USER PREFERENCES SCHEMA
// ============================================

export const UserPreferencesSchema = z.object({
  units: z.enum(['metric', 'imperial']).optional(),
  notifications: z.boolean().optional(),
  biometricEnabled: z.boolean().optional(),
  themePreference: z.enum(['light', 'dark', 'system']).optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  mealReminderTimes: z.object({
    breakfast: z.string().optional(),
    lunch: z.string().optional(),
    dinner: z.string().optional(),
    snacks: z.string().optional(),
  }).optional(),
  mealSchedule: z.object({
    breakfastTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
    lunchTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
    dinnerTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
    hasSnacks: z.boolean(),
    snackWindows: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
  }).optional(),
  weightCheckInFrequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
})

export type UserPreferences = z.infer<typeof UserPreferencesSchema>

// ============================================
// USER PROFILE SCHEMA
// ============================================

export const LifestyleSchema = z.object({
  smoking: z.enum(['never', 'quit-recent', 'quit-old', 'current-light', 'current-heavy']),
  smokingQuitDate: z.string().datetime().optional(),
  alcoholFrequency: z.enum(['never', 'light', 'moderate', 'heavy']),
  weeklyDrinks: z.number().min(0),
  recreationalDrugs: z.enum(['no', 'occasional', 'regular']),
  drugTypes: z.array(z.string()).optional(),
})

export const BodyMeasurementsSchema = z.object({
  waist: z.number().positive().optional(),
  hips: z.number().positive().optional(),
  chest: z.number().positive().optional(),
  arms: z.number().positive().optional(),
  thighs: z.number().positive().optional(),
})

// Medication schema - matches the comprehensive structure from types/index.ts
export const MedicationSchema = z.object({
  name: z.string(),
  brandName: z.string().optional(),
  strength: z.string(),
  dosageForm: z.string(),
  frequency: z.string().optional(),
  prescribedFor: z.string().optional(),
  patientName: z.string().optional(),
  rxcui: z.string().optional(),
  ndc: z.string().optional(),
  rxNumber: z.string().optional(),
  drugClass: z.string().optional(),
  quantity: z.string().optional(),
  refills: z.string().optional(),
  fillDate: z.string().optional(),
  expirationDate: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  pharmacyName: z.string().optional(),
  pharmacyPhone: z.string().optional(),
  patientAddress: z.string().optional(),
  scannedAt: z.string(),
})

export const UserProfileSchema = z.object({
  birthDate: z.string().datetime(),
  age: z.number().min(13).max(120),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']),
  height: z.number().positive(),
  currentWeight: z.number().positive(),
  activityLevel: z.enum(['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active']),
  healthConditions: z.array(z.string()).optional(),
  foodAllergies: z.array(z.string()).optional(),
  medications: z.array(MedicationSchema).optional(),
  lifestyle: LifestyleSchema.optional(),
  bodyMeasurements: BodyMeasurementsSchema.optional(),
  onboardingCompleted: z.boolean(),
  onboardingCompletedAt: z.string().datetime().optional(),
  currentOnboardingStep: z.number().min(1).max(6).optional(),
})

export type UserProfile = z.infer<typeof UserProfileSchema>

// ============================================
// USER GOALS SCHEMA
// ============================================

export const MacroTargetsSchema = z.object({
  protein: z.number().min(0).max(100),
  carbs: z.number().min(0).max(100),
  fat: z.number().min(0).max(100),
})
  .refine((data) => data.protein + data.carbs + data.fat === 100, {
    message: 'Macro percentages must sum to 100',
  })

export const UserGoalsSchema = z.object({
  targetWeight: z.number().positive(),
  startWeight: z.number().positive(),
  weeklyWeightLossGoal: z.number().min(0.5).max(2),
  targetDate: z.string().datetime().optional(),
  primaryGoal: z.enum(['lose-weight', 'maintain-weight', 'gain-muscle', 'improve-health']),
  dailyCalorieGoal: z.number().min(1000).max(5000),
  dailySteps: z.number().min(1000).max(50000),
  macroTargets: MacroTargetsSchema,
  bmr: z.number().positive().optional(),
  tdee: z.number().positive().optional(),
})

export type UserGoals = z.infer<typeof UserGoalsSchema>

// ============================================
// UPDATE PROFILE REQUEST SCHEMA
// ============================================

// Support both flat structure (legacy) and nested structure (from onboarding)
// Nested: { profile: {...}, goals: {...}, preferences: {...} }
// Flat: { birthDate: ..., age: ..., ... }
export const UpdateUserProfileRequestSchema = UserProfileSchema.partial().extend({
  preferences: UserPreferencesSchema.partial().optional(),
  // Support nested structure from onboarding
  profile: UserProfileSchema.partial().optional(),
  goals: UserGoalsSchema.partial().optional(),
})

export type UpdateUserProfileRequest = z.infer<typeof UpdateUserProfileRequestSchema>

// ============================================
// UPDATE BIOMETRIC REQUEST SCHEMA
// ============================================

export const UpdateBiometricRequestSchema = z.object({
  height: z.number().positive().optional(),
  currentWeight: z.number().positive().optional(),
  activityLevel: z.enum(['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active']).optional(),
  bodyMeasurements: BodyMeasurementsSchema.optional(),
})

export type UpdateBiometricRequest = z.infer<typeof UpdateBiometricRequestSchema>

// ============================================
// RESET PROFILE REQUEST SCHEMA
// ============================================

export const ResetProfileRequestSchema = z.object({
  confirmReset: z.boolean().refine((val) => val === true, {
    message: 'You must confirm the reset operation',
  }),
})

export type ResetProfileRequest = z.infer<typeof ResetProfileRequestSchema>
