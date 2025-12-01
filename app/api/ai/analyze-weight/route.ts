/**
 * AI Weight Verification Endpoint
 * Uses Gemini Vision to read digital scale displays from photos
 * Provides photo-verified weight logging for accountability
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '@/lib/logger'
import { adminAuth } from '@/lib/firebase-admin'
import { aiRateLimit, dailyRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit'
import { ErrorHandler } from '@/lib/utils/error-handler'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]

    // Verify the Firebase ID token
    let userId: string
    try {
      const decodedToken = await adminAuth.verifyIdToken(token)
      userId = decodedToken.uid
      logger.debug('Authenticated user for weight verification', { uid: userId })
    } catch (authError) {
      ErrorHandler.handle(authError, {
        operation: 'ai_analyze_weight_auth',
        component: 'api/ai/analyze-weight'
      })
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid authentication token' },
        { status: 401 }
      )
    }

    // Check rate limits (both per-minute and daily)
    const [minuteLimit, dayLimit] = await Promise.all([
      aiRateLimit?.limit(userId),
      dailyRateLimit?.limit(userId)
    ])

    if (minuteLimit && !minuteLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit: 10 requests per minute. Please try again in a moment.' },
        {
          status: 429,
          headers: getRateLimitHeaders(minuteLimit)
        }
      )
    }

    if (dayLimit && !dayLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Daily limit reached (500 requests). Please try again tomorrow.' },
        {
          status: 429,
          headers: getRateLimitHeaders(dayLimit)
        }
      )
    }

    const body = await request.json()
    const { imageBase64, expectedUnit } = body

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      )
    }

    // Verify API key is configured
    if (!process.env.GEMINI_API_KEY) {
      logger.warn('GEMINI_API_KEY not configured for weight verification')
      return NextResponse.json(
        { success: false, error: 'AI service not configured' },
        { status: 500 }
      )
    }

    // Use Gemini Pro Vision model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Craft prompt for scale reading
    const prompt = `You are a precise scale reading assistant. Analyze this image and extract the weight measurement shown on the scale display.

CRITICAL RULES:
1. Look for digital or analog scale displays showing weight
2. Extract ONLY the numeric weight value (e.g., "165.2", "72.5")
3. Identify the unit if visible (lbs, kg, st)
4. Ignore any other numbers (body fat %, BMI, etc.)
5. If multiple weights shown, use the largest/most prominent one
6. If no scale or weight visible, return error

Expected unit: ${expectedUnit || 'lbs'}

Return ONLY a JSON object with this exact format:
{
  "weight": number,
  "unit": "lbs" | "kg",
  "confidence": number (0-100),
  "scaleType": "digital" | "analog" | "smart-scale",
  "readable": boolean,
  "error": string | null
}

Examples:
- Digital scale showing "165.2 lb" → {"weight": 165.2, "unit": "lbs", "confidence": 95, "scaleType": "digital", "readable": true, "error": null}
- Analog scale pointer at 72kg → {"weight": 72, "unit": "kg", "confidence": 85, "scaleType": "analog", "readable": true, "error": null}
- Blurry image → {"weight": 0, "unit": "lbs", "confidence": 0, "scaleType": "digital", "readable": false, "error": "Image too blurry to read"}
- Not a scale → {"weight": 0, "unit": "lbs", "confidence": 0, "scaleType": "digital", "readable": false, "error": "No scale detected in image"}

Analyze the image now:`

    // Generate content with image
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
        }
      }
    ])

    const response = await result.response
    const text = response.text()

    // Parse JSON response
    let analysis
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text
      analysis = JSON.parse(jsonStr.trim())
    } catch (parseError) {
      ErrorHandler.handle(parseError, {
        operation: 'ai_weight_parse_response',
        userId,
        component: 'api/ai/analyze-weight',
        severity: 'warning',
        metadata: { rawText: text }
      })
      return NextResponse.json(
        { success: false, error: 'Failed to parse scale reading' },
        { status: 500 }
      )
    }

    // Validate the response structure
    if (!analysis || typeof analysis.weight === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'Invalid response format from AI', analysis },
        { status: 500 }
      )
    }

    // Check if scale was readable
    if (!analysis.readable || analysis.error) {
      return NextResponse.json({
        success: false,
        error: analysis.error || 'Unable to read scale',
        confidence: analysis.confidence || 0
      }, { status: 400 })
    }

    // Validate weight is in reasonable range
    const weight = parseFloat(analysis.weight)
    const unit = analysis.unit || expectedUnit || 'lbs'

    // Convert to pounds for validation
    const weightInLbs = unit === 'kg' ? weight * 2.20462 : weight

    if (weightInLbs < 50 || weightInLbs > 1000) {
      return NextResponse.json({
        success: false,
        error: `Weight ${weight} ${unit} is outside valid range (50-1000 lbs)`,
        weight,
        unit,
        confidence: analysis.confidence
      }, { status: 400 })
    }

    // Validate confidence is acceptable
    if (analysis.confidence < 50) {
      return NextResponse.json({
        success: false,
        error: 'Low confidence reading - please retake photo with better lighting',
        weight,
        unit,
        confidence: analysis.confidence
      }, { status: 400 })
    }

    // Success - return verified weight
    return NextResponse.json({
      success: true,
      data: {
        weight,
        unit,
        confidence: analysis.confidence,
        scaleType: analysis.scaleType,
        dataSource: 'photo-verified' as const,
        verifiedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    ErrorHandler.handle(error, {
      operation: 'ai_analyze_weight',
      component: 'api/ai/analyze-weight',
      userId: 'unknown'
    })

    const userMessage = ErrorHandler.getUserMessage(error)
    return NextResponse.json(
      {
        success: false,
        error: userMessage
      },
      { status: 500 }
    )
  }
}

// GET endpoint for testing/documentation
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/ai/analyze-weight',
    description: 'AI-powered weight scale photo verification',
    method: 'POST',
    requiredFields: {
      imageBase64: 'Base64-encoded JPEG image of scale display',
      expectedUnit: 'Optional: "lbs" or "kg"'
    },
    response: {
      success: 'boolean',
      data: {
        weight: 'number - extracted weight value',
        unit: 'string - lbs or kg',
        confidence: 'number - 0-100 confidence score',
        scaleType: 'string - digital/analog/smart-scale',
        dataSource: 'string - always "photo-verified"',
        verifiedAt: 'string - ISO timestamp'
      }
    },
    validation: {
      weightRange: '50-1000 lbs (or equivalent in kg)',
      minimumConfidence: 50,
      requiresReadableScale: true
    }
  })
}
