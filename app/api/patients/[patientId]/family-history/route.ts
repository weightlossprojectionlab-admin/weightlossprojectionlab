/**
 * /api/patients/[patientId]/family-history
 *
 * GET — list family-history entries for a patient (newest first)
 * POST — create a new family-history entry
 *
 * Storage path: users/{ownerUserId}/patients/{patientId}/family-history/{id}
 *
 * Phase D of the medical-binder gap close. Genetic / familial risk
 * factors that inform the patient's own surveillance plan
 * (cardiovascular, oncologic, etc.). Distinct from the patient's
 * own conditions on PatientProfile.healthConditions and from
 * household relationships (those are separate Patient records).
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FamilyHistoryEntry, FamilyRelationship } from '@/types/medical'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { errorResponse } from '@/lib/api-response'
import { v4 as uuidv4 } from 'uuid'

const VALID_RELATIONSHIPS: FamilyRelationship[] = [
  'mother',
  'father',
  'sibling',
  'maternal_grandparent',
  'paternal_grandparent',
  'aunt_uncle',
  'child',
  'other',
]

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
      .collection('family-history')
      .orderBy('addedAt', 'desc')
      .get()

    const entries: FamilyHistoryEntry[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FamilyHistoryEntry[]

    return NextResponse.json({ success: true, data: entries })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/family-history',
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

    if (!body.relativeRelationship || !VALID_RELATIONSHIPS.includes(body.relativeRelationship)) {
      return NextResponse.json(
        { success: false, error: 'relativeRelationship is required and must be a valid value' },
        { status: 400 },
      )
    }
    if (!body.condition || typeof body.condition !== 'string') {
      return NextResponse.json(
        { success: false, error: 'condition is required' },
        { status: 400 },
      )
    }

    const id = uuidv4()
    const now = new Date().toISOString()

    const record: FamilyHistoryEntry = {
      id,
      patientId,
      userId: ownerUserId,
      relativeRelationship: body.relativeRelationship,
      condition: body.condition.trim(),
      source: body.source === 'spreadsheet-import' || body.source === 'ocr' ? body.source : 'manual',
      addedAt: now,
      addedBy: userId,
    }

    if (typeof body.ageOfOnset === 'number' && body.ageOfOnset >= 0) record.ageOfOnset = body.ageOfOnset
    if (typeof body.isLiving === 'boolean') record.isLiving = body.isLiving
    if (body.causeOfDeath) record.causeOfDeath = String(body.causeOfDeath)
    if (body.notes) record.notes = String(body.notes)
    if (body.importBatchId) record.importBatchId = String(body.importBatchId)

    await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('family-history')
      .doc(id)
      .set(record)

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/family-history',
      operation: 'create',
    })
  }
}
