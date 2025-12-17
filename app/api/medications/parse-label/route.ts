import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@/lib/logger'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { labelText } = await request.json()

    if (!labelText || typeof labelText !== 'string') {
      return NextResponse.json(
        { error: 'Invalid label text' },
        { status: 400 }
      )
    }

    logger.info('[Medication Parse API] Parsing medication label', {
      textLength: labelText.length
    })

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `You are a medical information extraction expert. Extract structured medication information from the following prescription label text.

LABEL TEXT:
${labelText}

Extract the following fields if present:
- name: Generic medication name (e.g., "Metformin", "Lisinopril") - Look for drug names in the text
- brandName: Brand name if different from generic (e.g., "Glucophage", "Prinivil")
- strength: Dosage strength (e.g., "500 mg", "10 mg", "5mg/5mL")
- dosageForm: Form of medication (e.g., "tablet", "capsule", "liquid", "injection")
- frequency: Complete dosage instructions (e.g., "Take 1 tablet by mouth twice daily", "Apply to affected area once daily")
- prescribedFor: Condition being treated (if mentioned)
- patientName: Patient's full name (usually appears at the top of the label - first and last name)
- prescribingDoctor: Doctor's name (look for "Dr." followed by a name, "MD", "Prescriber:", or doctor names in the text - extract just the name without "Dr." prefix)
- rxNumber: Prescription/Rx number (look for "RX:", "Rx#", "#" followed by numbers)
- ndc: National Drug Code (11-digit number, format: XXXXX-XXXX-XX or similar)
- quantity: Quantity dispensed (look for "QTY:", "Qty", or quantity information - e.g., "30 tablets", "90 capsules")
- refills: Number of refills (look for "REFILLS:", "Refill", or refill information - e.g., "3", "0", "No refills")
- fillDate: Date prescription was filled (convert to ISO format YYYY-MM-DD)
- expirationDate: Expiration date (look for "EXP:", "Expires", "Use by" - convert to ISO format YYYY-MM-DD)
- pharmacyName: Pharmacy name (e.g., "CVS Pharmacy", "Walgreens", "Rite Aid")
- pharmacyPhone: Pharmacy phone number (look for "TEL:", "Phone:", phone numbers near pharmacy name)
- warnings: Array of warning strings (e.g., ["May cause drowsiness", "Do not take with alcohol"])

IMPORTANT RULES:
1. **Extract whatever is available** - even if only partial information like pharmacy and Rx number
2. Do not guess or infer medication names if not clearly stated
3. Return ONLY valid JSON, no markdown formatting, no explanations
4. Use null for missing fields (do not include them in the output)
5. For dates, convert to ISO format (YYYY-MM-DD)
6. For phone numbers, clean up formatting to XXX-XXX-XXXX if possible
7. For warnings, return as an array of strings
8. For rxNumber, extract just the number without "RX:" prefix
9. For quantity, extract just the number without "QTY:" prefix

Example outputs:

FULL LABEL:
{
  "name": "Lisinopril",
  "strength": "10 mg",
  "dosageForm": "tablet",
  "frequency": "Take 1 tablet by mouth daily",
  "rxNumber": "1234567",
  "quantity": "30",
  "refills": "3",
  "fillDate": "2024-01-15",
  "expirationDate": "2025-01-15",
  "pharmacyName": "CVS Pharmacy",
  "pharmacyPhone": "732-706-5321"
}

PARTIAL LABEL (pharmacy only):
{
  "rxNumber": "422931",
  "quantity": "90",
  "pharmacyName": "CVS Pharmacy",
  "pharmacyPhone": "732-706-5321"
}

Return the extracted data as valid JSON:`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    logger.debug('[Medication Parse API] Raw Gemini response', {
      response: responseText.substring(0, 200)
    })

    // Clean up response - remove markdown code blocks if present
    let cleanedResponse = responseText.trim()
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }

    // Parse JSON response
    let parsedData
    try {
      parsedData = JSON.parse(cleanedResponse)
    } catch (jsonError) {
      logger.error('[Medication Parse API] Failed to parse JSON response', jsonError as Error, {
        response: cleanedResponse.substring(0, 500)
      })
      throw new Error('Invalid JSON response from AI')
    }

    // Remove null values and empty arrays
    const cleanedData = Object.entries(parsedData).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined && value !== '' &&
          !(Array.isArray(value) && value.length === 0)) {
        acc[key] = value
      }
      return acc
    }, {} as Record<string, any>)

    logger.info('[Medication Parse API] Successfully parsed medication', {
      fields: Object.keys(cleanedData),
      medicationName: cleanedData.name
    })

    return NextResponse.json(cleanedData)

  } catch (error) {
    logger.error('[Medication Parse API] Failed to parse label', error as Error)
    return NextResponse.json(
      { error: 'Failed to parse medication label' },
      { status: 500 }
    )
  }
}
