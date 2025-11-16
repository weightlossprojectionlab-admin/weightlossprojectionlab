/**
 * AAMVA Driver's License PDF417 Barcode Parser
 *
 * Parses data from PDF417 barcodes on US driver's licenses
 * Based on AAMVA DL/ID Card Design Standard
 *
 * Reference: https://www.aamva.org/topics/identity-credential-security
 */

import { logger } from '@/lib/logger'

export interface AAMVAData {
  // Mandatory fields
  firstName?: string
  middleName?: string
  lastName?: string
  dateOfBirth?: string // YYYYMMDD format
  gender?: 'male' | 'female' | 'other'

  // Address fields
  streetAddress?: string
  city?: string
  state?: string
  zipCode?: string

  // Optional fields
  licenseNumber?: string
  expirationDate?: string
  issueDate?: string
  height?: string
  eyeColor?: string

  // Raw data for debugging
  rawData?: string
}

/**
 * AAMVA Data Element IDs
 * Reference: AAMVA DL/ID Card Design Standard
 */
const AAMVA_ELEMENTS = {
  // Name fields
  DCS: 'lastName',         // Customer Family Name
  DAC: 'firstName',        // Customer First Name
  DAD: 'middleName',       // Customer Middle Name(s)

  // Personal info
  DBB: 'dateOfBirth',      // Date of Birth (MMDDCCYY format)
  DBC: 'gender',           // Physical Description – Sex (1=M, 2=F, 9=Not Specified)
  DAY: 'eyeColor',         // Physical Description – Eye Color
  DAU: 'height',           // Physical Description – Height

  // Address
  DAG: 'streetAddress',    // Customer Street Address
  DAI: 'city',             // Customer City
  DAJ: 'state',            // Customer Jurisdiction Code (State)
  DAK: 'zipCode',          // Customer Postal Code

  // License info
  DAQ: 'licenseNumber',    // Customer ID Number (License Number)
  DBA: 'expirationDate',   // Document Expiration Date (MMDDCCYY)
  DBD: 'issueDate',        // Document Issue Date (MMDDCCYY)
} as const

/**
 * Parse raw PDF417 barcode data from driver's license
 */
export function parseAAMVA(rawData: string): AAMVAData | null {
  try {
    logger.info('[AAMVA Parser] Parsing driver license data', {
      dataLength: rawData.length,
      preview: rawData.substring(0, 50)
    })

    // Check if this looks like AAMVA data (starts with @ANSI or similar)
    if (!rawData.includes('ANSI') && !rawData.includes('@')) {
      logger.warn('[AAMVA Parser] Data does not appear to be AAMVA format')
      return null
    }

    const result: AAMVAData = {
      rawData
    }

    // Extract each AAMVA element
    for (const [code, fieldName] of Object.entries(AAMVA_ELEMENTS)) {
      const value = extractElement(rawData, code)
      if (value) {
        // @ts-ignore - Dynamic field assignment
        result[fieldName] = value
      }
    }

    // Post-process extracted data
    processExtractedData(result)

    logger.info('[AAMVA Parser] Successfully parsed license data', {
      firstName: result.firstName,
      lastName: result.lastName,
      hasAddress: !!result.streetAddress
    })

    return result

  } catch (error) {
    logger.error('[AAMVA Parser] Failed to parse driver license data', error as Error)
    return null
  }
}

/**
 * Extract a specific AAMVA element from raw barcode data
 */
function extractElement(data: string, elementId: string): string | null {
  try {
    // AAMVA format: Each element starts with 3-letter code (e.g., "DAC")
    // followed by value, ending with newline or next element

    // Look for the element ID
    const elementIndex = data.indexOf(elementId)
    if (elementIndex === -1) {
      return null
    }

    // Start after the 3-letter code
    const valueStart = elementIndex + 3

    // Find where this element ends (next element code or newline)
    let valueEnd = data.length

    // Look for next 3-letter element code or newline
    const remainingData = data.substring(valueStart)
    const nextElementMatch = remainingData.match(/\n[A-Z]{3}/)
    if (nextElementMatch && nextElementMatch.index !== undefined) {
      valueEnd = valueStart + nextElementMatch.index
    }

    const value = data.substring(valueStart, valueEnd).trim()
    return value || null

  } catch (error) {
    logger.warn('[AAMVA Parser] Failed to extract element', { elementId, error })
    return null
  }
}

/**
 * Post-process extracted data to convert to our format
 */
function processExtractedData(data: AAMVAData): void {
  // Convert date of birth from MMDDCCYY to YYYY-MM-DD
  if (data.dateOfBirth) {
    data.dateOfBirth = convertAAMVADate(data.dateOfBirth)
  }

  // Convert expiration date
  if (data.expirationDate) {
    data.expirationDate = convertAAMVADate(data.expirationDate)
  }

  // Convert issue date
  if (data.issueDate) {
    data.issueDate = convertAAMVADate(data.issueDate)
  }

  // Convert gender code (1=M, 2=F, 9=Not Specified)
  if (data.gender) {
    const genderCode = data.gender.toString()
    if (genderCode === '1' || genderCode.toUpperCase() === 'M') {
      data.gender = 'male'
    } else if (genderCode === '2' || genderCode.toUpperCase() === 'F') {
      data.gender = 'female'
    } else {
      data.gender = 'other'
    }
  }

  // Clean up height (convert from inches to feet/inches if needed)
  if (data.height) {
    data.height = formatHeight(data.height)
  }
}

/**
 * Convert AAMVA date format (MMDDCCYY) to ISO format (YYYY-MM-DD)
 */
function convertAAMVADate(aamvaDate: string): string {
  try {
    // AAMVA uses MMDDCCYY format (e.g., 01011990 for Jan 1, 1990)
    if (aamvaDate.length === 8) {
      const month = aamvaDate.substring(0, 2)
      const day = aamvaDate.substring(2, 4)
      const year = aamvaDate.substring(4, 8)
      return `${year}-${month}-${day}`
    }

    // Some licenses use YYYYMMDD
    if (aamvaDate.length === 8 && aamvaDate.substring(0, 2) in ['19', '20']) {
      const year = aamvaDate.substring(0, 4)
      const month = aamvaDate.substring(4, 6)
      const day = aamvaDate.substring(6, 8)
      return `${year}-${month}-${day}`
    }

    return aamvaDate
  } catch (error) {
    logger.warn('[AAMVA Parser] Failed to convert date', { aamvaDate, error })
    return aamvaDate
  }
}

/**
 * Format height from various formats to readable string
 */
function formatHeight(height: string): string {
  try {
    // Some licenses use format like "509" for 5'09"
    if (height.length === 3 && !height.includes("'")) {
      const feet = height[0]
      const inches = height.substring(1)
      return `${feet}'${inches}"`
    }

    // Some use total inches like "69"
    if (height.length === 2 && !height.includes("'")) {
      const totalInches = parseInt(height, 10)
      const feet = Math.floor(totalInches / 12)
      const inches = totalInches % 12
      return `${feet}'${inches.toString().padStart(2, '0')}"`
    }

    return height
  } catch (error) {
    return height
  }
}

/**
 * Convert AAMVA data to family member form data
 */
export function aamvaToFamilyMember(aamvaData: AAMVAData) {
  return {
    name: [aamvaData.firstName, aamvaData.middleName, aamvaData.lastName]
      .filter(Boolean)
      .join(' '),
    dateOfBirth: aamvaData.dateOfBirth || '',
    gender: aamvaData.gender || '',
    // Note: PatientProfile doesn't have address fields yet
    // These can be stored in notes or added later
    streetAddress: aamvaData.streetAddress,
    city: aamvaData.city,
    state: aamvaData.state,
    zipCode: aamvaData.zipCode
  }
}
