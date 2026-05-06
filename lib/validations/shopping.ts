/**
 * Validation schemas for shopping-related AI outputs.
 *
 * Currently scoped to the Gemini-generated personalized-shopping
 * suggestions endpoint (/api/shopping/suggestions). The route's
 * existing responseSchema config tells Gemini what shape to return,
 * but malformed outputs slip through under load — and these
 * suggestions are derived from PHI inputs (vitals, conditions,
 * allergies). A bad shape persists garbage into the patient-facing
 * UI as if it were AI-validated guidance.
 */

import { z } from 'zod'

// ============================================
// AI SHOPPING SUGGESTIONS — GEMINI OUTPUT SCHEMA
// ============================================

const ShoppingSuggestionItemSchema = z.object({
  productName: z.string(),
  category: z.string(),
  reason: z.string(),
  reasonText: z.string(),
  priority: z.string(),
  benefits: z.array(z.string()),
  // Suggested concrete brands/items to fulfill the suggestion.
  // Optional — Gemini sometimes returns just the productName.
  suggestedProducts: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(100),
})

const ShoppingItemToAvoidSchema = z.object({
  productName: z.string(),
  reason: z.string(),
  severity: z.string(),
})

export const ShoppingSuggestionsResponseSchema = z.object({
  suggestions: z.array(ShoppingSuggestionItemSchema),
  itemsToAvoid: z.array(ShoppingItemToAvoidSchema).optional(),
})

export type ShoppingSuggestionItem = z.infer<typeof ShoppingSuggestionItemSchema>
export type ShoppingSuggestionsResponse = z.infer<typeof ShoppingSuggestionsResponseSchema>
