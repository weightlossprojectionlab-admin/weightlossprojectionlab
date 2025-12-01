import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { removeUndefinedValues } from '@/lib/firestore-helpers'
import { logger } from '@/lib/logger'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import type { PatientMedication } from '@/types/medical'
import { errorResponse } from '@/lib/api-response'

/**
 * PATCH /api/patients/[patientId]/medications/[medicationId]
 * Update a medication
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; medicationId: string }> }
) {
  try {
    const { patientId, medicationId } = await params

    // Verify auth
    // Check patient access with RBAC
    const authResult = await assertPatientAccess(request, patientId, 'editMedications')
    if (authResult instanceof Response) return authResult

    const { userId, ownerUserId } = authResult

    // Parse update data
    const updates = await request.json()

    // Update medication in owner's patient subcollection
    const medicationRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('medications')
      .doc(medicationId)

    const medicationDoc = await medicationRef.get()
    if (!medicationDoc.exists) {
      return NextResponse.json({ error: 'Medication not found' }, { status: 404 })
    }

    // Remove undefined values and add lastModified timestamp
    const filteredUpdates = removeUndefinedValues({
      ...updates,
      lastModified: new Date().toISOString()
    })

    await medicationRef.update(filteredUpdates)

    // Fetch updated document
    const updatedDoc = await medicationRef.get()
    const medication = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as PatientMedication

    logger.info('[Medications API] Medication updated', { patientId, medicationId })

    return NextResponse.json({ success: true, data: medication })
  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/medications/[medicationId]',
      operation: 'patch'
    })
  }
}

/**
 * DELETE /api/patients/[patientId]/medications/[medicationId]
 * Delete a medication
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; medicationId: string }> }
) {
  try {
    const { patientId, medicationId } = await params

    // Verify auth and check patient access with RBAC
    const authResult = await assertPatientAccess(request, patientId, 'editMedications')
    if (authResult instanceof Response) return authResult

    const { userId, ownerUserId } = authResult

    const medicationRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('medications')
      .doc(medicationId)

    // Get the medication data before deleting for audit trail
    const medicationDoc = await medicationRef.get()
    const medicationData = medicationDoc.data()

    // Archive the medication to deletedMedications subcollection for audit trail
    await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('deletedMedications')
      .doc(medicationId)
      .set({
        ...medicationData,
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
        originalId: medicationId
      })

    // Now delete from active medications
    await medicationRef.delete()

    logger.info('[Medications API] Medication deleted and archived', {
      patientId,
      medicationId,
      deletedBy: userId,
      medicationName: medicationData?.name
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/medications/[medicationId]',
      operation: 'delete'
    })
  }
}
