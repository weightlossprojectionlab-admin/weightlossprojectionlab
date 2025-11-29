/**
 * OCR Medication Text Extraction Library
 *
 * Uses Tesseract.js to extract text from prescription labels and bottles
 * when NDC barcode scanning is not available or fails.
 *
 * Falls back to Gemini Vision API for low-confidence OCR results.
 *
 * Tesseract.js Documentation: https://tesseract.projectnaptha.com/
 */

import { createWorker, Worker, LoggerMessage, PSM } from 'tesseract.js'
import { logger } from '@/lib/logger'
import { ScannedMedication } from './medication-lookup'
import { auth } from './firebase'

export interface SuggestedCondition {
  condition: string
  confidence: number
  reasoning: string
  isPrimaryTreatment: boolean
}

export interface ExtractedMedicationText {
  medicationName: string
  strength?: string
  dosageForm?: string
  frequency?: string // COMPLETE dosage instructions
  rxNumber?: string
  prescribingDoctor?: string
  patientName?: string
  patientAddress?: string
  ndc?: string // NDC number extracted by Gemini Vision
  pharmacy?: string // Pharmacy name
  pharmacyPhone?: string
  quantity?: string // Quantity dispensed
  refills?: string // Refills remaining
  fillDate?: string // Fill date
  expirationDate?: string // Expiration date
  warnings?: string[] // Special warnings/instructions
  rawText: string
  suggestedConditions?: SuggestedCondition[]
}

/**
 * Extract text from image using Tesseract OCR with Worker API
 *
 * @param imageFile - Image file or blob containing medication label
 * @param onProgress - Optional progress callback (0-100)
 * @returns Object containing raw text and confidence score
 */
export async function extractTextFromImage(
  imageFile: File | Blob,
  onProgress?: (progress: number) => void
): Promise<{ text: string; confidence: number }> {
  let worker: Worker | null = null

  try {
    logger.debug('[OCR] Starting text extraction with Worker API')

    // Create Tesseract worker
    worker = await createWorker('eng', 1, {
      logger: (m: LoggerMessage) => {
        // Report progress
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          const progress = Math.round(m.progress * 100)
          logger.debug('[OCR] Progress', { progress })
          if (onProgress) {
            onProgress(progress)
          }
        }
      }
    })

    // Set better parameters for prescription label reading
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO, // Fully automatic page segmentation (better for labels)
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:-()/#% ',
      preserve_interword_spaces: '1',
    })

    const { data } = await worker.recognize(imageFile)
    const text = data.text
    const confidence = data.confidence

    logger.info('[OCR] Text extraction complete', {
      textLength: text.length,
      confidence: Math.round(confidence)
    })

    return { text, confidence }

  } catch (error) {
    logger.error('[OCR] Text extraction failed', error as Error)
    return { text: '', confidence: 0 }
  } finally {
    // Always clean up worker
    if (worker) {
      await worker.terminate()
    }
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
    let patientAddress = ''
    let quantity = ''
    let refills = ''
    let fillDate = ''
    let expirationDate = ''
    let pharmacyPhone = ''
    const warnings: string[] = []

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
    // Capture complete dosage instructions including quantity and frequency
    const frequencyPatterns = [
      // Full instructions: "Take 1 tablet by mouth every day"
      /take\s+\d+(?:-\d+)?\s+(?:tablet|capsule|pill)s?(?:\s+by\s+mouth)?(?:\s+with\s+(?:food|water|meals?))?\s+(?:once|twice|three times|every)\s+(?:day|daily|morning|evening|night|bedtime|\d+\s+hours)/i,
      // Shorter version: "Take 1 tablet daily"
      /take\s+\d+(?:-\d+)?\s+(?:tablet|capsule|pill)s?\s+(?:once|twice|daily|every\s+day|per\s+day)/i,
      // Apply: "Apply once daily"
      /apply\s+(?:once|twice|three times)\s+(?:daily|a day|per day)/i,
      // Inject: "Inject once weekly"
      /inject\s+(?:\d+\s+)?(?:unit|ml|mg)s?\s+(?:once|twice)\s+(?:daily|weekly|monthly)/i,
      // Generic times: "3 times daily"
      /\d+\s+times?\s+(?:daily|a day|per day|weekly|monthly)/i,
      // Simple frequency: "once daily", "twice daily", "every day"
      /(?:once|twice|three times)\s+(?:daily|a day|per day|every\s+day)/i,
      // Every X hours: "every 4 hours", "every 6 hours"
      /every\s+\d+\s+hours?/i
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
    // Search for doctor in each line individually to catch any doctor name format
    for (const line of lines) {
      const doctorPatterns = [
        // Dr followed by any name (Dr Smith, Dr. John Smith, DR JONES, Dr V.Atieh, etc)
        /(?:dr|DR|Dr)\.?\s+([A-Z][A-Za-z\.]+(?:\s+[A-Z][A-Za-z\.]+)*)/i,
        // Prescriber: followed by name
        /prescriber:?\s+([A-Z][A-Za-z\.]+(?:\s+[A-Z][A-Za-z\.]+)*)/i,
        // Physician: followed by name
        /physician:?\s+([A-Z][A-Za-z\.]+(?:\s+[A-Z][A-Za-z\.]+)*)/i,
        // Doctor: followed by name
        /doctor:?\s+([A-Z][A-Za-z\.]+(?:\s+[A-Z][A-Za-z\.]+)*)/i,
        // Prescribed by: followed by name
        /prescribed\s+by:?\s+([A-Z][A-Za-z\.]+(?:\s+[A-Z][A-Za-z\.]+)*)/i,
        // MD or M.D. followed by name or name followed by MD
        /(?:MD|M\.D\.):?\s+([A-Z][A-Za-z\.]+(?:\s+[A-Z][A-Za-z\.]+)*)/i,
        // Name followed by , MD or , M.D.
        /([A-Z][A-Za-z\.]+(?:\s+[A-Z][A-Za-z\.]+)*),?\s+(?:MD|M\.D\.)/i
      ]

      for (const pattern of doctorPatterns) {
        const match = line.match(pattern)
        if (match && match[1]) {
          const name = match[1].trim()
          // Filter out common non-names and short matches
          const excludeWords = ['Pharmacy', 'Patient', 'Name', 'Date', 'For', 'By', 'The', 'A', 'An']
          if (name.length > 2 && !excludeWords.some(word => name === word)) {
            prescribingDoctor = name
            logger.info('[OCR Parser] Doctor found', { doctor: prescribingDoctor, line: line.substring(0, 60) })
            break
          }
        }
      }

      if (prescribingDoctor) break
    }

    // If still no doctor found, try a more aggressive search
    if (!prescribingDoctor) {
      logger.warn('[OCR Parser] First pass: No prescriber found, trying aggressive search', {
        lineCount: lines.length,
        firstFewLines: lines.slice(0, 10)
      })

      // Look for any capitalized name pattern that might be a doctor
      for (const line of lines) {
        // Skip lines that are clearly not doctor names
        if (line.match(/(?:PHARMACY|STORE|STREET|AVENUE|BLVD|ROAD|TAKE|TABLET|CAPSULE|MG|ML|QUANTITY|QTY|REFILL|EXPIRE)/i)) {
          continue
        }

        // Look for capitalized names (First Last or Initial Last)
        const nameMatch = line.match(/\b([A-Z]\.?\s*[A-Z][a-z]+)\b/)
        if (nameMatch) {
          const possibleName = nameMatch[1].trim()
          // Additional filtering
          if (possibleName.length > 3 && !['For', 'The', 'And', 'Date'].includes(possibleName)) {
            prescribingDoctor = possibleName
            logger.info('[OCR Parser] Doctor found (aggressive search)', {
              doctor: prescribingDoctor,
              line: line.substring(0, 60)
            })
            break
          }
        }
      }
    }

    if (!prescribingDoctor) {
      const error = new Error(`No prescriber found after all attempts. totalLines: ${lines.length}, fullText preview: ${text.substring(0, 200)}`)
      logger.error('[OCR Parser] No prescriber found after all attempts', error)

      // Log each line individually for debugging
      console.log('====== FULL OCR TEXT FOR DEBUGGING ======')
      lines.forEach((line, idx) => {
        console.log(`Line ${idx + 1}: "${line}"`)
      })
      console.log('=========================================')
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

    // Pattern 8: Patient Address (usually follows patient name)
    const addressMatch = text.match(/\d+\s+[A-Za-z\s]+(Rd|Rd\.|Road|St|St\.|Street|Ave|Ave\.|Avenue|Dr|Dr\.|Drive|Ln|Lane|Blvd|Blvd\.|Boulevard)(?:\s+(?:Apt|Apt\.|#)\s*\d+)?/i)
    if (addressMatch) {
      patientAddress = addressMatch[0].trim()
    }

    // Pattern 9: Quantity (e.g., "QTY: 30", "Quantity: 60 tablets")
    const quantityPatterns = [
      /(?:QTY|Quantity):?\s*(\d+\s*(?:tablet|capsule|pill|patch|ml|gram|unit)?s?)/i,
      /Dispense:?\s*(\d+\s*(?:tablet|capsule|pill|patch|ml|gram|unit)?s?)/i
    ]
    for (const pattern of quantityPatterns) {
      const match = text.match(pattern)
      if (match) {
        quantity = match[1].trim()
        break
      }
    }

    // Pattern 10: Refills (e.g., "Refills: 3", "3 Refills", "No Refills")
    const refillsMatch = text.match(/(?:Refills?|Refills?\s+Remaining):?\s*(No|None|\d+)/i)
    if (refillsMatch) {
      const value = refillsMatch[1].toLowerCase()
      refills = value === 'no' || value === 'none' ? 'No refills' : `${refillsMatch[1]} refills`
    }

    // Pattern 11: Fill Date (e.g., "Filled: 01/15/2024", "Fill Date: 1/15/24")
    const fillDateMatch = text.match(/(?:Fill(?:ed)?(?:\s+Date)?):?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i)
    if (fillDateMatch) {
      fillDate = fillDateMatch[1]
    }

    // Pattern 12: Expiration Date (e.g., "Expires: 01/15/2025", "Exp: 1/15/25", "Discard After: 1/15/25")
    const expirationPatterns = [
      /(?:Exp(?:ires?)?(?:\s+Date)?|Discard\s+(?:After|By)):?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /Use\s+Before:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i
    ]
    for (const pattern of expirationPatterns) {
      const match = text.match(pattern)
      if (match) {
        expirationDate = match[1]
        break
      }
    }

    // Pattern 13: Pharmacy Phone (e.g., "Phone: (555) 123-4567", "Tel: 555-123-4567")
    const phoneMatch = text.match(/(?:Phone|Tel|Call):?\s*(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/i)
    if (phoneMatch) {
      pharmacyPhone = phoneMatch[0].replace(/(?:Phone|Tel|Call):?\s*/i, '').trim()
    }

    // Pattern 14: Warnings (common warning phrases)
    const warningPatterns = [
      /(?:WARNING|CAUTION|IMPORTANT):?\s+([^.]+)/gi,
      /(Do not (?:take|use) (?:with|if)[^.]+)/gi,
      /(May cause [^.]+)/gi,
      /(Avoid [^.]+)/gi,
      /(Take (?:with|without) food)/gi,
      /(Keep (?:out of reach|refrigerated|at room temperature)[^.]*)/gi
    ]
    for (const pattern of warningPatterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        const warning = match[1] || match[0]
        if (warning && !warnings.includes(warning.trim())) {
          warnings.push(warning.trim())
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
      patientAddress: patientAddress || undefined,
      quantity: quantity || undefined,
      refills: refills || undefined,
      fillDate: fillDate || undefined,
      expirationDate: expirationDate || undefined,
      pharmacyPhone: pharmacyPhone || undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
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
 * Extract medication using Gemini Vision API via server endpoint
 * (fallback for low-confidence OCR)
 *
 * @param imageFile - Image file containing medication label
 * @returns Parsed medication information from Gemini Vision
 */
async function extractMedicationWithGemini(imageFile: File | Blob): Promise<ExtractedMedicationText | null> {
  try {
    logger.info('[Gemini OCR] Using server-side Gemini Vision API for medication extraction')

    // Get current user token for API auth
    const user = auth.currentUser
    if (!user) {
      logger.warn('[Gemini OCR] User not authenticated')
      return null
    }

    const token = await user.getIdToken()

    // Convert image to base64
    const imageData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as string)
      }
      reader.onerror = reject
      reader.readAsDataURL(imageFile)
    })

    // Call server-side OCR API
    const response = await fetch('/api/ocr/medication', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ imageData })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      logger.error('[Gemini OCR] API request failed', new Error(errorData.error || 'Unknown error'))
      return null
    }

    const result = await response.json()

    if (!result.success || !result.data) {
      logger.warn('[Gemini OCR] No medication data returned')
      return null
    }

    logger.info('[Gemini OCR] Successfully extracted medication', {
      medicationName: result.data.medicationName,
      strength: result.data.strength,
      dosageForm: result.data.dosageForm
    })

    return result.data

  } catch (error) {
    logger.error('[Gemini OCR] Vision API extraction failed', error as Error)
    return null
  }
}

/**
 * Extract medication from image (combines OCR + parsing with Gemini fallback)
 *
 * @param imageFile - Image file containing medication label
 * @param onProgress - Optional progress callback (0-100)
 * @returns Parsed medication information
 */
export async function extractMedicationFromImage(
  imageFile: File | Blob,
  onProgress?: (progress: number) => void
): Promise<ExtractedMedicationText | null> {
  try {
    logger.info('[OCR] Extracting medication from image')

    // Step 1: Extract raw text with Tesseract
    const { text, confidence } = await extractTextFromImage(imageFile, onProgress)

    if (!text || text.length < 10) {
      logger.warn('[OCR] Insufficient text extracted, trying Gemini Vision fallback')
      return await extractMedicationWithGemini(imageFile)
    }

    // Step 2: Parse medication info from text
    const medication = parseMedicationFromText(text)

    // Step 3: If parsing failed or confidence is too low, try Gemini Vision
    if (!medication || confidence < 50) {
      logger.warn('[OCR] Low confidence or parsing failed', {
        confidence: Math.round(confidence),
        medicationFound: !!medication
      })
      logger.info('[OCR] Attempting Gemini Vision fallback')

      const geminiResult = await extractMedicationWithGemini(imageFile)
      if (geminiResult) {
        return geminiResult
      }

      // If Gemini also fails, return Tesseract result if we have one
      return medication
    }

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
  // Build medication object, only including fields that have values
  // This prevents Firestore errors with undefined values
  const medication: ScannedMedication = {
    name: extracted.medicationName,
    strength: extracted.strength || 'Unknown',
    dosageForm: extracted.dosageForm || 'Unknown',
    ndc: extracted.ndc || '',
    scannedAt: new Date().toISOString()
  }

  // Only add optional fields if they have actual values
  if (extracted.frequency) medication.frequency = extracted.frequency
  if (prescribedFor) medication.prescribedFor = prescribedFor
  if (extracted.patientName) medication.patientName = extracted.patientName
  if (extracted.patientAddress) medication.patientAddress = extracted.patientAddress
  if (extracted.rxNumber) medication.rxNumber = extracted.rxNumber
  if (extracted.quantity) medication.quantity = extracted.quantity
  if (extracted.refills) medication.refills = extracted.refills
  if (extracted.fillDate) medication.fillDate = extracted.fillDate
  if (extracted.expirationDate) medication.expirationDate = extracted.expirationDate
  if (extracted.warnings && extracted.warnings.length > 0) medication.warnings = extracted.warnings
  if (extracted.pharmacy) medication.pharmacyName = extracted.pharmacy
  if (extracted.pharmacyPhone) medication.pharmacyPhone = extracted.pharmacyPhone
  if (extracted.prescribingDoctor) medication.prescribingDoctor = extracted.prescribingDoctor

  return medication
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
