/**
 * Regression tests for the remaining Zod gates on PHI-derived
 * Gemini outputs (T3.7 punch-list items #5).
 *
 * Two pipelines covered here:
 *   1. WeightScaleOCRResponseSchema — Gemini Vision reads a digital
 *      scale display into { weight, unit, confidence }. Output is
 *      written directly to the patient's weight-log subcollection,
 *      so a bogus shape (weight as string, unit outside {lbs,kg},
 *      confidence > 100) corrupts the trend chart and goal math.
 *   2. ShoppingSuggestionsResponseSchema — Gemini takes patient
 *      vitals + conditions + allergies + meal history and produces
 *      personalized shopping suggestions. Output renders in the
 *      patient-facing UI as "AI-validated guidance," so a bad shape
 *      surfaces garbage as if it were checked.
 *
 * Pinning these schemas locks the gate. A regression that loosens
 * either (e.g., unit becomes z.string(), confidence range widened,
 * suggestions accepts a single object instead of array) trips
 * a case here.
 */

import { describe, it, expect } from '@jest/globals'
import { WeightScaleOCRResponseSchema } from '@/lib/validations/weight-logs'
import { ShoppingSuggestionsResponseSchema } from '@/lib/validations/shopping'

describe('WeightScaleOCRResponseSchema — T3.7 #5 weight scale OCR gate', () => {
  it('accepts a clear, readable reading', () => {
    const result = WeightScaleOCRResponseSchema.safeParse({
      weight: 165.4,
      unit: 'lbs',
      confidence: 95,
      readable: true,
    })
    expect(result.success).toBe(true)
  })

  it('accepts a kg reading with optional fields', () => {
    const result = WeightScaleOCRResponseSchema.safeParse({
      weight: 75.2,
      unit: 'kg',
      confidence: 88,
      scaleType: 'digital',
      readable: true,
      error: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts an unreadable reading (Gemini reports failure structurally)', () => {
    // The schema MUST allow unreadable=true so the API can surface
    // "couldn't read the photo" to the user without crashing the
    // Zod gate — that was the silent-mock-data fallback bug from
    // P0 #3 in the punch list.
    const result = WeightScaleOCRResponseSchema.safeParse({
      weight: 0,
      unit: 'lbs',
      confidence: 0,
      readable: false,
      error: 'Display obscured',
    })
    expect(result.success).toBe(true)
  })

  it('rejects unit outside {lbs, kg}', () => {
    // No "stones" or "pounds" passthrough — the type system feeds
    // the unit straight into weight-log writes that downstream math
    // assumes is one of two values.
    const result = WeightScaleOCRResponseSchema.safeParse({
      weight: 165,
      unit: 'pounds',
      confidence: 95,
      readable: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejects weight as a string', () => {
    // OCR sometimes returns "165.4" — must coerce or fail. We chose
    // fail-loud so the caller surfaces the OCR-quality issue.
    const result = WeightScaleOCRResponseSchema.safeParse({
      weight: '165.4',
      unit: 'lbs',
      confidence: 95,
      readable: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejects confidence > 100', () => {
    const result = WeightScaleOCRResponseSchema.safeParse({
      weight: 165,
      unit: 'lbs',
      confidence: 110,
      readable: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative confidence', () => {
    const result = WeightScaleOCRResponseSchema.safeParse({
      weight: 165,
      unit: 'lbs',
      confidence: -5,
      readable: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejects readable as a string (must be boolean)', () => {
    const result = WeightScaleOCRResponseSchema.safeParse({
      weight: 165,
      unit: 'lbs',
      confidence: 95,
      readable: 'yes',
    })
    expect(result.success).toBe(false)
  })

  it('rejects entirely-missing input', () => {
    const result = WeightScaleOCRResponseSchema.safeParse(null)
    expect(result.success).toBe(false)
  })
})

describe('ShoppingSuggestionsResponseSchema — T3.7 #5 PHI-derived suggestion gate', () => {
  it('accepts a fully-populated valid response', () => {
    const valid = {
      suggestions: [
        {
          productName: 'Steel-cut oats',
          category: 'pantry',
          reason: 'low-sodium-diet',
          reasonText: 'Whole grain, low sodium, helps blood-sugar stability.',
          priority: 'high',
          benefits: ['high fiber', 'low sodium'],
          suggestedProducts: ['Bob\'s Red Mill Steel Cut Oats'],
          confidence: 88,
        },
      ],
      itemsToAvoid: [
        {
          productName: 'Instant ramen',
          reason: 'sodium 1800mg per pack exceeds daily target',
          severity: 'high',
        },
      ],
    }
    const result = ShoppingSuggestionsResponseSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('accepts an empty suggestions array (no recommendations)', () => {
    const result = ShoppingSuggestionsResponseSchema.safeParse({
      suggestions: [],
    })
    expect(result.success).toBe(true)
  })

  it('accepts suggestions without optional suggestedProducts', () => {
    const result = ShoppingSuggestionsResponseSchema.safeParse({
      suggestions: [
        {
          productName: 'Greek yogurt',
          category: 'dairy',
          reason: 'high-protein',
          reasonText: 'Protein for satiety.',
          priority: 'medium',
          benefits: ['protein', 'probiotic'],
          confidence: 75,
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing suggestions field', () => {
    const result = ShoppingSuggestionsResponseSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects suggestions as a single object (must be array)', () => {
    const result = ShoppingSuggestionsResponseSchema.safeParse({
      suggestions: {
        productName: 'Greek yogurt',
        category: 'dairy',
        reason: 'high-protein',
        reasonText: 'Protein for satiety.',
        priority: 'medium',
        benefits: ['protein'],
        confidence: 75,
      },
    })
    expect(result.success).toBe(false)
  })

  it('rejects confidence > 100 (overconfidence regression)', () => {
    const result = ShoppingSuggestionsResponseSchema.safeParse({
      suggestions: [
        {
          productName: 'X',
          category: 'X',
          reason: 'X',
          reasonText: 'X',
          priority: 'high',
          benefits: [],
          confidence: 110,
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects benefits as a string (must be array)', () => {
    const result = ShoppingSuggestionsResponseSchema.safeParse({
      suggestions: [
        {
          productName: 'X',
          category: 'X',
          reason: 'X',
          reasonText: 'X',
          priority: 'high',
          benefits: 'high fiber, low sodium',
          confidence: 80,
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects benefits array with non-string elements', () => {
    const result = ShoppingSuggestionsResponseSchema.safeParse({
      suggestions: [
        {
          productName: 'X',
          category: 'X',
          reason: 'X',
          reasonText: 'X',
          priority: 'high',
          benefits: ['high fiber', 42, true],
          confidence: 80,
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects itemsToAvoid with missing required severity', () => {
    const result = ShoppingSuggestionsResponseSchema.safeParse({
      suggestions: [],
      itemsToAvoid: [
        {
          productName: 'Instant ramen',
          reason: 'too much sodium',
          // severity missing
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects suggestion with missing productName', () => {
    const result = ShoppingSuggestionsResponseSchema.safeParse({
      suggestions: [
        {
          // productName missing — would render an empty card
          category: 'pantry',
          reason: 'X',
          reasonText: 'X',
          priority: 'high',
          benefits: [],
          confidence: 80,
        },
      ],
    })
    expect(result.success).toBe(false)
  })
})
