/**
 * Lab-result plausibility bounds.
 *
 * Why: T3.7 (Zod gate at the OCR boundary) catches SHAPE drift —
 * objects becoming strings, missing required fields. It does NOT
 * catch SEMANTIC drift — "blood glucose 9999 mg/dL" and
 * "sodium 9000 mEq/L" satisfy the schema (string + number) but
 * are clinically nonsense and would corrupt the patient record.
 *
 * This module enforces per-test-type ranges: each known lab gets
 * a min/max in canonical units. Values outside the range are
 * dropped from the extraction result and logged.
 *
 * Ranges are intentionally generous — wider than typical
 * "normal" ranges so that genuinely abnormal but real values
 * (DKA glucose 800, severe hyponatremia 110 mEq/L) still make
 * it through. The goal is to catch OCR garbage (transposed
 * digits, missing decimal point), not to clinically interpret.
 *
 * Unrecognized test names pass through unchecked — we'd rather
 * preserve a result we don't have ranges for than silently drop
 * unusual labs (e.g., specialty endocrine panels, oncology
 * markers, pediatric-specific tests).
 */

interface LabRange {
  /** Inclusive lower bound for plausible values. */
  min: number
  /** Inclusive upper bound for plausible values. */
  max: number
  /** Canonical unit for documentation; ranges assume this unit. */
  unit: string
}

/**
 * Ordered list of (keyword set → range). Keywords match against
 * lower-cased test-name substrings. First match wins, so list more-
 * specific keywords (e.g., "ldl cholesterol") before broader ones
 * (e.g., "cholesterol").
 */
const LAB_RANGES: Array<{ keywords: string[]; range: LabRange }> = [
  // Glycemic
  { keywords: ['hba1c', 'a1c', 'glycated hemoglobin'], range: { min: 3, max: 20, unit: '%' } },
  { keywords: ['fasting blood sugar', 'fasting glucose', 'fbs', 'glucose'], range: { min: 20, max: 1000, unit: 'mg/dL' } },

  // Electrolytes
  { keywords: ['sodium', ' na ', 'na+'], range: { min: 100, max: 200, unit: 'mEq/L' } },
  { keywords: ['potassium', ' k ', 'k+'], range: { min: 1, max: 15, unit: 'mEq/L' } },
  { keywords: ['chloride', ' cl ', 'cl-'], range: { min: 70, max: 140, unit: 'mEq/L' } },
  { keywords: ['bicarbonate', 'co2', 'hco3'], range: { min: 5, max: 50, unit: 'mEq/L' } },
  { keywords: ['calcium', ' ca '], range: { min: 4, max: 18, unit: 'mg/dL' } },
  { keywords: ['magnesium', ' mg '], range: { min: 0.5, max: 5, unit: 'mg/dL' } },
  { keywords: ['phosphorus', 'phosphate'], range: { min: 0.5, max: 15, unit: 'mg/dL' } },

  // Renal
  { keywords: ['blood urea nitrogen', 'bun'], range: { min: 0, max: 200, unit: 'mg/dL' } },
  { keywords: ['creatinine'], range: { min: 0.1, max: 30, unit: 'mg/dL' } },
  { keywords: ['egfr', 'estimated gfr'], range: { min: 1, max: 200, unit: 'mL/min' } },

  // Lipids — order matters: ldl/hdl before total
  { keywords: ['ldl cholesterol', 'ldl'], range: { min: 10, max: 700, unit: 'mg/dL' } },
  { keywords: ['hdl cholesterol', 'hdl'], range: { min: 5, max: 200, unit: 'mg/dL' } },
  { keywords: ['triglycerides', 'tg '], range: { min: 20, max: 5000, unit: 'mg/dL' } },
  { keywords: ['total cholesterol', 'cholesterol'], range: { min: 50, max: 1000, unit: 'mg/dL' } },

  // Hepatic
  { keywords: ['alanine aminotransferase', 'alt', 'sgpt'], range: { min: 0, max: 3000, unit: 'U/L' } },
  { keywords: ['aspartate aminotransferase', 'ast', 'sgot'], range: { min: 0, max: 3000, unit: 'U/L' } },
  { keywords: ['alkaline phosphatase', 'alp', 'alk phos'], range: { min: 10, max: 2000, unit: 'U/L' } },
  { keywords: ['total bilirubin', 'bilirubin'], range: { min: 0, max: 50, unit: 'mg/dL' } },
  { keywords: ['albumin'], range: { min: 1, max: 6, unit: 'g/dL' } },
  { keywords: ['total protein'], range: { min: 3, max: 10, unit: 'g/dL' } },

  // CBC
  { keywords: ['hemoglobin', 'hgb', ' hb '], range: { min: 1, max: 25, unit: 'g/dL' } },
  { keywords: ['hematocrit', 'hct'], range: { min: 5, max: 75, unit: '%' } },
  // White blood cell count and platelets reported in K/µL (×10³/µL)
  { keywords: ['white blood cell', 'wbc'], range: { min: 0.1, max: 200, unit: 'K/µL' } },
  { keywords: ['platelet', 'plt'], range: { min: 1, max: 2000, unit: 'K/µL' } },
  // Red blood cells reported in M/µL (×10⁶/µL)
  { keywords: ['red blood cell', 'rbc'], range: { min: 0.5, max: 10, unit: 'M/µL' } },

  // Thyroid
  { keywords: ['tsh', 'thyroid stimulating hormone'], range: { min: 0.001, max: 500, unit: 'mIU/L' } },
  { keywords: ['free t4', 'ft4'], range: { min: 0.1, max: 15, unit: 'ng/dL' } },
  { keywords: ['free t3', 'ft3'], range: { min: 0.5, max: 30, unit: 'pg/mL' } },

  // Cardiac
  { keywords: ['troponin'], range: { min: 0, max: 100, unit: 'ng/mL' } },
  { keywords: ['bnp', 'brain natriuretic peptide'], range: { min: 0, max: 50000, unit: 'pg/mL' } },

  // Coagulation
  { keywords: ['inr'], range: { min: 0.5, max: 15, unit: '' } },
  { keywords: ['prothrombin time', 'pt '], range: { min: 5, max: 100, unit: 'sec' } },
]

export type PlausibilityReason =
  | 'unrecognized-test'
  | 'unparseable-value'
  | 'out-of-range'

export interface PlausibilityResult {
  /** True when the value is within plausible bounds OR the test is unrecognized (pass-through). */
  inRange: boolean
  /** Numeric value parsed out of the input string. Undefined when unparseable. */
  parsedValue?: number
  /** First keyword from the matched range, for logging. Undefined when unrecognized. */
  matchedKeyword?: string
  /** Why the result is being flagged. Only set when inRange === false OR unrecognized. */
  reason?: PlausibilityReason
}

/**
 * Check whether a parsed lab result's numeric value is plausible.
 *
 * - Returns `inRange: true` for both in-range values AND tests
 *   we don't have ranges for (we don't drop unfamiliar labs).
 * - Returns `inRange: false` only when the test is recognized AND
 *   the value parses but falls outside our generous bounds.
 *
 * Caller should drop / flag results where `inRange === false`.
 */
export function checkLabPlausibility(
  testName: string,
  value: string | number,
): PlausibilityResult {
  // Strip non-numeric characters except sign and decimal — handles
  // values like "9999 mg/dL", "  142.7 ", "<0.01" (which becomes 0.01).
  const numericValue =
    typeof value === 'number'
      ? value
      : parseFloat(String(value).replace(/[^0-9.\-]/g, ''))

  if (Number.isNaN(numericValue)) {
    return { inRange: false, reason: 'unparseable-value' }
  }

  const lowerName = ` ${testName.toLowerCase()} `
  const match = LAB_RANGES.find((r) =>
    r.keywords.some((k) => lowerName.includes(k.toLowerCase())),
  )

  if (!match) {
    // Unknown test — pass through. Returning inRange:true so caller
    // keeps the result.
    return {
      inRange: true,
      parsedValue: numericValue,
      reason: 'unrecognized-test',
    }
  }

  const inRange =
    numericValue >= match.range.min && numericValue <= match.range.max

  return {
    inRange,
    parsedValue: numericValue,
    matchedKeyword: match.keywords[0],
    reason: inRange ? undefined : 'out-of-range',
  }
}

/**
 * Walk a list of lab results and drop ones whose numeric value falls
 * outside the per-test plausibility bounds. Logs a sample of drops
 * (capped at 5) for telemetry.
 *
 * The T3.8 plausibility gate. Lives in this module rather than
 * lib/document-data-extractor so the gate can be tested without
 * pulling firebase-admin / jose / Gemini transitively. Don't
 * inline-rewrite without updating the regression suite at
 * __tests__/lib/lab-plausibility.test.ts.
 */
import { logger } from '@/lib/logger'
import type { LabResultEntry } from '@/types/medical'

export function filterImplausibleLabs(shaped: LabResultEntry[]): LabResultEntry[] {
  const samples: Array<{ testName: string; value: string; reason: string; matched?: string }> = []

  const kept = shaped.filter((lr) => {
    const check = checkLabPlausibility(lr.testName, lr.value)
    if (check.inRange) return true
    if (samples.length < 5) {
      samples.push({
        testName: lr.testName,
        value: lr.value,
        reason: check.reason ?? 'unknown',
        matched: check.matchedKeyword,
      })
    }
    return false
  })

  if (kept.length !== shaped.length) {
    logger.warn('[LabPlausibility] Dropped implausible lab results', {
      droppedCount: shaped.length - kept.length,
      keptCount: kept.length,
      samples,
    })
  }

  return kept
}
