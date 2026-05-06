/**
 * Validation schemas for health vitals tracking
 * Uses Zod for runtime validation and type inference
 */

import { z } from 'zod'

// ============================================
// BLOOD SUGAR LOG SCHEMA
// ============================================

export const BloodSugarLogSchema = z.object({
  glucoseLevel: z.number()
    .min(20, 'Glucose level must be at least 20 mg/dL')
    .max(600, 'Glucose level cannot exceed 600 mg/dL'),
  measurementType: z.enum([
    'fasting',
    'before-meal',
    'after-meal',
    'bedtime',
    'random'
  ]),
  loggedAt: z.string().datetime().optional(), // ISO 8601 datetime string
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
})

export const CreateBloodSugarLogSchema = BloodSugarLogSchema

export const UpdateBloodSugarLogSchema = BloodSugarLogSchema.partial()

export type BloodSugarLog = z.infer<typeof BloodSugarLogSchema>
export type CreateBloodSugarLogRequest = z.infer<typeof CreateBloodSugarLogSchema>
export type UpdateBloodSugarLogRequest = z.infer<typeof UpdateBloodSugarLogSchema>

// ============================================
// BLOOD PRESSURE LOG SCHEMA
// ============================================

export const BloodPressureLogSchema = z.object({
  systolic: z.number()
    .min(70, 'Systolic pressure must be at least 70 mmHg')
    .max(250, 'Systolic pressure cannot exceed 250 mmHg'),
  diastolic: z.number()
    .min(40, 'Diastolic pressure must be at least 40 mmHg')
    .max(150, 'Diastolic pressure cannot exceed 150 mmHg'),
  heartRate: z.number()
    .min(30, 'Heart rate must be at least 30 bpm')
    .max(250, 'Heart rate cannot exceed 250 bpm')
    .optional(),
  loggedAt: z.string().datetime().optional(), // ISO 8601 datetime string
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
})
  .refine(
    (data) => data.systolic > data.diastolic,
    { message: 'Systolic pressure must be greater than diastolic pressure' }
  )

export const CreateBloodPressureLogSchema = BloodPressureLogSchema

export const UpdateBloodPressureLogSchema = BloodPressureLogSchema.partial()

export type BloodPressureLog = z.infer<typeof BloodPressureLogSchema>
export type CreateBloodPressureLogRequest = z.infer<typeof CreateBloodPressureLogSchema>
export type UpdateBloodPressureLogRequest = z.infer<typeof UpdateBloodPressureLogSchema>

// ============================================
// EXERCISE LOG SCHEMA
// ============================================

export const ExerciseLogSchema = z.object({
  activityType: z.string().min(1, 'Activity type is required').max(100),
  duration: z.number()
    .min(1, 'Duration must be at least 1 minute')
    .max(1440, 'Duration cannot exceed 24 hours (1440 minutes)'),
  intensity: z.enum(['low', 'moderate', 'high']),
  caloriesBurned: z.number()
    .min(0, 'Calories burned must be non-negative')
    .max(5000, 'Calories burned cannot exceed 5000')
    .optional(),
  distance: z.number()
    .min(0, 'Distance must be non-negative')
    .optional(), // in km or miles based on user preference
  loggedAt: z.string().datetime().optional(), // ISO 8601 datetime string
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
})

export const CreateExerciseLogSchema = ExerciseLogSchema

export const UpdateExerciseLogSchema = ExerciseLogSchema.partial()

export type ExerciseLog = z.infer<typeof ExerciseLogSchema>
export type CreateExerciseLogRequest = z.infer<typeof CreateExerciseLogSchema>
export type UpdateExerciseLogRequest = z.infer<typeof UpdateExerciseLogSchema>

// ============================================
// HEALTH VITALS QUERY SCHEMA
// ============================================

export const GetHealthVitalsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  vitalType: z.enum(['blood-sugar', 'blood-pressure', 'exercise']).optional(),
})

export type GetHealthVitalsQuery = z.infer<typeof GetHealthVitalsQuerySchema>

// ============================================
// AI HEALTH PROFILE — REQUEST + GEMINI OUTPUT SCHEMAS
// ============================================
//
// AIRestrictionSchema and AIHealthProfileResponseSchema mirror the
// AIRestriction / AIHealthProfile types in types/index.ts and the
// runtime shape that lib/gemini.ts callGeminiHealthProfile actually
// returns (see the SchemaType definition there). Schemas here are
// the runtime gate at the parse point — JSON.parse + safeParse
// rejects malformed Gemini output before it reaches Firestore.

export const AIRestrictionSchema = z.object({
  limit: z.number().optional(),
  unit: z.enum(['mg', 'g', 'kcal', '%', 'IU']).optional(),
  reason: z.string().optional(),
})

// Restrictions object is open-ended: the prompt asks for known
// nutrients (sodium/potassium/etc.) but Gemini may emit additional
// keys when conditions warrant. catchall mirrors the
// `[key: string]: AIRestriction | undefined` index signature on
// AIHealthProfile.restrictions.
export const AIHealthProfileRestrictionsSchema = z
  .object({
    sodium: AIRestrictionSchema.optional(),
    potassium: AIRestrictionSchema.optional(),
    phosphorus: AIRestrictionSchema.optional(),
    protein: AIRestrictionSchema.optional(),
    carbs: AIRestrictionSchema.optional(),
    sugar: AIRestrictionSchema.optional(),
    saturatedFat: AIRestrictionSchema.optional(),
    cholesterol: AIRestrictionSchema.optional(),
  })
  .catchall(AIRestrictionSchema.optional())

export const GenerateHealthProfileRequestSchema = z.object({
  healthConditions: z.array(z.string()).min(1, 'At least one health condition is required'),
  age: z.number().min(13).max(120).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional(),
  currentWeight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  activityLevel: z.enum(['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active']).optional(),
})

export const AIHealthProfileResponseSchema = z.object({
  restrictions: AIHealthProfileRestrictionsSchema,
  calorieAdjustment: z
    .object({
      multiplier: z.number().optional(),
      reason: z.string().optional(),
    })
    .optional(),
  monitorNutrients: z.array(z.string()).optional(),
  criticalWarnings: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(100),
})

// AIRestriction type lives in @/types (canonical). Don't re-export
// the Zod-inferred shape under the same name — keeps `import { AIRestriction }`
// unambiguous.
export type AIHealthProfileRestrictions = z.infer<typeof AIHealthProfileRestrictionsSchema>
export type GenerateHealthProfileRequest = z.infer<typeof GenerateHealthProfileRequestSchema>
export type AIHealthProfileResponse = z.infer<typeof AIHealthProfileResponseSchema>

// ============================================
// AI MEAL SAFETY — GEMINI OUTPUT SCHEMA
// ============================================

export const MealSafetyResponseSchema = z.object({
  isSafe: z.boolean(),
  warnings: z.array(z.string()),
  severity: z.enum(['safe', 'caution', 'critical']),
  nutrientBreakdown: z
    .record(
      z.string(),
      z.object({
        amount: z.number(),
        limit: z.number(),
        percentage: z.number(),
      }),
    )
    .optional(),
  confidence: z.number().min(0).max(100),
})

export type MealSafetyResponse = z.infer<typeof MealSafetyResponseSchema>

// ============================================
// HEALTH VITALS SUMMARY RESPONSE SCHEMA
// ============================================

export const HealthVitalsSummarySchema = z.object({
  latestBloodSugar: z.object({
    value: z.number(),
    type: z.enum(['fasting', 'before-meal', 'after-meal', 'bedtime', 'random']),
    date: z.date(),
    isAbnormal: z.boolean(),
  }).optional(),
  latestBloodPressure: z.object({
    systolic: z.number(),
    diastolic: z.number(),
    date: z.date(),
    isAbnormal: z.boolean(),
  }).optional(),
  weeklyExercise: z.object({
    totalMinutes: z.number(),
    sessionsCount: z.number(),
    avgIntensity: z.string(),
  }),
  trends: z.object({
    bloodSugarTrend: z.enum(['improving', 'stable', 'worsening', 'insufficient-data']),
    bloodPressureTrend: z.enum(['improving', 'stable', 'worsening', 'insufficient-data']),
    exerciseTrend: z.enum(['improving', 'stable', 'worsening', 'insufficient-data']),
  }),
})

export type HealthVitalsSummary = z.infer<typeof HealthVitalsSummarySchema>
