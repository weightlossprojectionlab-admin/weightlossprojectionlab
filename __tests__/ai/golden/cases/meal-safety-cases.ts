/**
 * Golden cases for callGeminiMealSafety.
 *
 * Two semantic dimensions matter most:
 *   1. Severity escalation — meals near or over the daily-limit
 *      percentage MUST be flagged (not silently isSafe:true).
 *   2. Failure-mode floor — when AI misbehaves, isSafe defaults to
 *      false (caution), never permissive.
 */

import type { MealSafetyCheck, AIHealthProfile } from '@/types'
import type { GoldenCase } from '../harness'
import { assertNumber, assertArray } from '../harness'

type MealSafetyInput = {
  meal: {
    foodItems: Array<{ name: string; portion: string; calories: number; protein: number; carbs: number; fat: number; fiber: number; sodium?: number }>
    totalCalories: number
    totalMacros: { protein: number; carbs: number; fat: number; fiber: number }
    sodium?: number
  }
  healthProfile: AIHealthProfile | null
}

const HYPERTENSION_PROFILE: AIHealthProfile = {
  restrictions: {
    sodium: { limit: 2000, unit: 'mg', reason: 'Hypertension control' },
  },
  monitorNutrients: ['sodium'],
  criticalWarnings: [],
  confidence: 90,
  reviewStatus: 'approved',
  generatedAt: '2026-05-06T12:00:00Z',
}

export const mealSafetyCases: GoldenCase<MealSafetyInput, MealSafetyCheck>[] = [
  // ---------------------------------------------------------------
  // High-sodium fast-food meal vs. hypertension profile (2000mg cap).
  // 1800mg in one meal = 90% of daily cap; must be 'critical' severity.
  // ---------------------------------------------------------------
  {
    name: 'fast-food meal (1800mg sodium) vs. hypertension cap -> critical',
    input: {
      meal: {
        foodItems: [
          { name: 'Cheeseburger', portion: '1 large', calories: 720, protein: 35, carbs: 50, fat: 38, fiber: 3, sodium: 1100 },
          { name: 'Fries', portion: 'large', calories: 480, protein: 6, carbs: 60, fat: 23, fiber: 5, sodium: 700 },
        ],
        totalCalories: 1200,
        totalMacros: { protein: 41, carbs: 110, fat: 61, fiber: 8 },
        sodium: 1800,
      },
      healthProfile: HYPERTENSION_PROFILE,
    },
    synthetic: {
      isSafe: false,
      severity: 'critical',
      warnings: [
        'This meal contains 1800mg sodium — 90% of your daily limit. Sodium-heavy fast-food items are the largest contributor.',
      ],
      confidence: 95,
    },
    assertions: (r) => {
      if (r.isSafe !== false) {
        throw new Error(`isSafe: expected false (sodium 90% of daily), got ${r.isSafe}`)
      }
      if (r.severity !== 'critical' && r.severity !== 'caution') {
        throw new Error(`severity: expected 'critical' or 'caution', got '${r.severity}'`)
      }
      assertArray('warnings', r.warnings, { minLength: 1 })
      assertNumber('confidence', r.confidence, { atLeast: 70 })
    },
  },

  // ---------------------------------------------------------------
  // Light meal well within hypertension limits — should be safe.
  // ---------------------------------------------------------------
  {
    name: 'low-sodium salad (350mg) vs. hypertension cap -> safe',
    input: {
      meal: {
        foodItems: [
          { name: 'Mixed greens salad', portion: '2 cups', calories: 80, protein: 3, carbs: 12, fat: 1, fiber: 5, sodium: 50 },
          { name: 'Grilled chicken breast', portion: '4 oz', calories: 180, protein: 35, carbs: 0, fat: 4, fiber: 0, sodium: 80 },
          { name: 'Olive oil dressing', portion: '1 tbsp', calories: 120, protein: 0, carbs: 0, fat: 14, fiber: 0, sodium: 220 },
        ],
        totalCalories: 380,
        totalMacros: { protein: 38, carbs: 12, fat: 19, fiber: 5 },
        sodium: 350,
      },
      healthProfile: HYPERTENSION_PROFILE,
    },
    synthetic: {
      isSafe: true,
      severity: 'safe',
      warnings: [],
      confidence: 96,
    },
    assertions: (r) => {
      if (r.isSafe !== true) {
        throw new Error(`isSafe: expected true (350mg is well under daily cap), got ${r.isSafe}`)
      }
      if (r.severity !== 'safe') {
        throw new Error(`severity: expected 'safe', got '${r.severity}'`)
      }
      assertNumber('confidence', r.confidence, { atLeast: 70 })
    },
  },

  // ---------------------------------------------------------------
  // No health profile — meal is trivially safe (early-return path).
  // ---------------------------------------------------------------
  {
    name: 'no health profile -> safe with confidence 100 (early return)',
    input: {
      meal: {
        foodItems: [
          { name: 'Chicken sandwich', portion: '1', calories: 600, protein: 35, carbs: 60, fat: 22, fiber: 4, sodium: 1500 },
        ],
        totalCalories: 600,
        totalMacros: { protein: 35, carbs: 60, fat: 22, fiber: 4 },
        sodium: 1500,
      },
      healthProfile: null,
    },
    synthetic: {
      isSafe: true,
      severity: 'safe',
      warnings: [],
      confidence: 100,
    },
    assertions: (r) => {
      if (r.isSafe !== true) {
        throw new Error(`isSafe: with null profile must be true, got ${r.isSafe}`)
      }
      assertNumber('confidence', r.confidence, { equals: 100 })
    },
  },
]
