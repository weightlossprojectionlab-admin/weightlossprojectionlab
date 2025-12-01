import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { WeightLog } from '@/types/medical'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { errorResponse } from '@/lib/api-response'

/**
 * GET /api/patients/[patientId]/weight-logs
 * Get weight logs for a specific patient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, patientId, 'viewVitals')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId } = authResult as AssertPatientAccessResult

    // Build query using owner's collection
    let query = adminDb
      .collection('users')
      .doc(ownerUserId)
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
    return errorResponse(error, {
      route: '/api/patients/[patientId]/weight-logs',
      operation: 'fetch'
    })
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
    const { patientId } = await params
    const body = await request.json()

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, patientId, 'logVitals')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId } = authResult as AssertPatientAccessResult

    // Get patient document from owner's collection
    const patientDoc = await adminDb
      .collection('users')
      .doc(ownerUserId)
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
      .doc(ownerUserId)
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
    return errorResponse(error, {
      route: '/api/patients/[patientId]/weight-logs',
      operation: 'create'
    })
  }
}
