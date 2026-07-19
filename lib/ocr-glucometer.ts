/**
 * Client wrapper for the /api/ocr/glucometer endpoint.
 *
 * Mirrors lib/ocr-receipt.ts: grab the current user's Firebase ID token, POST
 * the captured base64 images, return the parsed structured response or throw a
 * user-presentable Error. UI-free so any capture surface can import it.
 */

import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import type { GlucometerOCRResponse } from '@/lib/validations/glucometer-ocr'

export type { GlucometerOCRResponse, GlucometerReading } from '@/lib/validations/glucometer-ocr'

export async function extractGlucometerReadings(images: string[]): Promise<GlucometerOCRResponse> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('You need to be signed in to scan a meter.')
  }
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('No image to scan.')
  }

  const token = await user.getIdToken()

  const response = await fetch('/api/ocr/glucometer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ images }),
  })

  if (!response.ok) {
    let message = `Meter scan failed (${response.status})`
    try {
      const errorBody = (await response.json()) as { error?: string; details?: string }
      const parts = [errorBody?.error, errorBody?.details].filter(
        (s): s is string => typeof s === 'string' && s.length > 0
      )
      if (parts.length > 0) message = parts.join(' — ')
    } catch {
      // body wasn't JSON — fall back to the status message
    }
    logger.warn('[Glucometer OCR client] Request failed', { status: response.status, message })
    throw new Error(message)
  }

  const json = (await response.json()) as { success?: boolean; data?: GlucometerOCRResponse }
  if (!json.success || !json.data) {
    throw new Error('Meter scan returned no data.')
  }
  return json.data
}
