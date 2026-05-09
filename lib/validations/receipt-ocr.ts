/**
 * Validation schema for the Receipt OCR Gemini Vision pipeline
 * (/api/ocr/receipt). Output flows into the in-store shopping
 * trip-summary apply flow — items get matched against the trip's
 * found-items list and unit prices land on inventory rows. A malformed
 * shape would either silently corrupt prices or skip the item match,
 * so we gate the parse with this schema before handing it to the UI.
 *
 * Prices are stored as integer cents to match purchasePriceCents on
 * ShoppingItem and the rest of the inventory-pricing pipeline.
 */

import { z } from 'zod'

const ReceiptItemSchema = z.object({
  /** The exact text as printed on the receipt (e.g. "GV WHL MILK 1G"). */
  rawName: z.string().min(1),
  /** Best-effort cleaned-up product name (e.g. "Great Value Whole Milk Gallon"). */
  normalizedName: z.string().nullable().optional(),
  /** Unit count if printed; many receipts only show a single line per unit. */
  quantity: z.number().nullable().optional(),
  /** Per-unit price in cents (integer). null when only a line total is printed. */
  unitPriceCents: z.number().int().nullable().optional(),
  /** Total for the line in cents (integer). */
  totalPriceCents: z.number().int().nullable().optional(),
})

export const ReceiptOCRResponseSchema = z.object({
  store: z.string().nullable().optional(),
  /** Stringified date as it appears on the receipt — UI normalizes. */
  date: z.string().nullable().optional(),
  items: z.array(ReceiptItemSchema),
  subtotalCents: z.number().int().nullable().optional(),
  taxCents: z.number().int().nullable().optional(),
  totalCents: z.number().int().nullable().optional(),
  /** Gemini's self-reported confidence (0-100). */
  confidence: z.number().min(0).max(100),
})

export type ReceiptOCRResponse = z.infer<typeof ReceiptOCRResponseSchema>
export type ReceiptOCRItem = z.infer<typeof ReceiptItemSchema>
