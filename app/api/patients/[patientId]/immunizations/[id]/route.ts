/**
 * /api/patients/[patientId]/immunizations/[id]
 *
 * DELETE — remove a single immunization record.
 *
 * Phase B of the medical-binder gap close. Mirrors the per-id
 * delete pattern used by other patient subcollections.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { errorResponse } from '@/lib/api-response'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; id: string }> },
) {
  try {
    const { patientId, id } = await params

    const authResult = await assertPatientAccess(request, patientId, 'editMedications')
    if (authResult instanceof Response) return authResult
    const { ownerUserId } = authResult as AssertPatientAccessResult

    const docRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('immunizations')
      .doc(id)

    const snapshot = await docRef.get()
    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, error: 'Immunization not found' },
        { status: 404 },
      )
    }

    await docRef.delete()

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/immunizations/[id]',
      operation: 'delete',
    })
  }
}
