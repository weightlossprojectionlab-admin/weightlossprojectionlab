import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminAuth } from '@/lib/firebase-admin'
import { generateMealTitle } from '@/lib/meal-title-utils'
import { batchValidateWithUSDA } from '@/lib/usda-nutrition'
import { logger } from '@/lib/logger'
import { aiRateLimit, dailyRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit'
import { ErrorHandler } from '@/lib/utils/error-handler'
import { errorResponse } from '@/lib/api-response'

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
    return errorResponse(authError, {
      route: '/api/ai/analyze-meal',
      operation: 'create'
    })
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