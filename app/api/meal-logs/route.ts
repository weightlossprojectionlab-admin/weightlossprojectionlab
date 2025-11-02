import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { generateSearchKeywords } from '@/lib/meal-title-utils'
import { logger } from '@/lib/logger'
import { ErrorHandler } from '@/lib/utils/error-handler'
import {
  CreateMealLogRequestSchema,
  GetMealLogsQuerySchema,
} from '@/lib/validations/meal-logs'
import { z } from 'zod'

// GET - Retrieve meal logs for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]

    // Verify the token and get user info
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      limit: searchParams.get('limit'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      mealType: searchParams.get('mealType'),
    }

    // Validate with Zod
    const validatedQuery = GetMealLogsQuerySchema.parse(queryParams)

    // Build Firestore query
    const mealLogsRef = adminDb.collection('users').doc(userId).collection('mealLogs')
    let queryRef = mealLogsRef.orderBy('loggedAt', 'desc')

    // Add filters if provided
    if (validatedQuery.startDate) {
      queryRef = queryRef.where('loggedAt', '>=', new Date(validatedQuery.startDate))
    }
    if (validatedQuery.endDate) {
      queryRef = queryRef.where('loggedAt', '<=', new Date(validatedQuery.endDate))
    }
    if (validatedQuery.mealType) {
      queryRef = queryRef.where('mealType', '==', validatedQuery.mealType)
    }

    // Limit results
    queryRef = queryRef.limit(validatedQuery.limit)

    // Execute query
    const snapshot = await queryRef.get()
    const mealLogs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      loggedAt: doc.data().loggedAt.toDate().toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: mealLogs,
      count: mealLogs.length
    })

  } catch (error) {
    ErrorHandler.handle(error, {
      operation: 'fetch_meal_logs',
      component: 'api/meal-logs',
      userId: 'unknown'
    })

    const userMessage = ErrorHandler.getUserMessage(error)
    return NextResponse.json(
      { error: userMessage },
      { status: 500 }
    )
  }
}

// POST - Create new meal log
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]

    // Verify the token and get user info
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Parse and validate request body
    const body = await request.json()

    // Validate with Zod
    const validatedData = CreateMealLogRequestSchema.parse(body)

    const {
      mealType,
      photoUrl,
      aiAnalysis,
      manualEntries,
      notes,
      loggedAt
    } = validatedData

    // Calculate totals
    let totalCalories = 0
    let macros = { carbs: 0, protein: 0, fat: 0, fiber: 0 }
    let source: 'photo' | 'manual' | 'hybrid' = 'manual'

    if (aiAnalysis) {
      // Use totalCalories as canonical field (Gemini new format)
      totalCalories += aiAnalysis.totalCalories || 0

      // Use totalMacros as canonical field (Gemini new format)
      const aiMacros = aiAnalysis.totalMacros || {}
      macros.carbs += aiMacros.carbs || 0
      macros.protein += aiMacros.protein || 0
      macros.fat += aiMacros.fat || 0
      macros.fiber += aiMacros.fiber || 0
      source = 'photo'
    }

    if (manualEntries && manualEntries.length > 0) {
      const manualCalories = manualEntries.reduce((sum: number, entry: any) =>
        sum + (entry.calories || 0), 0)
      totalCalories += manualCalories

      if (source === 'photo') {
        source = 'hybrid'
      }
    }

    // Create meal log data
    // Note: Firestore doesn't accept undefined values, so only add fields that exist
    const mealLogData: any = {
      mealType,
      totalCalories,
      macros,
      loggedAt: loggedAt ? Timestamp.fromDate(new Date(loggedAt)) : Timestamp.now(),
      source,
    }

    // Only add optional fields if they have values
    if (photoUrl) {
      mealLogData.photoUrl = photoUrl
    }
    if (aiAnalysis) {
      mealLogData.aiAnalysis = aiAnalysis
    }
    if (manualEntries && manualEntries.length > 0) {
      mealLogData.manualEntries = manualEntries
    }
    if (notes) {
      mealLogData.notes = notes
    }

    // Generate title and search keywords if AI analysis has title
    if (aiAnalysis?.title) {
      mealLogData.title = aiAnalysis.title

      // Generate search keywords from food items, title, and notes
      const foodItems = aiAnalysis.foodItems || []
      mealLogData.searchKeywords = generateSearchKeywords(foodItems, aiAnalysis.title, notes)
    }

    // Add to Firestore
    const mealLogsRef = adminDb.collection('users').doc(userId).collection('mealLogs')
    const docRef = await mealLogsRef.add(mealLogData)

    // Return the created log with the ID
    const createdLog = {
      id: docRef.id,
      ...mealLogData,
      loggedAt: mealLogData.loggedAt.toDate().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: createdLog,
      message: 'Meal log created successfully'
    }, { status: 201 })

  } catch (error) {
    ErrorHandler.handle(error, {
      operation: 'create_meal_log',
      component: 'api/meal-logs',
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