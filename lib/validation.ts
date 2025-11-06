import { z } from 'zod'
import { NextResponse } from 'next/server'

// ============================================
// VALIDATION HELPER TYPES
// ============================================

/**
 * Validation error response interface
 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] }

// ============================================
// VALIDATION HELPER FUNCTIONS
// ============================================

/**
 * Validate request body with a Zod schema
 * Returns typed data or validation errors
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): ValidationResult<T> {
  try {
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.issues.map((e: z.ZodIssue) => ({
        field: e.path.join('.'),
        message: e.message
      }))
      return { success: false, errors }
    }
    // Unexpected error
    throw error
  }
}

/**
 * Validate query parameters with a Zod schema
 * Returns typed data or validation errors
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  params: Record<string, string | null>
): ValidationResult<T> {
  try {
    const data = schema.parse(params)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.issues.map((e: z.ZodIssue) => ({
        field: e.path.join('.'),
        message: e.message
      }))
      return { success: false, errors }
    }
    // Unexpected error
    throw error
  }
}

/**
 * Create a validation error response
 * Returns a NextResponse with validation errors
 */
export function validationErrorResponse(
  errors: ValidationError[],
  message: string = 'Validation failed'
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      details: errors
    },
    { status: 400 }
  )
}

/**
 * Handle Zod validation errors in catch blocks
 * Returns appropriate error response or re-throws non-validation errors
 */
export function handleValidationError(
  error: unknown,
  fallbackMessage: string = 'An error occurred'
): NextResponse | never {
  if (error instanceof z.ZodError) {
    const errors: ValidationError[] = error.issues.map((e: z.ZodIssue) => ({
      field: e.path.join('.'),
      message: e.message
    }))
    return validationErrorResponse(errors)
  }

  // Not a validation error, re-throw
  throw error
}

// ============================================
// SHARED VALIDATION SCHEMAS
// ============================================

// Shared
export const MacroSchema = z.object({
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0).optional().default(0),
})

export const DateIso = z.string().refine(v => !Number.isNaN(Date.parse(v)), 'Invalid ISO date')

// ShoppingItem
export const ShoppingItemSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  barcode: z.string().optional(),
  productName: z.string().min(1),
  brand: z.string().optional().default(''),
  imageUrl: z.string().url().optional(),
  category: z.string().min(1),
  isManual: z.boolean().default(false),
  manualIngredientName: z.string().optional(),
  recipeIds: z.array(z.string()).default([]),
  primaryRecipeId: z.string().optional(),
  inStock: z.boolean().default(false),
  quantity: z.number().nonnegative().default(1),
  unit: z.string().min(1),
  location: z.enum(['fridge', 'freezer', 'pantry', 'counter']).default('pantry'),
  expiresAt: z.union([z.date(), z.string().datetime()]).optional(),
  isPerishable: z.boolean().default(false),
  needed: z.boolean().default(true),
  priority: z.enum(['low', 'medium', 'high']).default('low'),
  purchaseHistory: z.array(z.any()).optional(),
  createdAt: z.union([z.date(), z.string().datetime()]).optional(),
  updatedAt: z.union([z.date(), z.string().datetime()]).optional(),
})

// MealLog
export const MealLogSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  title: z.string().min(1),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  photoUrl: z.string().url().optional(),
  aiAnalysis: z.any().optional(), // consider a stricter schema later
  manualAdjustments: z.any().optional(),
  searchKeywords: z.array(z.string()).optional(),
  loggedAt: z.union([z.date(), z.string().datetime()]),
  notes: z.string().optional(),
  dataSource: z.enum(['ai-vision', 'template']).default('ai-vision'),
  usdaVerified: z.boolean().default(false),
  confidenceScore: z.number().min(0).max(100).optional(),
})

// UserProfile (subset for API safety)
export const UserProfileSchema = z.object({
  birthDate: z.union([z.date(), z.string().datetime()]),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']),
  height: z.number().positive(),
  currentWeight: z.number().positive().optional(),
  activityLevel: z.enum(['sedentary','lightly-active','moderately-active','very-active','extremely-active']),
  healthConditions: z.array(z.string()).default([]),
  foodAllergies: z.array(z.string()).default([]),
  onboardingCompleted: z.boolean().default(false),
  currentOnboardingStep: z.number().int().min(1).max(6).optional(),
})
