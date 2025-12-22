/**
 * Medication Label Parser
 *
 * Parses OCR text from medication labels into structured medication data
 * Uses Gemini AI to intelligently extract medication information
 */

import { logger } from '@/lib/logger'
import { getAuth } from 'firebase/auth'

export interface ParsedMedicationData {
  name?: string
  brandName?: string
  strength?: string
  dosageForm?: string
  frequency?: string
  prescribedFor?: string
  patientName?: string
  prescribingDoctor?: string
  rxNumber?: string
  ndc?: string
  quantity?: string
  refills?: string
  fillDate?: string
  expirationDate?: string
  pharmacyName?: string
  pharmacyPhone?: string
  warnings?: string[]
}

/**
 * Parse medication label text using Gemini AI
 *
 * @param labelText - Raw OCR text from medication label
 * @returns Structured medication data
 */
/**
 * Get Firebase auth token for authenticated API requests
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const auth = getAuth()
    const user = auth.currentUser
    if (!user) {
      // Wait briefly for auth to initialize
      await new Promise(resolve => setTimeout(resolve, 200))
      const retryUser = auth.currentUser
      if (!retryUser) {
        logger.warn('[Medication Parser] No authenticated user')
        return null
      }
      return await (retryUser as any).getIdToken()
    }
    return await (user as any).getIdToken()
  } catch (error) {
    logger.error('[Medication Parser] Failed to get auth token', error as Error)
    return null
  }
}

export async function parseMedicationLabel(labelText: string): Promise<ParsedMedicationData> {
  try {
    logger.info('[Medication Parser] Parsing label text', {
      textLength: labelText.length,
      preview: labelText.substring(0, 100)
    })

    // Get auth token
    const authToken = await getAuthToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch('/api/medications/parse-label', {
      method: 'POST',
      headers,
      body: JSON.stringify({ labelText })
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('[Medication Parser] API failed', new Error(`Status ${response.status}: ${errorText}`))
      throw new Error(`Parse API failed: ${response.status}`)
    }

    const data = await response.json()

    logger.info('[Medication Parser] Successfully parsed medication data', {
      fields: Object.keys(data).length,
      data
    })

    return data

  } catch (error) {
    logger.error('[Medication Parser] Failed to parse label', error as Error, {
      textPreview: labelText.substring(0, 200)
    })
    throw error
  }
}
