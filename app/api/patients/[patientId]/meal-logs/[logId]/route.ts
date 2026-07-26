import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { errorResponse } from '@/lib/api-response'

/**
 * PUT /api/patients/[patientId]/meal-logs/[logId]
 * Update a specific meal log for a patient. Mirrors the POST create shape
 * (fields are set individually — no blind spread — so only known columns are
 * written) but merges onto the existing doc. RBAC via assertPatientAccess with
 * the same 'logVitals' permission the create path uses.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; logId: string }> }
) {
  try {
    const { patientId, logId } = await params
    const body = await request.json()

    const authResult = await assertPatientAccess(request, patientId, 'logVitals')
    if (authResult instanceof Response) {
      return authResult
    }
    const { ownerUserId } = authResult as AssertPatientAccessResult

    const docRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('meal-logs')
      .doc(logId)

    const existing = await docRef.get()
    if (!existing.exists) {
      return NextResponse.json({ error: 'Meal log not found' }, { status: 404 })
    }

    // Only set fields that were provided (Firestore rejects undefined). Uses
    // !== undefined so a value can be cleared (e.g. notes: '') or zeroed.
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    const assign = (key: string) => {
      if (body[key] !== undefined) update[key] = body[key]
    }
    ;['mealType', 'foodItems', 'description', 'photoUrl', 'calories', 'protein',
      'carbs', 'fat', 'fiber', 'consumedAt', 'notes', 'location', 'tags',
      'source', 'sourceRefs', 'allergenExposure'].forEach(assign)

    await docRef.set(update, { merge: true })

    const saved = await docRef.get()
    return NextResponse.json({ success: true, data: { id: saved.id, ...saved.data() } })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/meal-logs/[logId]',
      operation: 'update',
    })
  }
}

/**
 * DELETE /api/patients/[patientId]/meal-logs/[logId]
 * Delete a specific meal log for a patient
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; logId: string }> }
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

    const { patientId, logId } = await params

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

    // Delete the meal log
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .collection('meal-logs')
      .doc(logId)
      .delete()

    return NextResponse.json({
      success: true,
      message: 'Meal log deleted successfully',
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/meal-logs/[logId]',
      operation: 'delete'
    })
  }
}
