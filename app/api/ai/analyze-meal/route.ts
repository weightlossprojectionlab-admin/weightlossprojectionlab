import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminAuth } from '@/lib/firebase-admin'
import { generateMealTitle } from '@/lib/meal-title-utils'
import { batchValidateWithUSDA } from '@/lib/usda-nutrition'
import { logger } from '@/lib/logger'
import { aiRateLimit, dailyRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit'
import { ErrorHandler } from '@/lib/utils/error-handler'

// Fallback mock data if Gemini fails
const getMockAnalysis = () => {
  const mockMeals = [
    {
      items: [
        { name: 'Grilled chicken breast', portion: '6 oz', calories: 280, protein: 53, carbs: 0, fat: 6, fiber: 0 },
        { name: 'Brown rice', portion: '1 cup', calories: 215, protein: 5, carbs: 45, fat: 2, fiber: 3 },
        { name: 'Steamed broccoli', portion: '1 cup', calories: 55, protein: 4, carbs: 11, fat: 0, fiber: 5 }
      ],
      totalCalories: 550,
      totalMacros: { protein: 62, carbs: 56, fat: 8, fiber: 8 }
    },
    {
      items: [
        { name: 'Salmon fillet', portion: '5 oz', calories: 290, protein: 39, carbs: 0, fat: 14, fiber: 0 },
        { name: 'Quinoa', portion: '1 cup', calories: 220, protein: 8, carbs: 39, fat: 4, fiber: 5 },
        { name: 'Roasted vegetables', portion: '1.5 cups', calories: 90, protein: 3, carbs: 15, fat: 3, fiber: 5 }
      ],
      totalCalories: 600,
      totalMacros: { protein: 50, carbs: 54, fat: 21, fiber: 10 }
    },
    {
      items: [
        { name: 'Turkey sandwich', portion: '1 sandwich', calories: 320, protein: 28, carbs: 35, fat: 8, fiber: 4 },
        { name: 'Apple slices', portion: '1 medium', calories: 95, protein: 0, carbs: 25, fat: 0, fiber: 4 }
      ],
      totalCalories: 415,
      totalMacros: { protein: 28, carbs: 60, fat: 8, fiber: 8 }
    }
  ]

  const randomMeal = mockMeals[Math.floor(Math.random() * mockMeals.length)]

  const hour = new Date().getHours()
  let suggestedType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'lunch'
  if (hour >= 5 && hour < 11) suggestedType = 'breakfast'
  else if (hour >= 11 && hour < 15) suggestedType = 'lunch'
  else if (hour >= 15 && hour < 21) suggestedType = 'dinner'
  else suggestedType = 'snack'

  return {
    foodItems: randomMeal.items,
    totalCalories: randomMeal.totalCalories + Math.floor(Math.random() * 50) - 25,
    totalMacros: {
      protein: randomMeal.totalMacros.protein + Math.floor(Math.random() * 6) - 3,
      carbs: randomMeal.totalMacros.carbs + Math.floor(Math.random() * 6) - 3,
      fat: randomMeal.totalMacros.fat + Math.floor(Math.random() * 4) - 2,
      fiber: randomMeal.totalMacros.fiber + Math.floor(Math.random() * 2) - 1
    },
    confidence: Math.floor(Math.random() * 25) + 75,
    suggestions: [
      'Great balanced meal!',
      'Consider adding more vegetables for extra nutrients',
      'Good protein source for muscle maintenance',
      'Try to include healthy fats like avocado or nuts'
    ].slice(0, Math.floor(Math.random() * 3) + 1),
    suggestedMealType: suggestedType,
    isMockData: true
  }
}

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

    // Use Google Gemini Vision API for real analysis
    let analysis
    // Track data source for transparency (defined outside try block for scope)
    let dataSource: 'gemini' | 'mock_no_api_key' | 'mock_rate_limit' | 'mock_api_error' = 'gemini'
    let diagnosticError: string | undefined

    try {
      // Check rate limits first (per-minute and daily)
      const [minuteLimit, dayLimit] = await Promise.all([
        aiRateLimit?.limit(userId),
        dailyRateLimit?.limit(userId)
      ])

      const rateLimitExceeded = (minuteLimit && !minuteLimit.success) || (dayLimit && !dayLimit.success)

      if (!process.env.GEMINI_API_KEY) {
        logger.warn('GEMINI_API_KEY not set, using mock data')
        dataSource = 'mock_no_api_key'
        diagnosticError = 'GEMINI_API_KEY environment variable not configured'
        analysis = getMockAnalysis()
      } else if (rateLimitExceeded) {
        const reason = minuteLimit && !minuteLimit.success
          ? 'Rate limit: 10 requests per minute'
          : 'Daily limit reached (500 requests)'
        logger.warn(reason)
        dataSource = 'mock_rate_limit'
        diagnosticError = reason
        analysis = getMockAnalysis()
      } else {
        logger.info('Calling Google Gemini Vision API')

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash-latest', // Stable production model (v1beta compatible)
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 2048,
          }
        })

        // Convert base64 image to Gemini format
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
        const mimeType = imageData.match(/data:(image\/\w+);base64,/)?.[1] || 'image/jpeg'

        const imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }

        // Wrap in timeout to prevent Netlify function timeout
        const prompt = `Analyze this meal photo and provide a detailed nutritional analysis with per-item breakdown.

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "foodItems": [
    {
      "name": "food item name",
      "portion": "amount with unit (e.g., 6 oz, 1 cup, 150g)",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "fiber": number
    }
  ],
  "totalCalories": number (sum of all food items),
  "totalMacros": {
    "protein": number (sum of all items),
    "carbs": number (sum of all items),
    "fat": number (sum of all items),
    "fiber": number (sum of all items)
  },
  "confidence": number (0-100),
  "suggestions": ["suggestion1", "suggestion2", ...],
  "suggestedMealType": "breakfast|lunch|dinner|snack"
}

Guidelines:
- Provide detailed breakdown for EACH visible food item separately
- Include specific portion sizes (weight or volume) for each item
- Calculate calories and macros per item using USDA nutrition database standards
- Be conservative with estimates (better to underestimate than overestimate)
- Confidence should reflect image quality and food visibility
- Provide 1-3 actionable, positive suggestions for the overall meal
- All macro values in grams
- Detect meal type based on the food items (e.g., pancakes/eggs = breakfast, sandwich = lunch, steak = dinner, fruit/chips = snack)
- User specified this as: ${mealType || 'unspecified'}, but analyze independently
- For mixed dishes (e.g., stir-fry, casserole), break down into main components when possible`

        // Add 8-second timeout to stay under Netlify's 10-second function limit
        const result = await Promise.race([
          model.generateContent([prompt, imagePart]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API timeout after 8 seconds')), 8000)
          )
        ]) as any

        const response = result.response
        const text = response.text()

        logger.debug('Gemini response received')

        // Remove markdown code blocks if present
        const jsonContent = text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim()

        analysis = JSON.parse(jsonContent)
        logger.debug('Analysis parsed successfully', { analysis })
      }
    } catch (error) {
      logger.error('❌ Gemini API Error - Falling back to mock data:', error as Error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: errorMessage,
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined
      })
      ErrorHandler.handle(error, {
        operation: 'gemini_meal_analysis',
        userId,
        component: 'api/ai/analyze-meal',
        severity: 'warning'
      })
      dataSource = 'mock_api_error'
      diagnosticError = errorMessage
      analysis = getMockAnalysis()
    }

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

    return NextResponse.json({
      success: true,
      data: {
        ...analysis,
        foodItems: validatedFoodItems,
        title,
        usdaValidation: usdaMessages.length > 0 ? usdaMessages : undefined
      },
      _diagnostics: {
        isRealAnalysis: dataSource === 'gemini',
        dataSource,
        timestamp: new Date().toISOString(),
        error: diagnosticError,
        model: dataSource === 'gemini' ? 'gemini-1.5-flash-latest' : undefined
      }
    })

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