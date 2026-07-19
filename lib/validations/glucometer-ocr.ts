import { z } from 'zod'

/**
 * Structured result of scanning a glucometer's on-screen results list
 * (e.g. "ALL RESULTS": rows of date / time / value). Mirrors the receipt-OCR
 * schema shape (a header + a rows array + a self-reported confidence) so it
 * flows through the same generateGeminiJSON path with the same guardrails.
 *
 * Values are captured AS PRINTED on the meter — date/time are free-text
 * strings parsed into ISO timestamps downstream (lib/glucometer-parse.ts),
 * because meters vary wildly in format ("07-16", "12-11", "2026/07/16",
 * "7:22 AM", "19:05") and year is often omitted.
 */
export const GlucometerReadingSchema = z.object({
  /** Date exactly as shown on the meter (e.g. "07-16", "12-11", "2026-07-16"). */
  date: z.string().min(1),
  /** Time exactly as shown (e.g. "7:22 AM", "11:31 AM", "19:05"). */
  time: z.string().min(1),
  /** Numeric glucose value as shown. */
  value: z.number(),
  /** Per-row unit if the meter prints one; usually the device-level unit applies. */
  unit: z.string().optional(),
})

export const GlucometerOCRResponseSchema = z.object({
  /** One entry per readable row. */
  readings: z.array(GlucometerReadingSchema),
  /** Device-level unit shown once as a header (e.g. "mg/dL"). */
  unit: z.string().optional(),
  /** Model's self-reported confidence 0–100. */
  confidence: z.number().min(0).max(100),
})

export type GlucometerReading = z.infer<typeof GlucometerReadingSchema>
export type GlucometerOCRResponse = z.infer<typeof GlucometerOCRResponseSchema>
