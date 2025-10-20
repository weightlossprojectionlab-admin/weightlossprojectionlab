import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminAuth } from '@/lib/firebase-admin'
import { generateMealTitle } from '@/lib/meal-title-utils'
import { batchValidateWithUSDA } from '@/lib/usda-nutrition'

// Rate limiting for Gemini free tier: 10 req/min, 500 req/day
const rateLimiter = {
  minuteRequests: [] as number[],
  dailyRequests: [] as number[],

  canMakeRequest(): { allowed: boolean; reason?: string } {
    const now = Date.now()
    const oneMinuteAgo = now - 60 * 1000
    const oneDayAgo = now - 24 * 60 * 60 * 1000

    // Clean old requests
    this.minuteRequests = this.minuteRequests.filter(t => t > oneMinuteAgo)
    this.dailyRequests = this.dailyRequests.filter(t => t > oneDayAgo)

    // Check limits
    if (this.minuteRequests.length >= 10) {
      return { allowed: false, reason: 'Rate limit: 10 requests per minute. Please try again in a moment.' }
    }
    if (this.dailyRequests.length >= 500) {
      return { allowed: false, reason: 'Daily limit reached: 500 requests per day. Using fallback analysis.' }
    }

    return { allowed: true }
  },

  recordRequest() {
    const now = Date.now()
    this.minuteRequests.push(now)
    this.dailyRequests.push(now)
  }
}

// Fallback mock data if Gemini fails
const getMockAnalysis = () => {
  const mockFoods = [
    { foods: ['Grilled chicken breast', 'Brown rice', 'Steamed broccoli'], calories: 420, protein: 35, carbs: 45, fat: 8, fiber: 6 },
    { foods: ['Salmon fillet', 'Quinoa', 'Roasted vegetables'], calories: 485, protein: 38, carbs: 42, fat: 18, fiber: 8 },
    { foods: ['Turkey sandwich', 'Whole wheat bread', 'Lettuce', 'Tomato'], calories: 340, protein: 24, carbs: 38, fat: 12, fiber: 5 },
    { foods: ['Greek yogurt', 'Mixed berries', 'Granola'], calories: 220, protein: 15, carbs: 28, fat: 6, fiber: 4 },
    { foods: ['Avocado toast', 'Poached egg', 'Cherry tomatoes'], calories: 380, protein: 14, carbs: 32, fat: 22, fiber: 8 }
  ]

  const randomFood = mockFoods[Math.floor(Math.random() * mockFoods.length)]

  const hour = new Date().getHours()
  let suggestedType: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'lunch'
  if (hour >= 5 && hour < 11) suggestedType = 'breakfast'
  else if (hour >= 11 && hour < 15) suggestedType = 'lunch'
  else if (hour >= 15 && hour < 21) suggestedType = 'dinner'
  else suggestedType = 'snack'

  return {
    foodItems: randomFood.foods,
    totalCalories: randomFood.calories + Math.floor(Math.random() * 100) - 50,
    totalMacros: {
      protein: randomFood.protein + Math.floor(Math.random() * 10) - 5,
      carbs: randomFood.carbs + Math.floor(Math.random() * 10) - 5,
      fat: randomFood.fat + Math.floor(Math.random() * 5) - 2,
      fiber: randomFood.fiber + Math.floor(Math.random() * 3) - 1
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

    try {
      // Verify the Firebase ID token
      const decodedToken = await adminAuth.verifyIdToken(token)
      console.log('✅ Authenticated user:', decodedToken.uid)
    } catch (authError) {
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { imageData, mealType } = body

    console.log('Received request:', {
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

    try {
      // Check rate limits first
      const rateLimitCheck = rateLimiter.canMakeRequest()

      if (!process.env.GEMINI_API_KEY) {
        console.warn('⚠️ GEMINI_API_KEY not set, using mock data')
        analysis = getMockAnalysis()
      } else if (!rateLimitCheck.allowed) {
        console.warn(`⚠️ ${rateLimitCheck.reason}`)
        analysis = getMockAnalysis()
      } else {
        console.log('🤖 Calling Google Gemini Vision API...')
        rateLimiter.recordRequest()

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        // Convert base64 image to Gemini format
        // Remove the data:image/jpeg;base64, prefix
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')

        const imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: imageData.match(/data:(image\/\w+);base64,/)?.[1] || 'image/jpeg'
          }
        }

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

        const result = await model.generateContent([prompt, imagePart])
        const response = result.response
        const text = response.text()

        console.log('✅ Gemini response received')

        // Remove markdown code blocks if present
        const jsonContent = text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim()

        analysis = JSON.parse(jsonContent)
        console.log('✅ Analysis parsed successfully:', analysis)
      }
    } catch (error) {
      console.error('❌ Gemini analysis failed, using mock data:', error)
      analysis = getMockAnalysis()
    }

    // Validate AI-generated nutrition data with USDA database
    console.log('🔍 Validating nutrition data with USDA...')
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
        const totalCalories = validatedFoodItems.reduce((sum, item) => sum + item.calories, 0)
        const totalProtein = validatedFoodItems.reduce((sum, item) => sum + item.protein, 0)
        const totalCarbs = validatedFoodItems.reduce((sum, item) => sum + item.carbs, 0)
        const totalFat = validatedFoodItems.reduce((sum, item) => sum + item.fat, 0)
        const totalFiber = validatedFoodItems.reduce((sum, item) => sum + item.fiber, 0)

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

        console.log(`✅ USDA validation complete: ${usdaVerifiedCount}/${validationResults.length} items verified`)
      }
    } catch (error) {
      console.error('⚠️ USDA validation failed, using AI data:', error)
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
      }
    })

  } catch (error) {
    console.error('Meal analysis error:', error)

    return NextResponse.json(
      {
        error: 'Failed to analyze meal. Please try again or enter manually.',
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