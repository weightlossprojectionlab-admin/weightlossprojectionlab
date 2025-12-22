import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { generateMealTitle } from '@/lib/meal-title-utils'
import { batchValidateWithUSDA } from '@/lib/usda-nutrition'
import { logger } from '@/lib/logger'
import { aiRateLimit, dailyRateLimit } from '@/lib/utils/rate-limit'
import { ErrorHandler } from '@/lib/utils/error-handler'
import { analyzeMealImage } from '@/lib/ai-vision-service'

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
      logger.debug('Authenticated user', { uid: userId })
    } catch (authError) {
      ErrorHandler.handle(authError, {
        operation: 'ai_analyze_meal_auth',
        component: 'api/ai/analyze-meal'
      })
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { imageData, mealType } = body

    logger.debug('Received request', {
      hasImageData: !!imageData,
      imageDataType: typeof imageData,
      imageDataLength: imageData?.length,
      mealType
    })

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      )
    }

    // Validate image data is a string
    if (typeof imageData !== 'string') {
      return NextResponse.json(
        { error: 'Image data must be a string' },
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

    // Check rate limits first (per-minute and daily)
    const [minuteLimit, dayLimit] = await Promise.all([
      aiRateLimit?.limit(userId),
      dailyRateLimit?.limit(userId)
    ])

    const rateLimitExceeded = (minuteLimit && !minuteLimit.success) || (dayLimit && !dayLimit.success)

    if (rateLimitExceeded) {
      const reason = minuteLimit && !minuteLimit.success
        ? 'Rate limit: 10 requests per minute'
        : 'Daily limit reached (500 requests)'
      logger.warn(reason)
      return NextResponse.json(
        { error: reason },
        { status: 429 }
      )
    }

    // Use AI vision service with automatic fallback
    const { analysis, provider, error: analysisError } = await analyzeMealImage(imageData, mealType)

    // Validate AI-generated nutrition data with USDA database
    logger.info('Validating nutrition data with USDA')
    let validatedFoodItems = analysis.foodItems || []
    let usdaMessages: string[] = []

    try {
      if (validatedFoodItems.length > 0) {
        const validationResults = await batchValidateWithUSDA(validatedFoodItems)

        // Replace AI estimates with USDA-validated data
        validatedFoodItems = validationResults.map(result => ({
          name: result.validated.name,
          portion: result.original.portion,
          calories: result.validated.calories,
          protein: result.validated.protein,
          carbs: result.validated.carbs,
          fat: result.validated.fat,
          fiber: result.validated.fiber,
          fdcId: result.validated.fdcId, // USDA database ID
          usdaVerified: result.isUSDAVerified,
          confidence: result.validated.confidence,
          source: result.validated.source
        }))

        // Collect validation messages
        usdaMessages = validationResults.map(r => r.message)

        // Recalculate totals with USDA-validated data
        const totalCalories = validatedFoodItems.reduce((sum: number, item: any) => sum + item.calories, 0)
        const totalProtein = validatedFoodItems.reduce((sum: number, item: any) => sum + item.protein, 0)
        const totalCarbs = validatedFoodItems.reduce((sum: number, item: any) => sum + item.carbs, 0)
        const totalFat = validatedFoodItems.reduce((sum: number, item: any) => sum + item.fat, 0)
        const totalFiber = validatedFoodItems.reduce((sum: number, item: any) => sum + item.fiber, 0)

        analysis.totalCalories = totalCalories
        analysis.totalMacros = {
          protein: Math.round(totalProtein * 10) / 10,
          carbs: Math.round(totalCarbs * 10) / 10,
          fat: Math.round(totalFat * 10) / 10,
          fiber: Math.round(totalFiber * 10) / 10
        }

        // Update overall confidence based on USDA verification
        const usdaVerifiedCount = validationResults.filter(r => r.isUSDAVerified).length
        const verificationRate = usdaVerifiedCount / validationResults.length
        analysis.confidence = Math.round(analysis.confidence * 0.4 + verificationRate * 60) // Weighted average

        logger.info('USDA validation complete', {
          usdaVerifiedCount,
          totalItems: validationResults.length
        })
      }
    } catch (error) {
      ErrorHandler.handle(error, {
        operation: 'usda_meal_validation',
        userId,
        component: 'api/ai/analyze-meal',
        severity: 'warning'
      })
      // Continue with AI data if USDA validation fails
    }

    // Generate meal title from food items
    const title = validatedFoodItems && validatedFoodItems.length > 0
      ? generateMealTitle(validatedFoodItems, mealType)
      : generateMealTitle([], mealType)

    const response = {
      success: true,
      data: {
        ...analysis,
        foodItems: validatedFoodItems,
        title,
        usdaValidation: usdaMessages.length > 0 ? usdaMessages : undefined,
        isMockData: provider === 'mock'
      },
      _diagnostics: {
        isRealAnalysis: provider !== 'mock',
        provider,
        timestamp: new Date().toISOString(),
        error: analysisError
      }
    }

    // Log warning if using mock data
    if (provider === 'mock') {
      console.warn('⚠️ WARNING: Returning mock data instead of real analysis')
      console.warn('⚠️ Reason:', analysisError)
    } else {
      logger.info(`✅ Analysis completed with ${provider}`)
    }

    return NextResponse.json(response)

  } catch (error) {
    ErrorHandler.handle(error, {
      operation: 'ai_analyze_meal',
      component: 'api/ai/analyze-meal',
      userId: 'unknown'
    })

    const userMessage = ErrorHandler.getUserMessage(error)
    return NextResponse.json(
      {
        error: userMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')

  // Whitelist of allowed origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.NEXT_PUBLIC_APP_URL
  ].filter(Boolean) // Remove undefined values

  // Check if origin is allowed
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : 'http://localhost:3000'

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}