/**
 * Driver's License OCR API Endpoint
 * Uses Gemini Vision to extract structured data from US driver's licenses
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageData } = body

    // Validate input
    if (!imageData || typeof imageData !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: imageData is required' },
        { status: 400 }
      )
    }

    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image format: must be base64 data URL' },
        { status: 400 }
      )
    }

    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      )
    }

    logger.info('[DL OCR API] Processing driver license with Gemini Vision')

    // Convert base64 to Gemini format
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const mimeType = imageData.match(/data:(image\/\w+);base64,/)?.[1] || 'image/jpeg'

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    })

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    }

    const prompt = `You are an expert at extracting structured data from US driver's licenses.

Analyze this driver's license image and extract the following information:

REQUIRED FIELDS:
- firstName: First name of the license holder
- lastName: Last name (surname) of the license holder
- dateOfBirth: Date of birth in YYYY-MM-DD format
- gender: Gender (M/Male → "male", F/Female → "female")

OPTIONAL FIELDS (extract if visible):
- middleName: Middle name or initial
- streetAddress: Street address (number and street name)
- city: City name
- state: State abbreviation (2 letters)
- zipCode: ZIP code
- licenseNumber: Driver's license number
- expirationDate: Expiration date in YYYY-MM-DD format

IMPORTANT INSTRUCTIONS:
1. Extract text EXACTLY as it appears on the license
2. For dates, convert to YYYY-MM-DD format (e.g., "01/15/1990" → "1990-01-15")
3. For gender: M/Male → "male", F/Female → "female"
4. If a field is not visible or unclear, omit it from the response
5. Common license formats:
   - Name usually appears as: LAST NAME, FIRST NAME MIDDLE
   - DOB format: MM/DD/YYYY or MM-DD-YYYY
   - Address may span multiple lines

Return a JSON object with this exact structure:
{
  "firstName": "string",
  "lastName": "string",
  "middleName": "string (optional)",
  "dateOfBirth": "YYYY-MM-DD",
  "gender": "male" or "female",
  "streetAddress": "string (optional)",
  "city": "string (optional)",
  "state": "string (optional)",
  "zipCode": "string (optional)",
  "licenseNumber": "string (optional)",
  "expirationDate": "YYYY-MM-DD (optional)"
}

Only include fields that you can confidently extract from the image.`

    const result = await model.generateContent([prompt, imagePart])
    const response = await result.response
    const extractedText = response.text()

    // Parse JSON response
    const licenseData = JSON.parse(extractedText)

    // Validate required fields
    if (!licenseData.firstName || !licenseData.lastName || !licenseData.dateOfBirth) {
      return NextResponse.json(
        { error: 'Could not extract required fields (name, date of birth) from license' },
        { status: 422 }
      )
    }

    logger.info('[DL OCR API] License data extracted successfully', {
      hasName: !!licenseData.firstName,
      hasDOB: !!licenseData.dateOfBirth,
      hasAddress: !!licenseData.streetAddress
    })

    return NextResponse.json(licenseData)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error('[DL OCR API] License scan failed', error as Error)

    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return NextResponse.json(
        { error: 'API quota exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: `License scan failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
