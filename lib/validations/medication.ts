/**
 * Validation schemas for medication-related AI outputs.
 *
 * Two pipelines covered here:
 *   1. Medication-label OCR (/api/ocr/medication) — Gemini Vision
 *      reads prescription bottles into structured fields. Output
 *      includes patient PHI (patient name, address) so a malformed
 *      shape risks polluting the patient record.
 *   2. Medication classifier (lib/medication-classifier.ts) — maps
 *      drug name + strength to likely conditions. Used to suggest
 *      conditions on the patient profile, so a malformed shape
 *      surfaces invalid conditions to caregivers.
 */

import { z } from 'zod'

// ============================================
// MEDICATION OCR — GEMINI VISION OUTPUT SCHEMA
// ============================================
//
// Mirrors ExtractedMedicationText (defined in app/api/ocr/medication
// /route.ts and lib/ocr-medication.ts). All non-name fields are
// optional because the underlying label rarely shows everything.
// rawText is added by the route handler post-parse, so it's not
// part of Gemini's output and isn't required here.

export const MedicationOCRResponseSchema = z.object({
  medicationName: z.string().min(1),
  strength: z.string().nullable().optional(),
  dosageForm: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  rxNumber: z.string().nullable().optional(),
  prescribingDoctor: z.string().nullable().optional(),
  patientName: z.string().nullable().optional(),
  patientAddress: z.string().nullable().optional(),
  ndc: z.string().nullable().optional(),
  pharmacy: z.string().nullable().optional(),
  pharmacyPhone: z.string().nullable().optional(),
  quantity: z.string().nullable().optional(),
  refills: z.string().nullable().optional(),
  fillDate: z.string().nullable().optional(),
  expirationDate: z.string().nullable().optional(),
  warnings: z.array(z.string()).nullable().optional(),
})

export type MedicationOCRResponse = z.infer<typeof MedicationOCRResponseSchema>

// ============================================
// MEDICATION CLASSIFIER — GEMINI OUTPUT SCHEMA
// ============================================

const MedicationConditionMappingSchema = z.object({
  medicationName: z.string(),
  likelyConditions: z.array(z.string()),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  isPrimaryTreatment: z.boolean(),
})

export const MedicationClassifierResponseSchema = z.object({
  classifications: z.array(MedicationConditionMappingSchema),
})

export type MedicationConditionMappingFromAI = z.infer<typeof MedicationConditionMappingSchema>
export type MedicationClassifierResponse = z.infer<typeof MedicationClassifierResponseSchema>
