import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminAuth } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { classifyMedicationConditions, normalizeConditionName } from '@/lib/medication-classifier'
import { MedicationOCRResponseSchema } from '@/lib/validations/medication'

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
    const { imageData, images, side } = body as {
      imageData?: string
      images?: Array<{ data: string; label: 'front' | 'back' }>
      side?: 'front' | 'back'
    }

    // Normalize input: accept either legacy `imageData` (single image) or new `images` array.
    type LabeledImage = { data: string; label: 'front' | 'back' | 'unspecified' }
    const labeledImages: LabeledImage[] = []

    if (Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        if (!img || typeof img.data !== 'string' || !img.data.startsWith('data:image/')) {
          return NextResponse.json(
            { error: 'Invalid image format in images[]. Each entry must include a valid base64 data URL.' },
            { status: 400 }
          )
        }
        labeledImages.push({ data: img.data, label: img.label === 'back' ? 'back' : img.label === 'front' ? 'front' : 'unspecified' })
      }
    } else if (typeof imageData === 'string') {
      if (!imageData.startsWith('data:image/')) {
        return NextResponse.json(
          { error: 'Invalid image format. Please provide a valid base64 image.' },
          { status: 400 }
        )
      }
      labeledImages.push({ data: imageData, label: 'unspecified' })
    } else {
      return NextResponse.json(
        { error: 'Image data is required (provide imageData or images[]).' },
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

    logger.info('[OCR API] Processing medication image with Gemini Vision', {
      userId,
      imageCount: labeledImages.length,
      labels: labeledImages.map(i => i.label)
    })

    // Convert each labeled image to a Gemini inlineData part
    const imageParts = labeledImages.map(img => {
      const base64Data = img.data.replace(/^data:image\/\w+;base64,/, '')
      const mimeType = img.data.match(/data:(image\/\w+);base64,/)?.[1] || 'image/jpeg'
      return {
        inlineData: {
          data: base64Data,
          mimeType
        }
      }
    })

    // Initialize Gemini.
    //
    // generationConfig tuned for Gemini 2.5 Flash quirks documented in
    // feedback_gemini_2_5_flash_gotchas (receipt OCR was the first
    // route to hit + fix these; medication OCR was the last holdout):
    //
    //   - responseMimeType: 'application/json' forces the model to
    //     emit a single JSON object instead of mixing in prose or
    //     markdown code fences. Without it, JSON.parse intermittently
    //     fails on extracted text wrapped in ```json blocks.
    //
    //   - thinkingBudget: 0 disables the model's internal
    //     chain-of-thought tokens. The 2.5 family otherwise burns up
    //     to maxOutputTokens *thinking* before emitting any output,
    //     producing truncated/empty JSON on dense labels (the
    //     Tacrolimus / CVS-pharmacy / Metoprolol photos in the
    //     2026-05-26 smoke test all 500'd against the old 1024-token
    //     cap because thinking ate the entire budget). The TS types
    //     for the SDK don't expose this field yet, hence the cast.
    //
    //   - maxOutputTokens: 16384 gives the extraction enough headroom
    //     for the full warnings array + multi-line directions on a
    //     paired-photo back panel. The old 1024 cap was the source
    //     of the truncated-JSON 500s.
    //
    //   - temperature 0.2 retained — factual extraction (medication
    //     name, strength, NDC, prescriber) wants minimal creativity.
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        // Bumped from 0.2 to 0.4 to avoid the "degenerate digit-loop"
        // failure mode documented in feedback_gemini_2_5_flash_gotchas
        // (low temperature + structured output + digit-heavy fields
        // like NDC/Rx# can latch into a repeating-character runaway
        // until the model hits maxOutputTokens). responseMimeType
        // still enforces JSON shape, so the higher temperature only
        // affects token-level diversity.
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 16384,
        responseMimeType: 'application/json',
        // Note the nesting: `thinkingConfig: { thinkingBudget: 0 }`,
        // NOT a top-level `thinkingBudget: 0`. The REST API ignores
        // the latter, so on dense labels (Tacrolimus / CVS pharmacy
        // sheet / Metoprolol) thinking still eats the entire token
        // budget and produces truncated JSON → 500. Matches the
        // pattern proven on app/api/ocr/receipt/route.ts.
        thinkingConfig: { thinkingBudget: 0 },
      } as any,
    })

    const hasTwoSides = labeledImages.length >= 2
    const singleImageSide: 'front' | 'back' | undefined =
      side === 'front' || side === 'back' ? side : (labeledImages.length === 1 ? labeledImages[0].label as 'front' | 'back' | undefined : undefined)

    const frontFocus = `This is the FRONT of a prescription bottle — the small main sticker. PRIORITIZE these fields if visible: medicationName, strength, dosageForm, rxNumber, prescribingDoctor, patientName, patientAddress, pharmacy. Dosage instructions, refills, NDC, and dates may be truncated or absent on the front — extract whatever IS visible but expect the back panel to be authoritative for those.`
    const backFocus = `This is the BACK / wraparound panel of a prescription bottle. PRIORITIZE these fields and read them in full: frequency (COMPLETE dosage instructions — do NOT truncate), ndc, quantity, refills, fillDate, expirationDate, warnings. The medication name, strength, and Rx number may also appear here — extract them too if present.`
    // The image can be one of three formats. Bottle labels are the
    // common case, but users also photograph the printed pharmacy
    // info sheet / receipt that comes with the prescription — those
    // have a different layout (large header banner with patient name
    // in "Last, First" format, structured "Prescription Information"
    // and "Receipt & Refill Information" sections). The previous
    // bottle-only framing biased the model away from the info-sheet
    // layout, causing patientName to come back null on those scans.
    const genericFocus = `You are looking at ONE photo of a prescription. It may be: (a) the FRONT of a bottle label (drug name, strength, Rx number, prescriber); (b) the BACK/wraparound panel of a bottle (dosage instructions, warnings, refills, NDC); or (c) a printed pharmacy info sheet or receipt that accompanies the prescription (header banner with patient name, "Prescription Information" section, "Receipt & Refill Information" section). Extract everything visible regardless of layout.`

    const labelHeader = hasTwoSides
      ? `You are looking at TWO photos of the SAME prescription bottle: image 1 is the FRONT (small main label with drug name, strength, Rx number, prescriber) and image 2 is the BACK/wraparound panel (dosage instructions, warnings, refills, NDC, fill/expiration dates). Merge both photos into a SINGLE record. If a field appears on both sides, prefer the FRONT for identity fields (medicationName, strength, rxNumber, prescribingDoctor) and the BACK for instruction fields (frequency, warnings, ndc, refills, fillDate, expirationDate).`
      : singleImageSide === 'front'
        ? frontFocus
        : singleImageSide === 'back'
          ? backFocus
          : genericFocus

    const prompt = `${labelHeader}

Look carefully at EVERY line of text on the label(s), even if blurry or at an angle.

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

**patientName field** - VERY IMPORTANT - Look carefully for patient name:
  - On bottle labels: usually in plain text near the top of the front
    sticker (e.g. "Barbara Rice", "Jane Doe")
  - On pharmacy info sheets / receipts: in a colored header banner
    at the top of the page, often in "LAST, FIRST" format (e.g.
    "Rice, Barbara") or first-name-stacked-above-last-name
  - May be alongside the patient address (street/city) — both
    typically appear in the same section
  - Format: Extract the name in "First Last" order regardless of
    how it appears on the label. If the label shows "Rice, Barbara",
    return "Barbara Rice". If it shows "Barbara Rice" already,
    return as-is.
  - DO NOT confuse the patient name with the prescriber/doctor name
    or the pharmacist (RPH) name — those are separate fields.

**patientAddress field** - Extract complete address:
  - Include street number, street name, apartment/unit number
  - Include city if visible
  - Example: "478 Clubhouse Dr, Middletown, NJ"

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

    const result = await model.generateContent([prompt, ...imageParts])
    const response = await result.response
    const text = response.text()

    // Parse JSON response. Two layers of cleanup before JSON.parse:
    //   1. Strip markdown fences (responseMimeType usually prevents
    //      these, belt-and-suspenders).
    //   2. Run sanitizeJsonControlChars (defined below) which uses a
    //      string-state machine to escape control chars that appear
    //      INSIDE string values without touching JSON structural
    //      characters. Canonical pattern from the receipt OCR route.
    const cleanedText = text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    const sanitizedJson = sanitizeJsonControlChars(cleanedText)
    const parsedRaw = JSON.parse(sanitizedJson)

    // Runtime schema gate. Output flows into a patient medication
    // record (PHI: patient name, prescriber, NDC, etc.). A malformed
    // shape — wrong types, missing medicationName, warnings as a
    // single string — silently corrupted the record before. Now
    // rejected with structural-only logging (no PHI in logs).
    const validated = MedicationOCRResponseSchema.safeParse(parsedRaw)
    if (!validated.success) {
      logger.warn('[OCR API] Medication OCR output failed schema validation', {
        userId,
        issueCount: validated.error.issues.length,
        issues: validated.error.issues.slice(0, 5).map((i) => ({
          path: i.path.join('.'),
          code: i.code,
        })),
      })
      return NextResponse.json(
        { error: 'Could not identify medication in image. Please try a clearer photo.' },
        { status: 502 }
      )
    }
    const parsed = validated.data

    // Schema requires medicationName, but treat empty string as missing.
    if (!parsed.medicationName.trim()) {
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

/**
 * Sanitize raw Gemini JSON output by escaping control characters that
 * appear INSIDE string values. Gemini 2.5 Flash occasionally emits
 * literal newlines / tabs / control chars inside string literals
 * (e.g. inside a multi-line "warnings" entry), which JSON.parse
 * rejects with "Bad control character in string literal."
 *
 * The naive regex-strip approach would also nuke control chars that
 * happen to fall outside strings, but a tree-walking parser is
 * heavier than needed. This state machine tracks whether we're inside
 * a string literal (and whether the previous char was a backslash, in
 * which case the current char is already escaped) and re-encodes
 * in-string control chars to their JSON escape form. Outside strings,
 * everything passes through untouched. Cheap defense-in-depth — a
 * well-behaved response is its own fixed point through this function.
 *
 * Canonical implementation: app/api/ocr/receipt/route.ts (the
 * fix-by-fix proof for the Gemini 2.5 hardening pattern documented
 * in feedback_gemini_2_5_flash_gotchas).
 */
function sanitizeJsonControlChars(raw: string): string {
  let result = ''
  let inString = false
  let escapeNext = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (escapeNext) {
      result += ch
      escapeNext = false
      continue
    }
    if (ch === '\\' && inString) {
      result += ch
      escapeNext = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      result += ch
      continue
    }
    if (inString) {
      const code = ch.charCodeAt(0)
      if (code < 0x20) {
        switch (ch) {
          case '\n':
            result += '\\n'
            break
          case '\r':
            result += '\\r'
            break
          case '\t':
            result += '\\t'
            break
          case '\b':
            result += '\\b'
            break
          case '\f':
            result += '\\f'
            break
          default:
            result += '\\u' + code.toString(16).padStart(4, '0')
        }
        continue
      }
    }
    result += ch
  }
  return result
}
