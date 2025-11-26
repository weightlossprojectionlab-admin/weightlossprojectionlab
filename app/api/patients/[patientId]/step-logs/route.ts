import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { StepLog } from '@/types/medical'

/**
 * GET /api/patients/[patientId]/step-logs
 * Get step logs for a specific patient
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
    const source = searchParams.get('source')
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
      .collection('step-logs')
      .orderBy('date', 'desc')
      .limit(limit)

    const snapshot = await query.get()

    let stepLogs: StepLog[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as StepLog[]

    // Filter by source if provided
    if (source) {
      stepLogs = stepLogs.filter((log) => log.source === source)
    }

    // Filter by date range if provided
    if (startDate) {
      stepLogs = stepLogs.filter((log) => log.date >= startDate)
    }
    if (endDate) {
      stepLogs = stepLogs.filter((log) => log.date <= endDate)
    }

    return NextResponse.json({ data: stepLogs })
  } catch (error) {
    console.error('Error fetching step logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch step logs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/patients/[patientId]/step-logs
 * Create a new step log for a patient
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
    if (!body.steps || !body.date) {
      return NextResponse.json(
        { error: 'Steps and date are required' },
        { status: 400 }
      )
    }

    // Check for existing log on the same date with same source
    const existingLogsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .collection('step-logs')
      .where('date', '==', body.date)
      .where('source', '==', body.source || 'manual')
      .limit(1)
      .get()

    if (!existingLogsSnapshot.empty) {
      // Update existing log instead of creating duplicate
      const existingDoc = existingLogsSnapshot.docs[0]
      const updateData: any = {
        steps: body.steps,
        loggedAt: new Date().toISOString(),
        synced: body.synced || false,
      }

      // Only add optional fields if they have values
      if (body.distance) updateData.distance = body.distance
      if (body.calories) updateData.calories = body.calories
      if (body.activeMinutes) updateData.activeMinutes = body.activeMinutes
      if (body.floors) updateData.floors = body.floors
      if (body.notes) updateData.notes = body.notes
      if (body.synced) updateData.lastSyncedAt = new Date().toISOString()

      await existingDoc.ref.update(updateData)

      const updatedDoc = await existingDoc.ref.get()
      return NextResponse.json({
        data: {
          id: updatedDoc.id,
          ...updatedDoc.data(),
        },
      })
    }

    const stepLog: any = {
      patientId,
      userId,
      steps: body.steps,
      date: body.date,
      source: body.source || 'manual',
      loggedAt: new Date().toISOString(),
      loggedBy: userId,
      synced: body.synced || false,
    }

    // Only add optional fields if they have values (Firestore doesn't accept undefined)
    if (body.distance) stepLog.distance = body.distance
    if (body.calories) stepLog.calories = body.calories
    if (body.activeMinutes) stepLog.activeMinutes = body.activeMinutes
    if (body.floors) stepLog.floors = body.floors
    if (body.deviceId) stepLog.deviceId = body.deviceId
    if (body.notes) stepLog.notes = body.notes
    if (body.synced) stepLog.lastSyncedAt = new Date().toISOString()

    const docRef = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .collection('step-logs')
      .add(stepLog)

    return NextResponse.json({
      data: {
        id: docRef.id,
        ...stepLog,
      },
    })
  } catch (error) {
    console.error('Error creating step log:', error)
    return NextResponse.json(
      { error: 'Failed to create step log' },
      { status: 500 }
    )
  }
}
