/**
 * Golden eval: callGeminiHealthProfile.
 *
 * Synthetic mode (default, runs in CI):
 *   Each case's `synthetic` response runs through the same Zod
 *   gate as the production code, then through the case's
 *   assertions. This catches:
 *     - Zod schema regressions (synthetic that USED to be valid
 *       suddenly rejected)
 *     - assertion-set drift (a case author changed bounds and
 *       all the synthetics still match — fine — but if a real
 *       bug change was meant to surface, the assertions need
 *       updating along with the code change).
 *
 * Live mode (manual / nightly):
 *   Run `RUN_LIVE_AI_TESTS=1 npm test -- ai/golden`. Each case
 *   sends its `input` to the real Gemini API; the response is
 *   asserted with the same case bounds. Catches Gemini behavior
 *   drift + prompt regressions.
 */

import { describe, it, expect } from '@jest/globals'
import { AIHealthProfileResponseSchema } from '@/lib/validations/health-vitals'
import { healthProfileCases } from './cases/health-profile-cases'
import { shouldRunLive } from './harness'

describe('Golden eval — callGeminiHealthProfile (synthetic mode)', () => {
  for (const tc of healthProfileCases) {
    it(tc.name, () => {
      // Synthetic response must pass the same Zod gate as a real
      // Gemini response would. This is the regression catch for
      // schema drift.
      const validated = AIHealthProfileResponseSchema.safeParse(tc.synthetic)
      expect(validated.success).toBe(true)
      if (!validated.success) return

      // Then the case-specific bounds. assertions throws on violation;
      // Jest converts that to a failed test.
      tc.assertions(validated.data as typeof tc.synthetic)
    })
  }
})

const liveDescribe = shouldRunLive() ? describe : describe.skip

liveDescribe('Golden eval — callGeminiHealthProfile (live Gemini)', () => {
  for (const tc of healthProfileCases) {
    // The "no conditions" case has an early-return path that doesn't
    // call Gemini, so it's not a useful live test.
    if (tc.input.healthConditions.length === 0) continue

    it(
      tc.name,
      async () => {
        // Dynamic import inside the test body so synthetic-only Jest
        // runs never load lib/gemini.ts (which transitively imports
        // firebase-admin and the ESM-only `jose` module that Jest
        // can't parse without a transform).
        const { callGeminiHealthProfile } = await import('@/lib/gemini')
        const response = await callGeminiHealthProfile(tc.input)
        // Live response goes through the production Zod gate already
        // inside callGeminiHealthProfile. We just re-assert bounds.
        tc.assertions(response)
      },
      30_000, // Gemini calls can take 5-15s
    )
  }
})
