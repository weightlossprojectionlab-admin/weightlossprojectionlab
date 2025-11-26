import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { MealLog } from '@/types/medical'

/**
 * GET /api/patients/[patientId]/meal-logs
 * Get meal logs for a specific patient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    // Extract and verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const { patientId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30')
    const mealType = searchParams.get('mealType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Verify patient belongs to user
    const patientDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .get()

    if (!patientDoc.exists) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Build query
    let query = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .collection('meal-logs')
      .orderBy('loggedAt', 'desc')
      .limit(limit)

    const snapshot = await query.get()

    let mealLogs: MealLog[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MealLog[]

    // Filter by meal type if provided
    if (mealType) {
      mealLogs = mealLogs.filter((log) => log.mealType === mealType)
    }

    // Filter by date range if provided
    if (startDate) {
      mealLogs = mealLogs.filter(
        (log) => new Date(log.loggedAt) >= new Date(startDate)
      )
    }
    if (endDate) {
      mealLogs = mealLogs.filter(
        (log) => new Date(log.loggedAt) <= new Date(endDate)
      )
    }

    return NextResponse.json({ success: true, data: mealLogs })
  } catch (error) {
    console.error('Error fetching meal logs:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch meal logs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/patients/[patientId]/meal-logs
 * Create a new meal log for a patient
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    // Extract and verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const { patientId } = await params
    const body = await request.json()

    // Verify patient belongs to user
    const patientDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .get()

    if (!patientDoc.exists) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Validate required fields
    if (!body.mealType) {
      return NextResponse.json(
        { error: 'Meal type is required' },
        { status: 400 }
      )
    }

    const mealLog: any = {
      patientId,
      userId,
      mealType: body.mealType,
      foodItems: body.foodItems || [],
      loggedAt: body.loggedAt || new Date().toISOString(),
      loggedBy: userId,
      tags: body.tags || [],
      aiAnalyzed: body.aiAnalyzed || false,
    }

    // Only add optional fields if they have values (Firestore doesn't accept undefined)
    if (body.description) mealLog.description = body.description
    if (body.photoUrl) mealLog.photoUrl = body.photoUrl
    if (body.photoHash) mealLog.photoHash = body.photoHash
    if (body.calories) mealLog.calories = body.calories
    if (body.protein) mealLog.protein = body.protein
    if (body.carbs) mealLog.carbs = body.carbs
    if (body.fat) mealLog.fat = body.fat
    if (body.fiber) mealLog.fiber = body.fiber
    if (body.consumedAt) mealLog.consumedAt = body.consumedAt
    if (body.notes) mealLog.notes = body.notes
    if (body.location) mealLog.location = body.location
    if (body.aiConfidence) mealLog.aiConfidence = body.aiConfidence

    const docRef = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .collection('meal-logs')
      .add(mealLog)

    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        ...mealLog,
      },
    })
  } catch (error) {
    console.error('Error creating meal log:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create meal log' },
      { status: 500 }
    )
  }
}
