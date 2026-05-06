/**
 * Golden cases for callGeminiHealthProfile.
 *
 * Each case has:
 *   - input: the profile data (conditions, demographics) we'd pass
 *   - synthetic: a hand-crafted "good Gemini response" for that input
 *   - assertions: bounds the validated response must satisfy
 *
 * Add cases here when:
 *   - a new condition is supported by the prompt
 *   - a real-world bug surfaces that bounds would have caught
 *   - the conflict-resolution matrix gains a new combination
 */

import type { AIHealthProfile } from '@/types'
import type { GoldenCase } from '../harness'
import { assertNumber, assertStringContains, assertArray } from '../harness'

type HealthProfileInput = {
  healthConditions: string[]
  age?: number
  gender?: string
  currentWeight?: number
  height?: number
  activityLevel?: string
  units?: 'metric' | 'imperial'
  medications?: Array<{ name: string; strength?: string }>
}

type HealthProfileResponse = Omit<
  AIHealthProfile,
  'reviewStatus' | 'generatedAt' | 'lastReviewedBy'
>

export const healthProfileCases: GoldenCase<HealthProfileInput, HealthProfileResponse>[] = [
  // ---------------------------------------------------------------
  // Hypertension alone — should produce sodium restriction at DASH
  // diet bounds (1500-2300 mg/day).
  // ---------------------------------------------------------------
  {
    name: 'hypertension alone -> sodium 1500-2300 mg/day, high confidence',
    input: {
      healthConditions: ['Hypertension'],
      age: 55,
      gender: 'female',
      activityLevel: 'lightly-active',
    },
    synthetic: {
      restrictions: {
        sodium: { limit: 2000, unit: 'mg', reason: 'DASH diet for blood pressure control' },
      },
      monitorNutrients: ['sodium'],
      criticalWarnings: [],
      confidence: 92,
    },
    assertions: (r) => {
      // Sodium restriction MUST exist
      if (!r.restrictions?.sodium?.limit) {
        throw new Error('hypertension: missing sodium.limit')
      }
      assertNumber('restrictions.sodium.limit', r.restrictions.sodium.limit, {
        between: [1500, 2300],
      })
      assertNumber('confidence', r.confidence, { atLeast: 70 })
    },
  },

  // ---------------------------------------------------------------
  // CKD stage 3 + diabetes — conflict-resolution: kidney protection
  // takes priority. Must restrict sodium + potassium AND limit
  // protein on the lower end (0.6-0.8 g/kg).
  // ---------------------------------------------------------------
  {
    name: 'CKD stage 3 + Type 2 diabetes -> sodium + potassium + protein limits',
    input: {
      healthConditions: ['Chronic Kidney Disease (Stage 3)', 'Type 2 Diabetes'],
      age: 68,
      gender: 'male',
      currentWeight: 180,
      height: 70,
      units: 'imperial',
      activityLevel: 'sedentary',
    },
    synthetic: {
      restrictions: {
        sodium: { limit: 1800, unit: 'mg', reason: 'CKD stage 3 sodium restriction' },
        potassium: { limit: 2200, unit: 'mg', reason: 'Limit potassium in CKD stage 3' },
        protein: { limit: 0.7, unit: 'g', reason: '0.6-0.8 g/kg body weight to protect kidney function' },
        carbs: { limit: 50, unit: 'g', reason: 'Per-meal carb cap for blood-sugar control' },
      },
      monitorNutrients: ['sodium', 'potassium', 'phosphorus', 'glucose'],
      criticalWarnings: [
        'Avoid salt substitutes containing potassium',
      ],
      confidence: 88,
    },
    assertions: (r) => {
      if (!r.restrictions?.sodium?.limit) throw new Error('CKD+T2D: missing sodium.limit')
      if (!r.restrictions?.potassium?.limit) throw new Error('CKD+T2D: missing potassium.limit')
      if (!r.restrictions?.protein?.limit) throw new Error('CKD+T2D: missing protein.limit')
      assertNumber('restrictions.sodium.limit', r.restrictions.sodium.limit, {
        between: [1500, 2000],
      })
      assertNumber('restrictions.potassium.limit', r.restrictions.potassium.limit, {
        between: [1500, 2500],
      })
      // Lower-end protein for kidney protection (g/kg).
      assertNumber('restrictions.protein.limit', r.restrictions.protein.limit, {
        between: [0.5, 1.0],
      })
      assertNumber('confidence', r.confidence, { atLeast: 70 })
    },
  },

  // ---------------------------------------------------------------
  // Warfarin medication — Vitamin K consistency warning is the
  // critical check. Even without explicit conditions, the meds
  // section should drive a critical warning.
  // ---------------------------------------------------------------
  {
    name: 'Warfarin medication -> Vitamin K consistency critical warning',
    input: {
      healthConditions: ['Atrial Fibrillation'],
      age: 72,
      gender: 'male',
      activityLevel: 'lightly-active',
      medications: [{ name: 'Warfarin', strength: '5mg' }],
    },
    synthetic: {
      restrictions: {},
      monitorNutrients: ['Vitamin K'],
      criticalWarnings: [
        'Maintain consistent daily Vitamin K intake (90-120 mcg/day) — large variations can reduce Warfarin effectiveness',
      ],
      confidence: 90,
    },
    assertions: (r) => {
      assertArray('criticalWarnings', r.criticalWarnings, {
        minLength: 1,
        some: (w: unknown) =>
          typeof w === 'string' &&
          /vitamin\s*k|warfarin/i.test(w),
      })
      assertNumber('confidence', r.confidence, { atLeast: 70 })
    },
  },

  // ---------------------------------------------------------------
  // No conditions — should return empty restrictions + confidence 100
  // (the "nothing to drill down into" early-return path).
  // ---------------------------------------------------------------
  {
    name: 'no conditions -> empty restrictions, confidence 100',
    input: {
      healthConditions: [],
      age: 30,
      gender: 'female',
      activityLevel: 'moderately-active',
    },
    synthetic: {
      restrictions: {},
      monitorNutrients: [],
      criticalWarnings: [],
      confidence: 100,
    },
    assertions: (r) => {
      // Restrictions should be empty (no nutrient with limit set)
      const setNutrients = Object.keys(r.restrictions).filter(
        (k) => r.restrictions[k]?.limit !== undefined,
      )
      if (setNutrients.length !== 0) {
        throw new Error(
          `expected no restrictions for empty conditions, got: ${setNutrients.join(', ')}`,
        )
      }
      assertNumber('confidence', r.confidence, { equals: 100 })
    },
  },

  // ---------------------------------------------------------------
  // Pregnancy — minimum calorie floor (1800/day). Must NOT restrict
  // calories below that even if other conditions might.
  // ---------------------------------------------------------------
  {
    name: 'pregnancy -> calorie floor preserved, prenatal warnings',
    input: {
      healthConditions: ['Pregnancy'],
      age: 30,
      gender: 'female',
      activityLevel: 'lightly-active',
    },
    synthetic: {
      restrictions: {},
      calorieAdjustment: { multiplier: 1.15, reason: 'Pregnancy increased caloric needs (~300 kcal/day)' },
      monitorNutrients: ['folate', 'iron', 'calcium'],
      criticalWarnings: [
        'Avoid alcohol, high-mercury fish, unpasteurized dairy/cheese',
      ],
      confidence: 90,
    },
    assertions: (r) => {
      assertArray('criticalWarnings', r.criticalWarnings, {
        minLength: 1,
        some: (w: unknown) =>
          typeof w === 'string' &&
          /alcohol|mercury|unpasteurized/i.test(w),
      })
      // No starvation-level calorie cut (multiplier should be >= 1)
      if (r.calorieAdjustment?.multiplier !== undefined) {
        assertNumber('calorieAdjustment.multiplier', r.calorieAdjustment.multiplier, {
          atLeast: 1.0,
        })
      }
    },
  },
]
