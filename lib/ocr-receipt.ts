/**
 * Client wrapper for the /api/ocr/receipt server endpoint.
 *
 * Mirrors the lib/ocr-medication.ts → /api/ocr/medication client pattern:
 * grab the current user's Firebase ID token, POST the captured base64
 * images, return the parsed structured response or throw a
 * user-presentable Error.
 *
 * Kept as a small dedicated module so call sites (ActiveShoppingMode now,
 * a future "re-OCR" retry button on the results review screen later) can
 * import it without pulling in any UI.
 */

import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import type { ReceiptOCRResponse } from '@/lib/validations/receipt-ocr'

export type { ReceiptOCRResponse, ReceiptOCRItem } from '@/lib/validations/receipt-ocr'

/**
 * Cart-item context passed from the in-store flow to the receipt-OCR
 * endpoint. When present, Gemini's job changes from cold-OCR to
 * match-and-extract: items are GROUND TRUTH (from UPC catalog lookups
 * during in-store barcode scanning), Gemini just finds the price for
 * each and flags any receipt lines that don't match a known cart item.
 */
export interface KnownCartItem {
  name: string
  upc?: string | null
  quantity?: number | null
}

export async function extractReceiptFromImages(
  images: string[],
  /**
   * Per-image flag indicating whether Phase 0j perspective correction
   * was applied to each frame (vs. silently fell back to raw). Same
   * length as `images`, same order. Forwarded to the server so OCR
   * telemetry can correlate Gemini behavior (esp. address
   * hallucination) with whether the geometry was corrected.
   * Optional — older callers without 0j-aware capture data can omit.
   */
  correctedFlags?: boolean[],
  /**
   * The user's scanned-cart items, when this call originates from the
   * in-store flow (ActiveShoppingMode post-checkout). Omitted by the
   * PO / retroactive flow (inventory page) because that path has no
   * scanned cart to reconcile against. See KnownCartItem for shape.
   */
  knownItems?: KnownCartItem[],
  /**
   * Per-image reason tag set when correction did NOT fire ('no-contour',
   * 'scanner-unavailable', 'exception', etc.). Same length as `images`;
   * entries corresponding to corrected=true are typically null/empty.
   * Forwarded to the server purely for telemetry — server logs the
   * aggregated set so we can see WHY Phase 0j is falling back.
   */
  failureReasons?: Array<string | undefined>,
): Promise<ReceiptOCRResponse> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('You need to be signed in to scan a receipt.')
  }
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('No images to scan.')
  }

  const token = await user.getIdToken()

  const response = await fetch('/api/ocr/receipt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ images, correctedFlags, knownItems, failureReasons }),
  })

  if (!response.ok) {
    let message = `Receipt OCR failed (${response.status})`
    try {
      const errorBody = (await response.json()) as { error?: string; details?: string }
      // Surface the underlying reason when present — the server's
      // catch-all 500 returns a generic `error` ("Failed to process
      // receipt") but stashes the real cause in `details`. Without
      // this, mobile users see only the generic message and can't
      // diagnose what went wrong.
      const parts = [errorBody?.error, errorBody?.details].filter(
        (s): s is string => typeof s === 'string' && s.length > 0,
      )
      if (parts.length > 0) {
        message = parts.join(' — ')
      }
    } catch {
      // body wasn't JSON — fall back to the status message
    }
    logger.warn('[Receipt OCR client] Request failed', {
      status: response.status,
      message,
    })
    throw new Error(message)
  }

  const json = (await response.json()) as { success?: boolean; data?: ReceiptOCRResponse }
  if (!json.success || !json.data) {
    throw new Error('Receipt OCR returned no data.')
  }
  return json.data
}
