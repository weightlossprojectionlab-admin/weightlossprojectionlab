/**
 * Driver's License OCR with Gemini Vision
 *
 * Uses Gemini Vision API for superior accuracy in extracting structured data
 * from US driver's licenses
 */

import { logger } from './logger'

export interface LicenseData {
  firstName: string
  lastName: string
  middleName?: string
  dateOfBirth: string
  gender: string
  streetAddress?: string
  city?: string
  state?: string
  zipCode?: string
  licenseNumber?: string
  expirationDate?: string
}

/**
 * Convert File/Blob to base64 data URL
 */
async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Scan driver's license front using Gemini Vision
 */
export async function scanDriversLicenseFront(imageFile: File): Promise<LicenseData> {
  try {
    logger.info('[DL Gemini] Starting driver license scan with Gemini Vision')

    // Convert image to base64
    const base64Image = await fileToBase64(imageFile)

    // Call server API endpoint for Gemini Vision OCR
    const response = await fetch('/api/ocr/drivers-license', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageData: base64Image
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `License scan failed: ${response.status}`)
    }

    const licenseData: LicenseData = await response.json()

    logger.info('[DL Gemini] License scan completed', {
      hasName: !!licenseData.firstName,
      hasDOB: !!licenseData.dateOfBirth,
      hasAddress: !!licenseData.streetAddress
    })

    return licenseData

  } catch (error) {
    logger.error('[DL Gemini] License scan failed', error as Error)
    throw error
  }
}

/**
 * Validate license data completeness
 */
export function validateLicenseData(data: LicenseData): { valid: boolean; missing: string[] } {
  const missing: string[] = []

  if (!data.firstName) missing.push('First Name')
  if (!data.lastName) missing.push('Last Name')
  if (!data.dateOfBirth) missing.push('Date of Birth')
  if (!data.gender) missing.push('Gender')

  return {
    valid: missing.length === 0,
    missing
  }
}
