/**
 * Golden-case eval harness for Gemini-backed AI pipelines.
 *
 * Why this exists:
 *   T3.7 added Zod gates at every parse boundary, but the gates
 *   only catch SHAPE drift. They don't catch:
 *     - prompt regressions (Gemini still emits the right shape but
 *       with semantically wrong values for known conditions)
 *     - validator drift (someone tightens a Zod schema, breaks a
 *       valid Gemini output without realizing)
 *     - normalizer regressions (filterImplausibleLabs gets too
 *       aggressive, drops legit clinical values)
 *
 *   Golden cases assert BOUNDS, not exact values, because Gemini
 *   responses vary across runs. A case for "hypertension" doesn't
 *   require sodium === 2000; it requires 1500 <= sodium <= 2300.
 *
 * Modes:
 *   synthetic — hand-crafted Gemini responses replayed against
 *               our parse/validate/normalize logic. Deterministic,
 *               runs in every CI. Catches regressions in OUR code.
 *   live      — actually calls Gemini. Catches regressions in
 *               AI behavior + prompt quality. Gated behind
 *               RUN_LIVE_AI_TESTS=1 + GEMINI_API_KEY. Slow + costs
 *               money + flaky; manual / nightly runs only.
 *
 * Adding a case: append to the `cases` array in the per-pipeline
 * test file. Provide a synthetic response that the assertions would
 * accept; live mode then verifies Gemini stays within those bounds.
 */

export type GoldenMode = 'synthetic' | 'live'

/**
 * Bound-style assertions. Mix-and-match per field. The harness
 * walks the response and checks every assertion that's set.
 */
export interface NumericBound {
  /** Inclusive [min, max] range. */
  between?: [number, number]
  /** Inclusive lower bound. */
  atLeast?: number
  /** Inclusive upper bound. */
  atMost?: number
  /** Exact integer/numeric match (rare; prefer ranges). */
  equals?: number
}

export interface StringContains {
  /** Case-insensitive substring match (any one of these). */
  containsAny?: string[]
  /** Case-insensitive substring match (all of these). */
  containsAll?: string[]
}

export interface ArrayBound<T> {
  minLength?: number
  maxLength?: number
  /** Each element must satisfy the per-element assertion. */
  every?: (item: T) => boolean
  /** At least one element must satisfy the per-element assertion. */
  some?: (item: T) => boolean
}

/**
 * A single golden case.
 *
 *   T = input shape (fn args)
 *   R = response shape (Gemini output, validated)
 */
export interface GoldenCase<T, R> {
  /** Human-readable case name (becomes the Jest test title). */
  name: string
  /** Input passed to the AI fn / synthetic resolver. */
  input: T
  /**
   * Synthetic Gemini response — what we expect a healthy Gemini call
   * to produce for this input. Used in synthetic mode and as the
   * lower-bar reference for what live mode should also satisfy.
   */
  synthetic: R
  /**
   * Assertion callback. Receives the validated response (synthetic
   * or live) and must throw on bound violation. Use the bound
   * helpers below.
   */
  assertions: (response: R) => void
}

// ============================================================
// Bound assertion helpers
// ============================================================

export function assertNumber(
  fieldPath: string,
  value: unknown,
  bound: NumericBound,
): void {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${fieldPath}: expected number, got ${typeof value} (${String(value)})`)
  }
  if (bound.between) {
    const [min, max] = bound.between
    if (value < min || value > max) {
      throw new Error(`${fieldPath}: ${value} not in [${min}, ${max}]`)
    }
  }
  if (bound.atLeast !== undefined && value < bound.atLeast) {
    throw new Error(`${fieldPath}: ${value} < ${bound.atLeast}`)
  }
  if (bound.atMost !== undefined && value > bound.atMost) {
    throw new Error(`${fieldPath}: ${value} > ${bound.atMost}`)
  }
  if (bound.equals !== undefined && value !== bound.equals) {
    throw new Error(`${fieldPath}: ${value} !== ${bound.equals}`)
  }
}

export function assertStringContains(
  fieldPath: string,
  value: unknown,
  bound: StringContains,
): void {
  if (typeof value !== 'string') {
    throw new Error(`${fieldPath}: expected string, got ${typeof value}`)
  }
  const lower = value.toLowerCase()
  if (bound.containsAny) {
    const hit = bound.containsAny.some((needle) => lower.includes(needle.toLowerCase()))
    if (!hit) {
      throw new Error(
        `${fieldPath}: "${value}" contains none of [${bound.containsAny.join(', ')}]`,
      )
    }
  }
  if (bound.containsAll) {
    for (const needle of bound.containsAll) {
      if (!lower.includes(needle.toLowerCase())) {
        throw new Error(`${fieldPath}: "${value}" missing required substring "${needle}"`)
      }
    }
  }
}

export function assertArray<T>(
  fieldPath: string,
  value: unknown,
  bound: ArrayBound<T>,
): void {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldPath}: expected array, got ${typeof value}`)
  }
  if (bound.minLength !== undefined && value.length < bound.minLength) {
    throw new Error(`${fieldPath}: length ${value.length} < ${bound.minLength}`)
  }
  if (bound.maxLength !== undefined && value.length > bound.maxLength) {
    throw new Error(`${fieldPath}: length ${value.length} > ${bound.maxLength}`)
  }
  if (bound.every && !value.every(bound.every)) {
    throw new Error(`${fieldPath}: 'every' assertion failed for at least one element`)
  }
  if (bound.some && !value.some(bound.some)) {
    throw new Error(`${fieldPath}: 'some' assertion failed (no element matched)`)
  }
}

/**
 * True when live-mode AI calls should be issued. Gated behind
 * RUN_LIVE_AI_TESTS=1 to keep CI free + deterministic by default.
 */
export function shouldRunLive(): boolean {
  return (
    process.env.RUN_LIVE_AI_TESTS === '1' &&
    !!process.env.GEMINI_API_KEY
  )
}
