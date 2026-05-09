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

export async function extractReceiptFromImages(
  images: string[],
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
    body: JSON.stringify({ images }),
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
