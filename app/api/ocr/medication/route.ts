import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminAuth } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { classifyMedicationConditions, normalizeConditionName } from '@/lib/medication-classifier'

export const maxDuration = 60 // Allow up to 60 seconds for OCR processing

interface ExtractedMedicationText {
  medicationName: string
  strength?: string
  dosageForm?: string
  frequency?: string
  rxNumber?: string
  prescribingDoctor?: string
  patientName?: string
  patientAddress?: string
  ndc?: string
  pharmacy?: string
  pharmacyPhone?: string
  quantity?: string
  refills?: string
  fillDate?: string
  expirationDate?: string
  warnings?: string[]
  rawText: string
}

interface SuggestedCondition {
  condition: string
  confidence: number
  reasoning: string
  isPrimaryTreatment: boolean
}

/**
 * POST /api/ocr/medication
 *
 * Server-side medication OCR using Gemini Vision API
 * Accepts base64 image data and returns extracted medication information
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]

    // Verify the Firebase ID token
    let userId: string
    try {
      const decodedToken = await adminAuth.verifyIdToken(token)
      userId = decodedToken.uid
      logger.debug('[OCR API] Authenticated user', { uid: userId })
    } catch (authError) {
      logger.error('[OCR API] Auth failed', authError as Error)
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { imageData } = body

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      )
    }

    // Validate image data is a string
    if (typeof imageData !== 'string') {
      return NextResponse.json(
        { error: 'Image data must be a base64 string' },
        { status: 400 }
      )
    }

    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format. Please provide a valid base64 image.' },
        { status: 400 }
      )
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      logger.error('[OCR API] GEMINI_API_KEY not configured')
      return NextResponse.json(
        { error: 'OCR service not configured' },
        { status: 500 }
      )
    }

    logger.info('[OCR API] Processing medication image with Gemini Vision', { userId })

    // Convert base64 image to Gemini format
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const mimeType = imageData.match(/data:(image\/\w+);base64,/)?.[1] || 'image/jpeg'

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.2, // Low temperature for factual extraction
        topK: 32,
        topP: 1,
        maxOutputTokens: 1024,
      }
    })

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    }

    const prompt = `Analyze this prescription medication label and extract ALL information visible. Look carefully at EVERY line of text on the label, even if blurry or at an angle.

This may be the FRONT label (showing dosage instructions) or BACK label (showing NDC barcode, Rx number, pharmacy info).

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "medicationName": "name of medication (brand or generic)",
  "strength": "dosage strength with unit (e.g., 10 mg, 500 mg)",
  "dosageForm": "form (e.g., tablet, capsule, cream, injection)",
  "frequency": "COMPLETE dosage instructions - see requirements below",
  "rxNumber": "prescription number (Rx# or Rx No)",
  "ndc": "NDC number if visible (11-digit with dashes)",
  "prescribingDoctor": "doctor/prescriber name (look for Dr, Doctor, Prescriber, Physician - VERY IMPORTANT)",
  "patientName": "patient name",
  "patientAddress": "patient address (street, apt, city)",
  "pharmacy": "pharmacy name",
  "pharmacyPhone": "pharmacy phone number",
  "quantity": "quantity dispensed (e.g., '30 tablets', '60 capsules')",
  "refills": "refills remaining (e.g., '3 refills', 'No refills')",
  "fillDate": "fill date if visible (MM/DD/YYYY format)",
  "expirationDate": "expiration date if visible (MM/DD/YYYY format)",
  "warnings": ["array", "of", "warning messages or special instructions"]
}

CRITICAL REQUIREMENTS:

**frequency field** - Extract COMPLETE dosage instruction including:
  ✓ Quantity: "Take 1 tablet", "Take 2 capsules", "Apply 1 patch"
  ✓ Route: "by mouth", "topically", "subcutaneously"
  ✓ Timing: "every day", "twice daily", "every 4-6 hours"
  ✓ Conditions: "with food", "with water", "as needed for pain"
  ✓ Examples:
    - "Take 1 tablet by mouth every day"
    - "Take 2 capsules by mouth twice daily with food"
    - "Apply 1 patch to clean dry skin every 3 days"
    - "Inject 10 units subcutaneously before meals"
  ✗ DO NOT return just "every day" or "twice daily" - MUST include quantity and method!

**patientAddress field** - Extract complete address:
  - Include street number, street name, apartment/unit number
  - Include city if visible
  - Example: "40 Cross Rd Apt 71, Malawa"

**quantity field** - Format as number + unit:
  - "30 tablets", "60 capsules", "100 ml", "1 tube"

**warnings field** - Extract any warning messages:
  - "Do not take with alcohol"
  - "May cause drowsiness"
  - "Take with food"
  - "Keep refrigerated"
  - "Do not crush or chew"

**prescribingDoctor field** - VERY IMPORTANT - Look carefully for doctor name:
  - May appear as: "Dr Smith", "Dr. John Smith", "Dr V.Atieh", "Prescriber: Smith", "Physician: Jones"
  - Check EVERY line on the label, even small print
  - Common locations: near patient name, near Rx#, in pharmacy info section
  - Format: Extract the name as shown (e.g., "V.Atieh", "John Smith", "J. Doe")
  - DO NOT include "Dr" or "Dr." prefix in the extracted name

If any field is not visible or unclear, use null for that field. Focus on ACCURACY and COMPLETENESS.

IMPORTANT: Make your best effort to find the prescribing doctor name - this is critical medical information.`

    const result = await model.generateContent([prompt, imagePart])
    const response = await result.response
    const text = response.text()

    // Parse JSON response
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanedText)

    if (!parsed.medicationName) {
      logger.warn('[OCR API] No medication name found in image')
      return NextResponse.json(
        { error: 'Could not identify medication in image. Please try a clearer photo.' },
        { status: 400 }
      )
    }

    const extracted: ExtractedMedicationText = {
      medicationName: parsed.medicationName,
      strength: parsed.strength || undefined,
      dosageForm: parsed.dosageForm || undefined,
      frequency: parsed.frequency || undefined,
      rxNumber: parsed.rxNumber || undefined,
      prescribingDoctor: parsed.prescribingDoctor || undefined,
      patientName: parsed.patientName || undefined,
      patientAddress: parsed.patientAddress || undefined,
      ndc: parsed.ndc || undefined,
      pharmacy: parsed.pharmacy || undefined,
      pharmacyPhone: parsed.pharmacyPhone || undefined,
      quantity: parsed.quantity || undefined,
      refills: parsed.refills || undefined,
      fillDate: parsed.fillDate || undefined,
      expirationDate: parsed.expirationDate || undefined,
      warnings: parsed.warnings || undefined,
      rawText: text
    }

    logger.info('[OCR API] Successfully extracted medication', {
      userId,
      medicationName: extracted.medicationName,
      strength: extracted.strength,
      dosageForm: extracted.dosageForm
    })

    // Step 2: Classify medication to determine likely conditions
    let suggestedConditions: SuggestedCondition[] = []

    try {
      logger.info('[OCR API] Classifying medication to determine conditions')

      const classifications = await classifyMedicationConditions([{
        name: extracted.medicationName,
        strength: extracted.strength || 'Unknown',
        dosageForm: extracted.dosageForm || 'Unknown',
        scannedAt: new Date().toISOString()
      }])

      if (classifications.length > 0) {
        const classification = classifications[0]

        suggestedConditions = classification.likelyConditions.map(condition => ({
          condition: normalizeConditionName(condition),
          confidence: classification.confidence,
          reasoning: classification.reasoning,
          isPrimaryTreatment: classification.isPrimaryTreatment
        }))

        logger.info('[OCR API] Medication classified', {
          medicationName: extracted.medicationName,
          suggestedConditions: suggestedConditions.map(s => s.condition),
          confidence: classification.confidence
        })
      }
    } catch (classificationError) {
      logger.error('[OCR API] Classification failed, continuing without suggestions', classificationError as Error)
      // Continue without classification - don't fail the entire request
    }

    return NextResponse.json({
      success: true,
      data: {
        ...extracted,
        suggestedConditions
      }
    })

  } catch (error) {
    logger.error('[OCR API] Medication extraction failed', error as Error)

    // Handle JSON parse errors specifically
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Failed to parse medication information. Please try again with a clearer photo.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to process medication image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
