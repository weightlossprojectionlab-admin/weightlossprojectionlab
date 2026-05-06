/**
 * Golden eval: callGeminiMealSafety. See health-profile.test.ts for
 * the harness-mode rationale.
 */

import { describe, it, expect } from '@jest/globals'
import { MealSafetyResponseSchema } from '@/lib/validations/health-vitals'
import { mealSafetyCases } from './cases/meal-safety-cases'
import { shouldRunLive } from './harness'

describe('Golden eval — callGeminiMealSafety (synthetic mode)', () => {
  for (const tc of mealSafetyCases) {
    it(tc.name, () => {
      const validated = MealSafetyResponseSchema.safeParse(tc.synthetic)
      expect(validated.success).toBe(true)
      if (!validated.success) return
      tc.assertions(validated.data as typeof tc.synthetic)
    })
  }
})

const liveDescribe = shouldRunLive() ? describe : describe.skip

liveDescribe('Golden eval — callGeminiMealSafety (live Gemini)', () => {
  for (const tc of mealSafetyCases) {
    // The null-profile case has an early-return path that doesn't
    // call Gemini.
    if (!tc.input.healthProfile) continue

    it(
      tc.name,
      async () => {
        // Dynamic import — see health-profile.test.ts for rationale.
        const { callGeminiMealSafety } = await import('@/lib/gemini')
        const response = await callGeminiMealSafety(tc.input)
        tc.assertions(response)
      },
      30_000,
    )
  }
})
