/**
 * Regression tests for the medication-AI Zod gates (T3.7 punch-list
 * items #5 / #6).
 *
 * Two pipelines validated:
 *   1. /api/ocr/medication — Gemini Vision output for prescription
 *      labels. Output includes patient PHI (name, address) and goes
 *      directly into the patient medication record. A malformed
 *      shape (warnings-as-string, strength-as-number, missing
 *      medicationName, etc.) used to silently corrupt records;
 *      MedicationOCRResponseSchema now rejects them upstream.
 *   2. lib/medication-classifier — Gemini's drug→condition mapping.
 *      Output drives auto-suggested patient conditions, so a bogus
 *      confidence score (negative, >100) or wrong-shape conditions
 *      array would surface bad recommendations to caregivers.
 *
 * These tests pin the schemas. A regression that loosens either
 * (e.g., `medicationName` optional, `confidence` widened past
 * [0,100], `warnings` accepts strings) trips the suite.
 */

import { describe, it, expect } from '@jest/globals'
import {
  MedicationOCRResponseSchema,
  MedicationClassifierResponseSchema,
} from '@/lib/validations/medication'

describe('MedicationOCRResponseSchema — T3.7 #5 OCR gate', () => {
  it('accepts a fully-populated valid response', () => {
    const valid = {
      medicationName: 'Lisinopril',
      strength: '10mg',
      dosageForm: 'tablet',
      frequency: 'once daily',
      rxNumber: 'RX12345',
      prescribingDoctor: 'Dr. Smith',
      patientName: 'Jane Doe',
      patientAddress: '123 Main St',
      ndc: '00378-0421-01',
      pharmacy: 'CVS',
      pharmacyPhone: '555-1234',
      quantity: '30',
      refills: '5',
      fillDate: '2026-04-01',
      expirationDate: '2027-04-01',
      warnings: ['Take with food', 'Do not crush'],
    }
    const result = MedicationOCRResponseSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('accepts a minimal response (only medicationName)', () => {
    // Real labels often have only the drug name visible — the schema
    // must accept that rather than rejecting partial-but-useful OCR.
    const result = MedicationOCRResponseSchema.safeParse({
      medicationName: 'Metformin',
    })
    expect(result.success).toBe(true)
  })

  it('accepts nullable optionals (Gemini sometimes returns null instead of omitting)', () => {
    const result = MedicationOCRResponseSchema.safeParse({
      medicationName: 'Atorvastatin',
      strength: null,
      warnings: null,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing medicationName', () => {
    const result = MedicationOCRResponseSchema.safeParse({
      strength: '10mg',
      // medicationName intentionally absent — without it the record
      // would be useless / dangerous.
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty-string medicationName', () => {
    // Gemini occasionally returns empty strings instead of omitting.
    // Schema's .min(1) catches this so a meaningless record never
    // reaches the patient.
    const result = MedicationOCRResponseSchema.safeParse({
      medicationName: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects warnings as a string (must be an array)', () => {
    // The exact regression the comments call out — Gemini once
    // emitted "Take with food, do not crush" as a single string.
    // Without the array gate, that joined-string blob landed in a
    // string-warnings UI list as a single entry.
    const result = MedicationOCRResponseSchema.safeParse({
      medicationName: 'Lisinopril',
      warnings: 'Take with food, do not crush',
    })
    expect(result.success).toBe(false)
  })

  it('rejects warnings array with non-string elements', () => {
    const result = MedicationOCRResponseSchema.safeParse({
      medicationName: 'Lisinopril',
      warnings: ['Take with food', 42, { obj: 'bad' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects strength as a number (must be string for "10mg" formats)', () => {
    const result = MedicationOCRResponseSchema.safeParse({
      medicationName: 'Lisinopril',
      strength: 10,
    })
    expect(result.success).toBe(false)
  })

  it('rejects entirely-missing input', () => {
    const result = MedicationOCRResponseSchema.safeParse(null)
    expect(result.success).toBe(false)
  })
})

describe('MedicationClassifierResponseSchema — T3.7 #5 classifier gate', () => {
  it('accepts a valid classifier response', () => {
    const valid = {
      classifications: [
        {
          medicationName: 'Lisinopril',
          likelyConditions: ['hypertension', 'heart failure'],
          confidence: 92,
          reasoning: 'ACE inhibitor commonly prescribed for hypertension.',
          isPrimaryTreatment: true,
        },
        {
          medicationName: 'Metformin',
          likelyConditions: ['type 2 diabetes'],
          confidence: 95,
          reasoning: 'First-line treatment for T2DM.',
          isPrimaryTreatment: true,
        },
      ],
    }
    const result = MedicationClassifierResponseSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('accepts an empty classifications array (no medications matched)', () => {
    const result = MedicationClassifierResponseSchema.safeParse({
      classifications: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing classifications field', () => {
    const result = MedicationClassifierResponseSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects confidence > 100 (Gemini hallucinating overconfidence)', () => {
    // Specific class of regression: model returns 110 / 9999 etc.
    // Bound enforces sanity so the UI doesn't render "999% confident
    // this is a heart medication."
    const result = MedicationClassifierResponseSchema.safeParse({
      classifications: [
        {
          medicationName: 'Lisinopril',
          likelyConditions: ['hypertension'],
          confidence: 110,
          reasoning: 'Test',
          isPrimaryTreatment: true,
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative confidence', () => {
    const result = MedicationClassifierResponseSchema.safeParse({
      classifications: [
        {
          medicationName: 'Lisinopril',
          likelyConditions: ['hypertension'],
          confidence: -5,
          reasoning: 'Test',
          isPrimaryTreatment: true,
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects likelyConditions as a string (must be array)', () => {
    const result = MedicationClassifierResponseSchema.safeParse({
      classifications: [
        {
          medicationName: 'Lisinopril',
          likelyConditions: 'hypertension, heart failure',
          confidence: 92,
          reasoning: 'Test',
          isPrimaryTreatment: true,
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects isPrimaryTreatment as a string (must be boolean)', () => {
    const result = MedicationClassifierResponseSchema.safeParse({
      classifications: [
        {
          medicationName: 'Lisinopril',
          likelyConditions: ['hypertension'],
          confidence: 92,
          reasoning: 'Test',
          isPrimaryTreatment: 'yes',
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing required mapping fields', () => {
    const result = MedicationClassifierResponseSchema.safeParse({
      classifications: [
        {
          medicationName: 'Lisinopril',
          // likelyConditions missing
          confidence: 92,
          reasoning: 'Test',
          isPrimaryTreatment: true,
        },
      ],
    })
    expect(result.success).toBe(false)
  })
})
