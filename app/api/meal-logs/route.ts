import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

interface AIAnalysis {
  foods: Array<{
    name: string
    portion: string
    calories: number
    confidence: number
  }>
  totalCalories: number
  macros: {
    carbs: number
    protein: number
    fat: number
  }
  nutritionalHighlights: string[]
  suggestions: string[]
  confidence: number
}

interface MealLog {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  photoUrl?: string
  aiAnalysis?: AIAnalysis
  manualEntries?: Array<{
    food: string
    calories: number
    quantity: string
  }>
  totalCalories: number
  macros: {
    carbs: number
    protein: number
    fat: number
  }
  loggedAt: Timestamp
  source: 'photo' | 'manual' | 'hybrid'
  notes?: string
}

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const mealType = searchParams.get('mealType')

    // Build Firestore query
    const mealLogsRef = adminDb.collection('users').doc(userId).collection('mealLogs')
    let queryRef = mealLogsRef.orderBy('loggedAt', 'desc')

    // Add filters if provided
    if (startDate) {
      queryRef = queryRef.where('loggedAt', '>=', new Date(startDate))
    }
    if (endDate) {
      queryRef = queryRef.where('loggedAt', '<=', new Date(endDate))
    }
    if (mealType && ['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
      queryRef = queryRef.where('mealType', '==', mealType)
    }

    // Limit results
    queryRef = queryRef.limit(limit)

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
    console.error('Error fetching meal logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meal logs' },
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

    // Parse request body
    const body = await request.json()
    const {
      mealType,
      photoUrl,
      aiAnalysis,
      manualEntries,
      notes,
      loggedAt
    } = body

    // Validate required fields
    if (!mealType) {
      return NextResponse.json(
        { error: 'Meal type is required' },
        { status: 400 }
      )
    }

    // Validate meal type
    if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType)) {
      return NextResponse.json(
        { error: 'Invalid meal type' },
        { status: 400 }
      )
    }

    // Validate that we have either AI analysis or manual entries
    if (!aiAnalysis && (!manualEntries || manualEntries.length === 0)) {
      return NextResponse.json(
        { error: 'Either AI analysis or manual entries are required' },
        { status: 400 }
      )
    }

    // Calculate totals
    let totalCalories = 0
    let macros = { carbs: 0, protein: 0, fat: 0 }
    let source: 'photo' | 'manual' | 'hybrid' = 'manual'

    if (aiAnalysis) {
      totalCalories += aiAnalysis.totalCalories || 0
      macros.carbs += aiAnalysis.macros?.carbs || 0
      macros.protein += aiAnalysis.macros?.protein || 0
      macros.fat += aiAnalysis.macros?.fat || 0
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
    const mealLogData: MealLog = {
      mealType,
      photoUrl: photoUrl || undefined,
      aiAnalysis: aiAnalysis || undefined,
      manualEntries: manualEntries || undefined,
      totalCalories,
      macros,
      loggedAt: loggedAt ? Timestamp.fromDate(new Date(loggedAt)) : Timestamp.now(),
      source,
      notes: notes || undefined
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
    console.error('Error creating meal log:', error)
    return NextResponse.json(
      { error: 'Failed to create meal log' },
      { status: 500 }
    )
  }
}