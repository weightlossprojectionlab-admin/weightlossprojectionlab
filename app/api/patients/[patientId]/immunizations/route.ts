/**
 * /api/patients/[patientId]/immunizations
 *
 * GET — list immunizations for a patient (newest administeredAt first)
 * POST — create a new immunization record
 *
 * Storage path: users/{ownerUserId}/patients/{patientId}/immunizations/{id}
 *
 * Phase B of the medical-binder gap close. Provider model is the
 * structural reference (per-patient simple-CRUD entity, no
 * time-series aggregation).
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Immunization } from '@/types/medical'
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

    const snapshot = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('immunizations')
      .orderBy('administeredAt', 'desc')
      .get()

    const immunizations: Immunization[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Immunization[]

    return NextResponse.json({ success: true, data: immunizations })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/immunizations',
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

    // Verify patient exists in the owner's subcollection.
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

    if (!body.vaccineName || typeof body.vaccineName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'vaccineName is required' },
        { status: 400 },
      )
    }
    if (!body.administeredAt || typeof body.administeredAt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'administeredAt is required' },
        { status: 400 },
      )
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    const record: Immunization = {
      id,
      patientId,
      userId: ownerUserId,
      vaccineName: body.vaccineName.trim(),
      administeredAt: body.administeredAt,
      source: body.source === 'spreadsheet-import' || body.source === 'ocr' ? body.source : 'manual',
      addedAt: now,
      addedBy: userId,
    }

    if (typeof body.doseNumber === 'number' && body.doseNumber > 0) record.doseNumber = body.doseNumber
    if (body.lotNumber) record.lotNumber = String(body.lotNumber)
    if (body.administeredBy) record.administeredBy = String(body.administeredBy)
    if (body.nextDueAt) record.nextDueAt = String(body.nextDueAt)
    if (body.notes) record.notes = String(body.notes)
    if (body.importBatchId) record.importBatchId = String(body.importBatchId)

    await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('immunizations')
      .doc(id)
      .set(record)

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/immunizations',
      operation: 'create',
    })
  }
}
