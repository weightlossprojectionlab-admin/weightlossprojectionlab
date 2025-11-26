import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { WeightLog } from '@/types/medical'

/**
 * GET /api/patients/[patientId]/weight-logs
 * Get weight logs for a specific patient
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
      .collection('weight-logs')
      .orderBy('loggedAt', 'desc')
      .limit(limit)

    const snapshot = await query.get()

    const weightLogs: WeightLog[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WeightLog[]

    // Filter by date range if provided
    let filteredLogs = weightLogs
    if (startDate) {
      filteredLogs = filteredLogs.filter(
        (log) => new Date(log.loggedAt) >= new Date(startDate)
      )
    }
    if (endDate) {
      filteredLogs = filteredLogs.filter(
        (log) => new Date(log.loggedAt) <= new Date(endDate)
      )
    }

    return NextResponse.json({ data: filteredLogs })
  } catch (error) {
    console.error('Error fetching weight logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weight logs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/patients/[patientId]/weight-logs
 * Create a new weight log for a patient
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
    if (!body.weight || !body.unit) {
      return NextResponse.json(
        { error: 'Weight and unit are required' },
        { status: 400 }
      )
    }

    // Calculate BMI if patient has dateOfBirth (for humans)
    const patientData = patientDoc.data()
    let bmi: number | undefined
    if (patientData?.type === 'human' && patientData?.dateOfBirth) {
      // BMI calculation would require height, which we'd need to add to patient profile
      // For now, skip BMI calculation
      bmi = undefined
    }

    const weightLog: any = {
      patientId,
      userId,
      weight: body.weight,
      unit: body.unit,
      loggedAt: body.loggedAt || new Date().toISOString(),
      loggedBy: userId,
      source: body.source || 'manual',
      tags: body.tags || [],
    }

    // Only add optional fields if they have values (Firestore doesn't accept undefined)
    if (body.notes) weightLog.notes = body.notes
    if (body.bodyFat) weightLog.bodyFat = body.bodyFat
    if (bmi) weightLog.bmi = bmi
    if (body.deviceId) weightLog.deviceId = body.deviceId

    const docRef = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .collection('weight-logs')
      .add(weightLog)

    return NextResponse.json({
      data: {
        id: docRef.id,
        ...weightLog,
      },
    })
  } catch (error) {
    console.error('Error creating weight log:', error)
    return NextResponse.json(
      { error: 'Failed to create weight log' },
      { status: 500 }
    )
  }
}
