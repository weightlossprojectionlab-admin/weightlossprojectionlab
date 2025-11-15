/**
 * OCR Provider Information Extraction
 *
 * Extract provider details from medical documents, appointment cards,
 * business cards, and insurance directories
 */

import Tesseract from 'tesseract.js'
import { ProviderType } from '@/types/medical'

export interface ExtractedProviderInfo {
  name?: string
  specialty?: string
  type?: ProviderType
  phone?: string
  fax?: string
  email?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  npiNumber?: string
  officeHours?: string
  confidence: number
  rawText: string
}

// Common medical specialties for pattern matching
const SPECIALTIES = [
  'primary care', 'family medicine', 'internal medicine', 'pediatrics',
  'cardiology', 'dermatology', 'endocrinology', 'gastroenterology',
  'neurology', 'obstetrics', 'gynecology', 'ob/gyn', 'oncology',
  'ophthalmology', 'orthopedics', 'psychiatry', 'psychology',
  'radiology', 'surgery', 'urology', 'dentistry', 'orthodontics',
  'veterinary', 'veterinarian', 'physical therapy', 'occupational therapy',
  'nutritionist', 'dietitian', 'chiropractor', 'podiatry'
]

// Provider type keywords
const PROVIDER_TYPE_KEYWORDS: Record<string, ProviderType> = {
  'dentist': 'dentist',
  'dental': 'dentist',
  'orthodontist': 'dentist',
  'veterinarian': 'veterinarian',
  'veterinary': 'veterinarian',
  'vet clinic': 'veterinarian',
  'animal hospital': 'veterinarian',
  'pharmacy': 'pharmacy',
  'pharmacist': 'pharmacy',
  'lab': 'lab',
  'laboratory': 'lab',
  'imaging': 'imaging_center',
  'radiology': 'imaging_center',
  'x-ray': 'imaging_center',
  'mri': 'imaging_center',
  'ct scan': 'imaging_center',
  'urgent care': 'urgent_care',
  'walk-in clinic': 'urgent_care',
  'emergency': 'hospital',
  'hospital': 'hospital',
  'specialist': 'specialist',
  'physician': 'physician',
  'doctor': 'physician',
  'md': 'physician',
  'do': 'physician'
}

/**
 * Extract provider information from an image using OCR
 */
export async function extractProviderFromImage(
  imageFile: File | string
): Promise<ExtractedProviderInfo> {
  try {
    // Perform OCR
    const result = await Tesseract.recognize(imageFile, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        }
      }
    })

    const rawText = result.data.text
    console.log('[OCR Provider] Raw text:', rawText)

    // Extract structured information
    const extracted = parseProviderText(rawText)

    return {
      ...extracted,
      rawText,
      confidence: result.data.confidence / 100
    }
  } catch (error) {
    console.error('[OCR Provider] Extraction failed:', error)
    throw new Error('Failed to extract provider information from image')
  }
}

/**
 * Parse OCR text to extract provider fields
 */
function parseProviderText(text: string): Partial<ExtractedProviderInfo> {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  const lowerText = text.toLowerCase()

  const extracted: Partial<ExtractedProviderInfo> = {}

  // Extract name (usually first line or after "Dr." or title)
  const nameMatch = extractName(lines, text)
  if (nameMatch) extracted.name = nameMatch

  // Extract specialty
  const specialtyMatch = extractSpecialty(lowerText)
  if (specialtyMatch) extracted.specialty = specialtyMatch

  // Determine provider type
  const typeMatch = extractProviderType(lowerText)
  if (typeMatch) extracted.type = typeMatch

  // Extract phone number
  const phoneMatch = extractPhoneNumber(text)
  if (phoneMatch) extracted.phone = phoneMatch

  // Extract fax number
  const faxMatch = extractFaxNumber(text)
  if (faxMatch) extracted.fax = faxMatch

  // Extract email
  const emailMatch = extractEmail(text)
  if (emailMatch) extracted.email = emailMatch

  // Extract address
  const addressMatch = extractAddress(lines)
  if (addressMatch) {
    extracted.address = addressMatch.street
    extracted.city = addressMatch.city
    extracted.state = addressMatch.state
    extracted.zipCode = addressMatch.zip
  }

  // Extract NPI number
  const npiMatch = extractNPI(text)
  if (npiMatch) extracted.npiNumber = npiMatch

  // Extract office hours
  const hoursMatch = extractOfficeHours(text)
  if (hoursMatch) extracted.officeHours = hoursMatch

  return extracted
}

/**
 * Extract provider name from text
 */
function extractName(lines: string[], fullText: string): string | undefined {
  // Common form field labels to ignore
  const ignorePatterns = [
    /^NAME\s*$/i,
    /^ADDRESS\s*$/i,
    /^PHONE\s*$/i,
    /REFILL.*TIMES?/i,  // Match "REFILL TIMES" with any characters between
    /^DATE\s*$/i,
    /^PATIENT\s*$/i,
    /^DEA\s*#?\s*$/i,
    /^LABEL\s*$/i,
    /^SUBSTITUTION/i,
    /^DISPENSE/i,
    /^R\s*$/,  // Single "R" for prescription symbol
    /^\d+$/    // Just numbers
  ]

  // Filter out lines that are likely form labels or very short
  const relevantLines = lines.filter(line => {
    if (line.length < 3) return false
    return !ignorePatterns.some(pattern => pattern.test(line))
  })

  console.log('[OCR Name Extract] All lines:', lines)
  console.log('[OCR Name Extract] Relevant lines after filtering:', relevantLines)

  // Look for names with professional suffixes (O.D., M.D., etc.) - these are high priority
  const suffixPattern = /([A-Z][a-z]+\s+[A-Z][a-z]+),?\s+(O\.D\.|M\.D\.|D\.O\.|D\.D\.S\.|D\.M\.D\.|Ph\.D\.|D\.V\.M\.|N\.P\.|P\.A\.)/i
  for (const line of relevantLines.slice(0, 10)) { // Check first 10 relevant lines
    const match = line.match(suffixPattern)
    if (match) {
      return `${match[1]}, ${match[2]}`
    }
  }

  // Look for "Dr." or medical titles in text
  const titlePattern = /(?:Dr\.?|Doctor)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/i
  const titleMatch = fullText.match(titlePattern)
  if (titleMatch) {
    return titleMatch[0].trim()
  }

  // Look for organization name followed by provider name (common on letterheads)
  // e.g., "South County Family Vision" followed by "Elizabeth Sheldon, O.D."
  for (let i = 0; i < relevantLines.length - 1; i++) {
    const currentLine = relevantLines[i]
    const nextLine = relevantLines[i + 1]

    // If current line looks like an organization (multiple capitalized words)
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,}$/.test(currentLine)) {
      // And next line has a professional suffix
      const suffixMatch = nextLine.match(/([A-Z][a-z]+\s+[A-Z][a-z]+),?\s+(O\.D\.|M\.D\.|D\.O\.|D\.D\.S\.|Ph\.D\.|D\.V\.M\.)/i)
      if (suffixMatch) {
        return `${suffixMatch[1]}, ${suffixMatch[2]}`
      }

      // Or next line looks like a name with title
      if (/^(?:Dr\.?\s+)?[A-Z][a-z]+\s+[A-Z][a-z]+$/i.test(nextLine)) {
        return nextLine.trim()
      }
    }
  }

  // Look for name after title on separate line
  for (let i = 0; i < relevantLines.length; i++) {
    if (/^(Dr\.?|Doctor|DDS|DMD|MD|DO|DVM)/i.test(relevantLines[i]) && relevantLines[i + 1]) {
      // Next line might be the name
      if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(relevantLines[i + 1])) {
        return `${relevantLines[i]} ${relevantLines[i + 1]}`.trim()
      }
    }
  }

  // First line in top portion that looks like a proper name (Title Case with 2-3 words)
  // Prioritize lines near the top (likely letterhead)
  for (const line of relevantLines.slice(0, 8)) {
    if (/^[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:\s+(?:MD|DO|DDS|DMD|PhD|NP|PA|DVM|Jr\.?|Sr\.?))?$/i.test(line)) {
      return line
    }
  }

  return undefined
}

/**
 * Extract specialty from text
 */
function extractSpecialty(lowerText: string): string | undefined {
  // Look for specialty keywords
  for (const specialty of SPECIALTIES) {
    if (lowerText.includes(specialty)) {
      return specialty
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
  }

  // Look for "Board Certified in X"
  const boardCertMatch = lowerText.match(/board certified in ([a-z\s]+)/i)
  if (boardCertMatch) {
    return boardCertMatch[1].trim()
  }

  return undefined
}

/**
 * Determine provider type from keywords
 */
function extractProviderType(lowerText: string): ProviderType | undefined {
  for (const [keyword, type] of Object.entries(PROVIDER_TYPE_KEYWORDS)) {
    if (lowerText.includes(keyword)) {
      return type
    }
  }
  return undefined
}

/**
 * Extract phone number
 */
function extractPhoneNumber(text: string): string | undefined {
  // Match various phone formats
  const phonePatterns = [
    /(?:phone|tel|office|call)[:\s]*\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/i,
    /\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/
  ]

  for (const pattern of phonePatterns) {
    const match = text.match(pattern)
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`
    }
  }

  return undefined
}

/**
 * Extract fax number
 */
function extractFaxNumber(text: string): string | undefined {
  const faxPattern = /fax[:\s]*\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/i
  const match = text.match(faxPattern)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return undefined
}

/**
 * Extract email address
 */
function extractEmail(text: string): string | undefined {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const match = text.match(emailPattern)
  return match ? match[0] : undefined
}

/**
 * Extract address components
 */
function extractAddress(lines: string[]): { street?: string; city?: string; state?: string; zip?: string } | undefined {
  let street: string | undefined
  let city: string | undefined
  let state: string | undefined
  let zip: string | undefined

  // Look for street address (number + street name)
  const streetPattern = /^\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\.?)?$/i
  for (const line of lines) {
    if (streetPattern.test(line)) {
      street = line
      break
    }
  }

  // Look for city, state zip (e.g., "Los Angeles, CA 90001")
  const cityStateZipPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)/
  for (const line of lines) {
    const match = line.match(cityStateZipPattern)
    if (match) {
      city = match[1]
      state = match[2]
      zip = match[3]
      break
    }
  }

  if (street || city) {
    return { street, city, state, zip }
  }

  return undefined
}

/**
 * Extract NPI number
 */
function extractNPI(text: string): string | undefined {
  const npiPattern = /NPI[:\s#]*(\d{10})/i
  const match = text.match(npiPattern)
  return match ? match[1] : undefined
}

/**
 * Extract office hours
 */
function extractOfficeHours(text: string): string | undefined {
  // Look for hour patterns like "Mon-Fri 9am-5pm"
  const hoursPattern = /(?:hours|open)[:\s]*([A-Za-z\s\-:0-9amp]{10,50})/i
  const match = text.match(hoursPattern)
  if (match) {
    return match[1].trim()
  }

  // Look for day-time patterns
  const dayTimePattern = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z\s\-]*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)?[:\s]*\d{1,2}[:\s]*\d{0,2}\s*[ap]m?\s*-\s*\d{1,2}[:\s]*\d{0,2}\s*[ap]m?/i
  const dayMatch = text.match(dayTimePattern)
  if (dayMatch) {
    return dayMatch[0].trim()
  }

  return undefined
}

/**
 * Map extracted specialty to provider type
 */
export function mapSpecialtyToProviderType(specialty?: string): ProviderType {
  if (!specialty) return 'physician'

  const lower = specialty.toLowerCase()

  if (lower.includes('dent')) return 'dentist'
  if (lower.includes('vet')) return 'veterinarian'
  if (lower.includes('pharm')) return 'pharmacy'
  if (lower.includes('lab')) return 'lab'
  if (lower.includes('imag') || lower.includes('radio')) return 'imaging_center'
  if (lower.includes('urgent')) return 'urgent_care'
  if (lower.includes('hospital') || lower.includes('emergency')) return 'hospital'
  if (lower.includes('therapy') || lower.includes('physical')) return 'therapy'
  if (lower.includes('primary') || lower.includes('family')) return 'physician'

  return 'specialist'
}
