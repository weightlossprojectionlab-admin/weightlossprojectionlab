/**
 * OCR Medication Text Extraction Library
 *
 * Uses Tesseract.js to extract text from prescription labels and bottles
 * when NDC barcode scanning is not available or fails.
 *
 * Tesseract.js Documentation: https://tesseract.projectnaptha.com/
 */

import Tesseract from 'tesseract.js'
import { logger } from '@/lib/logger'
import { ScannedMedication } from './medication-lookup'

export interface ExtractedMedicationText {
  medicationName: string
  strength?: string
  dosageForm?: string
  frequency?: string
  rxNumber?: string
  prescribingDoctor?: string
  patientName?: string
  rawText: string
}

/**
 * Extract text from image using Tesseract OCR
 *
 * @param imageFile - Image file or blob containing medication label
 * @returns Raw extracted text
 */
export async function extractTextFromImage(imageFile: File | Blob): Promise<string> {
  try {
    logger.debug('[OCR] Starting text extraction')

    const result = await Tesseract.recognize(imageFile, 'eng', {
      logger: (m) => {
        // Log OCR progress
        if (m.status === 'recognizing text') {
          logger.debug('[OCR] Progress', { progress: Math.round(m.progress * 100) })
        }
      }
    })

    const text = result.data.text

    logger.info('[OCR] Text extraction complete', {
      textLength: text.length,
      confidence: result.data.confidence
    })

    return text

  } catch (error) {
    logger.error('[OCR] Text extraction failed', error as Error)
    return ''
  }
}

/**
 * Parse medication information from extracted text
 *
 * Uses pattern matching to identify common prescription label fields
 */
export function parseMedicationFromText(text: string): ExtractedMedicationText | null {
  try {
    logger.debug('[OCR Parser] Parsing medication text', { textLength: text.length })

    // Convert to uppercase for easier pattern matching
    const upperText = text.toUpperCase()
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

    let medicationName = ''
    let strength = ''
    let dosageForm = ''
    let frequency = ''
    let rxNumber = ''
    let prescribingDoctor = ''
    let patientName = ''

    // Pattern 1: Medication name (usually in CAPS, first significant line)
    // Look for lines that are likely medication names
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i]
      const upperLine = line.toUpperCase()

      // Skip common header text
      if (upperLine.includes('CVS') || upperLine.includes('WALGREENS') ||
          upperLine.includes('PHARMACY') || upperLine.includes('PRESCRIPTION') ||
          upperLine.includes('REFILL') || upperLine.includes('DATE')) {
        continue
      }

      // Look for medication name (usually CAPS, 5-30 chars, may include dosage)
      if (line === upperLine && line.length >= 5 && line.length <= 50) {
        // Extract medication name and potential strength
        const strengthMatch = line.match(/(\d+\.?\d*)\s*(MG|MCG|ML|G|%|UNITS?)/i)
        if (strengthMatch) {
          medicationName = line.substring(0, strengthMatch.index).trim()
          strength = `${strengthMatch[1]} ${strengthMatch[2].toLowerCase()}`
        } else {
          medicationName = line
        }

        // Check for dosage form in the same line
        const formMatch = line.match(/(TABLET|CAPSULE|GEL|CREAM|OINTMENT|SOLUTION|INJECTION|SYRUP|SUSPENSION|PATCH)/i)
        if (formMatch) {
          dosageForm = formMatch[1].toLowerCase()
          medicationName = medicationName.replace(new RegExp(formMatch[1], 'i'), '').trim()
        }

        if (medicationName.length > 3) {
          break
        }
      }
    }

    // Pattern 2: Strength (if not found above)
    if (!strength) {
      const strengthMatch = text.match(/(\d+\.?\d*)\s*(MG|MCG|ML|G|%|UNITS?)/i)
      if (strengthMatch) {
        strength = `${strengthMatch[1]} ${strengthMatch[2].toLowerCase()}`
      }
    }

    // Pattern 3: Dosage form
    if (!dosageForm) {
      const formMatch = text.match(/(TABLET|CAPSULE|GEL|CREAM|OINTMENT|SOLUTION|INJECTION|SYRUP|SUSPENSION|PATCH)/i)
      if (formMatch) {
        dosageForm = formMatch[1].toLowerCase()
      }
    }

    // Pattern 4: Frequency/Instructions
    // Common patterns: "Take 1 tablet by mouth twice daily", "Apply once daily"
    const frequencyPatterns = [
      /take\s+(\d+)\s+(tablet|capsule|pill)s?\s+.*?(\d+\s+times?\s+(daily|a day|per day)|twice\s+daily|once\s+daily|three\s+times\s+daily|every\s+\d+\s+hours)/i,
      /apply\s+.*?(once|twice|three times)\s+(daily|a day)/i,
      /inject\s+.*?(once|twice)\s+(daily|weekly|monthly)/i,
      /(\d+)\s+times?\s+(daily|a day|per day|weekly|monthly)/i,
      /(once|twice|three times)\s+(daily|a day|weekly|monthly)/i
    ]

    for (const pattern of frequencyPatterns) {
      const match = text.match(pattern)
      if (match) {
        frequency = match[0].trim()
        break
      }
    }

    // Pattern 5: Rx Number
    const rxMatch = text.match(/(?:RX|Rx|rx)\s*(?:#|NO|NUMBER)?:?\s*(\d{6,10})/i)
    if (rxMatch) {
      rxNumber = rxMatch[1]
    }

    // Pattern 6: Prescribing Doctor
    const doctorPatterns = [
      /(?:DR|Dr|DOCTOR)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
      /Prescriber:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /Physician:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
    ]

    for (const pattern of doctorPatterns) {
      const match = text.match(pattern)
      if (match) {
        prescribingDoctor = match[1].trim()
        break
      }
    }

    // Pattern 7: Patient Name (first proper-cased name found, not pharmacy/location)
    for (const line of lines) {
      // Look for lines with proper case (not ALL CAPS, not all lowercase)
      const hasUpperLower = /[A-Z]/.test(line) && /[a-z]/.test(line)
      const isName = /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(line)

      if (hasUpperLower && isName && line.length < 30) {
        const words = line.split(/\s+/)
        // Check if it's likely a person's name (2-3 words, each starting with capital)
        if (words.length >= 2 && words.length <= 3 &&
            words.every(w => /^[A-Z][a-z]+/.test(w))) {
          // Exclude pharmacy names
          if (!line.toLowerCase().includes('pharmacy') &&
              !line.toLowerCase().includes('store')) {
            patientName = line
            break
          }
        }
      }
    }

    // Validation: Must have at least medication name
    if (!medicationName || medicationName.length < 3) {
      logger.warn('[OCR Parser] Could not identify medication name')
      return null
    }

    const result: ExtractedMedicationText = {
      medicationName: medicationName.trim(),
      strength: strength || undefined,
      dosageForm: dosageForm || undefined,
      frequency: frequency || undefined,
      rxNumber: rxNumber || undefined,
      prescribingDoctor: prescribingDoctor || undefined,
      patientName: patientName || undefined,
      rawText: text
    }

    logger.info('[OCR Parser] Medication parsed', {
      medicationName: result.medicationName,
      strength: result.strength,
      dosageForm: result.dosageForm,
      hasFrequency: !!result.frequency
    })

    return result

  } catch (error) {
    logger.error('[OCR Parser] Parsing failed', error as Error)
    return null
  }
}

/**
 * Extract medication from image (combines OCR + parsing)
 *
 * @param imageFile - Image file containing medication label
 * @returns Parsed medication information
 */
export async function extractMedicationFromImage(imageFile: File | Blob): Promise<ExtractedMedicationText | null> {
  try {
    logger.info('[OCR] Extracting medication from image')

    // Step 1: Extract raw text
    const text = await extractTextFromImage(imageFile)

    if (!text || text.length < 10) {
      logger.warn('[OCR] Insufficient text extracted')
      return null
    }

    // Step 2: Parse medication info
    const medication = parseMedicationFromText(text)

    return medication

  } catch (error) {
    logger.error('[OCR] Medication extraction failed', error as Error)
    return null
  }
}

/**
 * Convert extracted medication text to ScannedMedication format
 */
export function convertToScannedMedication(
  extracted: ExtractedMedicationText,
  prescribedFor?: string
): ScannedMedication {
  return {
    name: extracted.medicationName,
    strength: extracted.strength || 'Unknown',
    dosageForm: extracted.dosageForm || 'Unknown',
    frequency: extracted.frequency,
    prescribedFor: prescribedFor,
    rxNumber: extracted.rxNumber,
    ndc: '', // No NDC from OCR
    scannedAt: new Date().toISOString()
  }
}

/**
 * Confidence score for extracted medication (0-100)
 * Based on how many fields were successfully extracted
 */
export function calculateExtractionConfidence(extracted: ExtractedMedicationText): number {
  let score = 0

  // Medication name is required (40 points)
  if (extracted.medicationName && extracted.medicationName.length >= 3) {
    score += 40
  }

  // Strength (20 points)
  if (extracted.strength) score += 20

  // Dosage form (15 points)
  if (extracted.dosageForm) score += 15

  // Frequency (15 points)
  if (extracted.frequency) score += 15

  // Rx number (5 points)
  if (extracted.rxNumber) score += 5

  // Prescribing doctor (5 points)
  if (extracted.prescribingDoctor) score += 5

  return score
}
