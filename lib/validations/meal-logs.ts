/**
 * Validation schemas for meal logging
 * Uses Zod for runtime validation and type inference
 */

import { z } from 'zod'

// ============================================
// FOOD ITEM SCHEMA
// ============================================

export const FoodItemSchema = z.object({
  name: z.string().min(1, 'Food name is required'),
  portion: z.string().min(1, 'Portion size is required'),
  calories: z.number().min(0, 'Calories must be non-negative'),
  protein: z.number().min(0, 'Protein must be non-negative'),
  carbs: z.number().min(0, 'Carbs must be non-negative'),
  fat: z.number().min(0, 'Fat must be non-negative'),
  fiber: z.number().min(0, 'Fiber must be non-negative'),
  // USDA validation fields (optional)
  fdcId: z.number().optional(),
  usdaVerified: z.boolean().optional(),
  confidence: z.number().min(0).max(100).optional(),
  source: z.enum(['usda', 'estimated']).optional(),
})

export type FoodItem = z.infer<typeof FoodItemSchema>

// ============================================
// MACRO NUTRIENTS SCHEMA
// ============================================

export const MacroNutrientsSchema = z.object({
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0),
})

export type MacroNutrients = z.infer<typeof MacroNutrientsSchema>

// ============================================
// AI ANALYSIS SCHEMA
// ============================================

export const AIAnalysisSchema = z.object({
  foodItems: z.array(FoodItemSchema),
  totalCalories: z.number().min(0),
  totalMacros: MacroNutrientsSchema,
  confidence: z.number().min(0).max(100),
  suggestions: z.array(z.string()).optional(),
  suggestedMealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  isMockData: z.boolean().optional(),
  usdaValidation: z.array(z.string()).optional(),
  title: z.string().optional(), // Meal title generated from AI
})

export type AIAnalysis = z.infer<typeof AIAnalysisSchema>

// ============================================
// MANUAL ENTRIES SCHEMA
// ============================================

export const ManualEntrySchema = z.object({
  food: z.string().min(1),
  calories: z.number().min(0),
  quantity: z.string().min(1),
})

export const ManualAdjustmentsSchema = z.object({
  calories: z.number().optional(),
  macros: MacroNutrientsSchema.partial().optional(),
  foodItems: z.array(z.string()).optional(),
})

export type ManualEntry = z.infer<typeof ManualEntrySchema>
export type ManualAdjustments = z.infer<typeof ManualAdjustmentsSchema>

// ============================================
// MEAL LOG REQUEST SCHEMA
// ============================================

// Base schema without refinement (supports .partial() for updates)
const CreateMealLogRequestBaseSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  photoUrl: z.string().url().optional(),
  aiAnalysis: AIAnalysisSchema.optional(),
  manualEntries: z.array(ManualEntrySchema).optional(),
  notes: z.string().optional(),
  loggedAt: z.string().datetime().optional(), // ISO 8601 datetime string
})

// For CREATE operations - requires either aiAnalysis or manualEntries
export const CreateMealLogRequestSchema = CreateMealLogRequestBaseSchema
  .refine(
    (data) => data.aiAnalysis || (data.manualEntries && data.manualEntries.length > 0),
    { message: 'Either AI analysis or manual entries are required' }
  )

// For UPDATE operations - allows partial data without refinement
export const UpdateMealLogRequestSchema = CreateMealLogRequestBaseSchema

export type CreateMealLogRequest = z.infer<typeof CreateMealLogRequestSchema>

// ============================================
// MEAL LOG RESPONSE SCHEMA
// ============================================

export const MealLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  photoUrl: z.string().url().optional(),
  aiAnalysis: AIAnalysisSchema.optional(),
  manualEntries: z.array(ManualEntrySchema).optional(),
  totalCalories: z.number().min(0),
  macros: MacroNutrientsSchema,
  loggedAt: z.string().datetime(), // ISO 8601 datetime string
  notes: z.string().optional(),
  source: z.enum(['photo', 'manual', 'hybrid']),
  searchKeywords: z.array(z.string()).optional(),
  dataSource: z.enum(['ai-vision', 'template']).optional(),
  usdaVerified: z.boolean().optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
})

export type MealLog = z.infer<typeof MealLogSchema>

// ============================================
// QUERY PARAMETERS SCHEMA
// ============================================

export const GetMealLogsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
})

export type GetMealLogsQuery = z.infer<typeof GetMealLogsQuerySchema>
