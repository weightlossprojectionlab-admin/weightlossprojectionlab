/**
 * /api/patients/[patientId]/equipment
 *
 * GET — list medical equipment for a patient (newest acquiredAt first; null acquiredAt last)
 * POST — create a new equipment record
 *
 * Storage path: users/{ownerUserId}/patients/{patientId}/equipment/{id}
 *
 * Phase C of the medical-binder gap close. Mirrors the immunizations
 * route shape — same RBAC gates, same envelope, same per-item DELETE
 * pattern at /[id]/route.ts.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { MedicalEquipment } from '@/types/medical'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { errorResponse } from '@/lib/api-response'
import { v4 as uuidv4 } from 'uuid'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  try {
    const { patientId } = await params

    const authResult = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (authResult instanceof Response) return authResult
    const { ownerUserId } = authResult as AssertPatientAccessResult

    // Order by addedAt rather than acquiredAt — acquiredAt is
    // optional, and Firestore orderBy excludes docs missing the
    // ordered field.
    const snapshot = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('equipment')
      .orderBy('addedAt', 'desc')
      .get()

    const equipment: MedicalEquipment[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MedicalEquipment[]

    return NextResponse.json({ success: true, data: equipment })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/equipment',
      operation: 'list',
    })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  try {
    const { patientId } = await params
    const body = await request.json()

    const authResult = await assertPatientAccess(request, patientId, 'editMedications')
    if (authResult instanceof Response) return authResult
    const { userId, ownerUserId } = authResult as AssertPatientAccessResult

    const patientDoc = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .get()
    if (!patientDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 },
      )
    }

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 },
      )
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    const record: MedicalEquipment = {
      id,
      patientId,
      userId: ownerUserId,
      name: body.name.trim(),
      source: body.source === 'spreadsheet-import' || body.source === 'ocr' ? body.source : 'manual',
      addedAt: now,
      addedBy: userId,
    }

    if (body.type) record.type = String(body.type)
    if (body.manufacturer) record.manufacturer = String(body.manufacturer)
    if (body.model) record.model = String(body.model)
    if (body.serialNumber) record.serialNumber = String(body.serialNumber)
    if (body.prescribedBy) record.prescribedBy = String(body.prescribedBy)
    if (body.acquiredAt) record.acquiredAt = String(body.acquiredAt)
    if (body.nextMaintenanceAt) record.nextMaintenanceAt = String(body.nextMaintenanceAt)
    if (body.notes) record.notes = String(body.notes)
    if (body.importBatchId) record.importBatchId = String(body.importBatchId)

    await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('equipment')
      .doc(id)
      .set(record)

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/equipment',
      operation: 'create',
    })
  }
}
