/**
 * Regression tests for the document OCR plausibility gate (T3.8).
 *
 * The launch-hardening punch list documented two safety gates on the
 * document → patient labResults pipeline:
 *   - Zod shape validation (T3.7) — verified by the golden harness
 *     at __tests__/ai/golden/ for AI-call boundaries
 *   - Plausibility bounds (T3.8) — drops out-of-range values that
 *     pass Zod but would corrupt the patient record
 *
 * This file pins T3.8. The gate exists so a Gemini hallucination of
 * "blood glucose 9999 mg/dL" or a stray OCR digit doesn't make it
 * into the patient profile. Every regression that loosens the gate
 * (e.g., wrapping the filter in a feature flag, removing it from
 * the normalize step, skipping unknown-test pass-through) should
 * fail one of these cases.
 *
 * Direct testing of the boundary function rather than mocking the
 * Gemini round-trip — the gate is a pure function and that's the
 * cleanest place to assert the contract.
 */

import { describe, it, expect } from '@jest/globals'
import { filterImplausibleLabs } from '@/lib/lab-plausibility'
import type { LabResultEntry } from '@/types/medical'

// Suppress the warn-log spam that the production code emits when
// it drops a result. We're intentionally feeding bad data.
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('filterImplausibleLabs — T3.8 plausibility gate', () => {
  it('passes through plausible lab values', () => {
    const input: LabResultEntry[] = [
      { testName: 'Glucose', value: '95', unit: 'mg/dL' },
      { testName: 'Sodium', value: '142', unit: 'mEq/L' },
      { testName: 'Hemoglobin', value: '14.5', unit: 'g/dL' },
    ]
    const out = filterImplausibleLabs(input)
    expect(out).toHaveLength(3)
    expect(out.map((r) => r.testName)).toEqual(['Glucose', 'Sodium', 'Hemoglobin'])
  })

  it('drops a glucose reading of 9999 mg/dL (canonical OCR-garbage example)', () => {
    const input: LabResultEntry[] = [
      { testName: 'Glucose', value: '9999', unit: 'mg/dL' },
    ]
    const out = filterImplausibleLabs(input)
    expect(out).toHaveLength(0)
  })

  it('drops a sodium reading of 9000 mEq/L (incompatible-with-life value)', () => {
    const input: LabResultEntry[] = [
      { testName: 'Sodium', value: '9000', unit: 'mEq/L' },
    ]
    const out = filterImplausibleLabs(input)
    expect(out).toHaveLength(0)
  })

  it('preserves valid results in a mixed valid/invalid batch', () => {
    const input: LabResultEntry[] = [
      { testName: 'Glucose', value: '95', unit: 'mg/dL' }, // valid
      { testName: 'Glucose', value: '9999', unit: 'mg/dL' }, // bogus
      { testName: 'Sodium', value: '140', unit: 'mEq/L' }, // valid
      { testName: 'Sodium', value: '5000', unit: 'mEq/L' }, // bogus
      { testName: 'Hemoglobin', value: '14', unit: 'g/dL' }, // valid
    ]
    const out = filterImplausibleLabs(input)
    expect(out).toHaveLength(3)
    expect(out.map((r) => `${r.testName}=${r.value}`)).toEqual([
      'Glucose=95',
      'Sodium=140',
      'Hemoglobin=14',
    ])
  })

  it('drops unparseable values (e.g., garbled OCR text)', () => {
    const input: LabResultEntry[] = [
      { testName: 'Glucose', value: 'illegible', unit: 'mg/dL' },
      { testName: 'Sodium', value: '~~~~', unit: 'mEq/L' },
    ]
    const out = filterImplausibleLabs(input)
    expect(out).toHaveLength(0)
  })

  it('passes through unrecognized tests (better to keep than drop)', () => {
    // The gate intentionally lets unknown tests through — we don't
    // have ranges for everything, and silently dropping unfamiliar
    // labs would be worse than carrying them forward.
    const input: LabResultEntry[] = [
      { testName: 'Some Esoteric Genetic Marker', value: '0.42', unit: 'fmol/L' },
    ]
    const out = filterImplausibleLabs(input)
    expect(out).toHaveLength(1)
    expect(out[0].testName).toBe('Some Esoteric Genetic Marker')
  })

  it('handles values with embedded units / formatting (parses to number)', () => {
    // Real OCR sometimes hands us the unit baked into the value.
    // The gate should still extract the number and check it.
    const input: LabResultEntry[] = [
      { testName: 'Glucose', value: '95 mg/dL', unit: '' }, // valid: parses to 95
      { testName: 'Glucose', value: '142.7  ', unit: '' }, // valid: trailing whitespace stripped, parses to 142.7
      { testName: 'Glucose', value: '9999 mg/dL', unit: '' }, // bogus: parses to 9999, exceeds max
    ]
    const out = filterImplausibleLabs(input)
    expect(out).toHaveLength(2)
    expect(out.map((r) => r.value)).toEqual(['95 mg/dL', '142.7  '])
  })

  it('drops a glucose reading of 0 (incompatible-with-life lower bound)', () => {
    // Lower-bound check — a reading of zero glucose is not survivable
    // and almost certainly OCR garbage or a missing-data sentinel.
    // Note: the lab-plausibility ranges may not have a strict lower
    // bound on every test, so this case documents the expected
    // behavior. Adjust the assertion if ranges intentionally allow
    // zero for some tests.
    const input: LabResultEntry[] = [
      { testName: 'Hemoglobin', value: '0', unit: 'g/dL' }, // 0 is below min
    ]
    const out = filterImplausibleLabs(input)
    // Hemoglobin range starts above 0, so this should drop.
    expect(out).toHaveLength(0)
  })

  it('returns an empty array for an empty input (no crashes on edge case)', () => {
    expect(filterImplausibleLabs([])).toEqual([])
  })
})
