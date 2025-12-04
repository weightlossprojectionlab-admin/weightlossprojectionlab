/**
 * Generic Gemini Vision OCR Service
 *
 * Provides raw text extraction from medical documents using Gemini Vision API.
 * This is a generic text extraction service - no structured parsing.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@/lib/logger'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface OCRResult {
  text: string
  confidence: number
}

/**
 * Extract raw text from an image using Gemini Vision API
 *
 * @param imageData - Base64 encoded image data (with data:image/... prefix)
 * @returns Extracted text and confidence score
 */
export async function extractTextFromImageWithGemini(imageData: string): Promise<OCRResult> {
  try {
    // Validate input
    if (!imageData || typeof imageData !== 'string') {
      throw new Error('Invalid image data: must be a base64 string')
    }

    if (!imageData.startsWith('data:image/')) {
      throw new Error('Invalid image format: must start with data:image/')
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    logger.info('[Gemini OCR] Starting text extraction from image')

    // Convert base64 image to Gemini format
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const mimeType = imageData.match(/data:(image\/\w+);base64,/)?.[1] || 'image/jpeg'

    // Initialize Gemini model for OCR
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.1, // Very low temperature for factual text extraction
        topK: 32,
        topP: 1,
        maxOutputTokens: 4096, // Allow for longer documents
      }
    })

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    }

    const prompt = `Extract all visible text from this document. Return the raw text exactly as it appears, preserving:
- Line breaks and paragraph structure
- Spacing and formatting
- Any tables or lists
- Headers and labels
- All numbers, dates, and measurements

Focus on ACCURACY and COMPLETENESS. Include everything you can read, even if some parts are slightly blurry.

Do NOT:
- Translate or interpret the text
- Add explanations or context
- Format as JSON or any structured format
- Skip any visible text

Simply return the raw text as it appears on the document.`

    const result = await model.generateContent([prompt, imagePart])
    const response = await result.response
    const extractedText = response.text()

    // Calculate confidence score based on text characteristics
    const confidence = calculateConfidence(extractedText)

    logger.info('[Gemini OCR] Text extraction completed', {
      textLength: extractedText.length,
      confidence,
      hasContent: extractedText.length > 0
    })

    return {
      text: extractedText,
      confidence
    }

  } catch (error) {
    logger.error('[Gemini OCR] Text extraction failed', error as Error)
    throw error
  }
}

/**
 * Calculate confidence score based on extracted text characteristics
 *
 * @param text - Extracted text
 * @returns Confidence score (0-100)
 */
function calculateConfidence(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0
  }

  let confidence = 50 // Base score

  // Factor 1: Text length (more text = higher confidence in OCR success)
  const length = text.trim().length
  if (length > 500) {
    confidence += 20
  } else if (length > 200) {
    confidence += 15
  } else if (length > 100) {
    confidence += 10
  } else if (length > 50) {
    confidence += 5
  }

  // Factor 2: Contains proper words (not just gibberish)
  const words = text.split(/\s+/).filter(w => w.length > 2)
  const wordCount = words.length
  if (wordCount > 50) {
    confidence += 15
  } else if (wordCount > 20) {
    confidence += 10
  } else if (wordCount > 10) {
    confidence += 5
  }

  // Factor 3: Contains structured data indicators (dates, numbers, colons)
  const hasStructuredData = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text) || // Dates
                            /:\s*\d+/.test(text) || // Labels with numbers
                            /\d+\.\d+/.test(text) // Decimals

  if (hasStructuredData) {
    confidence += 10
  }

  // Factor 4: Contains medical/document keywords (indicates successful medical doc OCR)
  const medicalKeywords = [
    /patient/i, /doctor/i, /dr\./i, /physician/i,
    /prescription/i, /medication/i, /diagnosis/i,
    /treatment/i, /report/i, /lab/i, /test/i,
    /date/i, /name/i, /address/i
  ]

  const keywordMatches = medicalKeywords.filter(keyword => keyword.test(text)).length
  if (keywordMatches >= 3) {
    confidence += 10
  } else if (keywordMatches >= 1) {
    confidence += 5
  }

  // Cap at 100
  return Math.min(confidence, 100)
}

/**
 * Validate Gemini API configuration
 */
export function validateGeminiOCRConfig(): { valid: boolean; error?: string } {
  if (!process.env.GEMINI_API_KEY) {
    return {
      valid: false,
      error: 'GEMINI_API_KEY not configured in environment variables'
    }
  }
  return { valid: true }
}
