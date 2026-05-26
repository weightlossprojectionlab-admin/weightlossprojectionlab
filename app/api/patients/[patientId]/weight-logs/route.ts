import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { WeightLog } from '@/types/medical'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { errorResponse } from '@/lib/api-response'

/**
 * Canonical weight-log API for patient-scoped weight tracking.
 *
 * STORAGE MODEL (one question, one answer):
 *   - Weight logs:    users/{ownerUserId}/weightLogs       (this collection
 *                     is what /progress, WeightTrendChart, and
 *                     /api/projection all read)
 *   - Starting point: patients.goals.startWeight            (set ONCE on
 *                     the first ever weight log, baseline for projection)
 *   - Live cache:     patients.currentWeight                (last logged
 *                     value, kept fresh for fast reads)
 *
 * Everything that records a weight — Vitals wizard, WeightLogForm,
 * QuickWeightLogModal, Bluetooth scale sync — should land here. See
 * the DRY consolidation rationale in feedback_one_question_one_answer
 * and feedback_rule_first_then_ml.
 */

const WEIGHT_LOGS_PATH = (ownerUserId: string) =>
  adminDb.collection('users').doc(ownerUserId).collection('weightLogs')

/**
 * GET /api/patients/[patientId]/weight-logs
 * Get weight logs for a specific patient (reads canonical collection).
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

    // Build query against the canonical user-scoped weightLogs collection.
    // Filter to this patient when patientId is stored on the docs.
    let query = WEIGHT_LOGS_PATH(ownerUserId)
      .where('patientId', '==', patientId)
      .orderBy('loggedAt', 'desc')
      .limit(limit)

    const snapshot = await query.get()

    const weightLogs: WeightLog[] = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        loggedAt: data.loggedAt?.toDate
          ? data.loggedAt.toDate().toISOString()
          : data.loggedAt,
      }
    }) as WeightLog[]

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

    return NextResponse.json({ success: true, data: filteredLogs })
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

    const patientRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
    const patientDoc = await patientRef.get()
    if (!patientDoc.exists) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Validate required fields
    const weight = typeof body.weight === 'number' ? body.weight : parseFloat(body.weight)
    if (!weight || Number.isNaN(weight) || weight <= 0 || !body.unit) {
      return NextResponse.json(
        { error: 'Weight (positive number) and unit are required' },
        { status: 400 }
      )
    }

    const patientData = patientDoc.data()
    const loggedAtDate = body.loggedAt ? new Date(body.loggedAt) : new Date()

    // 1. Write the weight log to the canonical user-scoped collection.
    //    Stamp patientId so the GET can filter, loggedBy so caregiver
    //    logs are auditable. loggedAt as Firestore Timestamp so
    //    range queries on /progress and /api/projection work.
    const weightLog: any = {
      patientId,
      userId, // logger (may differ from ownerUserId for caregivers)
      loggedBy: userId,
      weight,
      unit: body.unit,
      loggedAt: Timestamp.fromDate(loggedAtDate),
      dataSource: body.source || body.dataSource || 'manual',
      tags: body.tags || [],
    }
    if (body.notes) weightLog.notes = body.notes
    if (body.bodyFat) weightLog.bodyFat = body.bodyFat
    if (body.deviceId) weightLog.deviceId = body.deviceId
    if (body.photoUrl) weightLog.photoUrl = body.photoUrl

    const docRef = await WEIGHT_LOGS_PATH(ownerUserId).add(weightLog)

    // 2. Cache currentWeight + set startWeight baseline (once, on the
    //    first ever weight log). The previous vitals-API code path
    //    owned this responsibility; it now lives here so weight has
    //    exactly one writer.
    const profileUpdate: Record<string, any> = {
      currentWeight: weight,
      weightUnit: body.unit,
    }
    const existingStart = patientData?.goals?.startWeight
    if (!existingStart || existingStart <= 0) {
      profileUpdate['goals.startWeight'] = weight
    }
    await patientRef.update(profileUpdate)

    // The shared apiClient gates on { success: true } even for 200
    // responses (see lib/api-client.ts:187). Omitting it makes a
    // successful write look like "Request failed" to the caller and
    // bubbles a fake error into the wizard. Keep this envelope to
    // match every other route in the app.
    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        ...weightLog,
        loggedAt: loggedAtDate.toISOString(), // ISO for the client
      },
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/weight-logs',
      operation: 'create'
    })
  }
}
