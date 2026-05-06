/**
 * Validation schemas for weight logging
 * Uses Zod for runtime validation and type inference
 */

import { z } from 'zod'

// ============================================
// WEIGHT LOG REQUEST SCHEMA
// ============================================

export const CreateWeightLogRequestSchema = z.object({
  weight: z.number().min(20, 'Weight must be at least 20').max(1000, 'Weight must be less than 1000'),
  unit: z.enum(['kg', 'lbs']),
  notes: z.string().optional(),
  loggedAt: z.string().datetime().optional(), // ISO 8601 datetime string
  dataSource: z.enum(['bluetooth-scale', 'photo-verified', 'manual']).optional().default('manual'),
  photoUrl: z.string().url().optional(),
  scaleDeviceId: z.string().optional(),
})

export type CreateWeightLogRequest = z.infer<typeof CreateWeightLogRequestSchema>

// ============================================
// WEIGHT LOG RESPONSE SCHEMA
// ============================================

export const WeightLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  weight: z.number().min(20).max(1000),
  unit: z.enum(['kg', 'lbs']),
  loggedAt: z.string().datetime(), // ISO 8601 datetime string
  notes: z.string().optional(),
  dataSource: z.enum(['bluetooth-scale', 'photo-verified', 'manual']),
  photoUrl: z.string().url().optional(),
  scaleDeviceId: z.string().optional(),
})

export type WeightLog = z.infer<typeof WeightLogSchema>

// ============================================
// WEIGHT-SCALE OCR — GEMINI VISION OUTPUT SCHEMA
// ============================================
//
// Runtime gate at the JSON.parse boundary in
// /api/ai/analyze-weight. The Gemini prompt requests this exact
// shape, but vision-model retries / load conditions occasionally
// emit malformed objects. Parsing them as patient weight readings
// is a clinical-data-quality risk.

export const WeightScaleOCRResponseSchema = z.object({
  weight: z.number(),
  unit: z.enum(['lbs', 'kg']),
  confidence: z.number().min(0).max(100),
  scaleType: z.string().optional(),
  readable: z.boolean(),
  // Some Gemini outputs use null, some omit; accept both.
  error: z.string().nullable().optional(),
})

export type WeightScaleOCRResponse = z.infer<typeof WeightScaleOCRResponseSchema>

// ============================================
// QUERY PARAMETERS SCHEMA
// ============================================

export const GetWeightLogsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  // Accept both date (YYYY-MM-DD) and datetime (ISO 8601) formats
  startDate: z.string().optional().transform((val) => {
    if (!val) return undefined
    // If already ISO datetime, return as-is
    if (val.includes('T')) return val
    // If date-only, add start of day
    return `${val}T00:00:00Z`
  }),
  endDate: z.string().optional().transform((val) => {
    if (!val) return undefined
    // If already ISO datetime, return as-is
    if (val.includes('T')) return val
    // If date-only, add end of day
    return `${val}T23:59:59Z`
  }),
})

export type GetWeightLogsQuery = z.infer<typeof GetWeightLogsQuerySchema>

// ============================================
// WEIGHT ANALYSIS SCHEMA (from AI scale reading)
// ============================================

export const WeightAnalysisSchema = z.object({
  weight: z.number().min(20).max(1000),
  unit: z.enum(['lbs', 'kg']),
  confidence: z.number().min(0).max(100),
  scaleType: z.enum(['digital', 'analog', 'smart-scale']),
  readable: z.boolean(),
  error: z.string().nullable(),
})

export type WeightAnalysis = z.infer<typeof WeightAnalysisSchema>

export const AnalyzeWeightRequestSchema = z.object({
  imageBase64: z.string().min(1, 'Image data is required'),
  expectedUnit: z.enum(['lbs', 'kg']).optional(),
})

export type AnalyzeWeightRequest = z.infer<typeof AnalyzeWeightRequestSchema>
