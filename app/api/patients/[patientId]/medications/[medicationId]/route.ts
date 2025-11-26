import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { removeUndefinedValues } from '@/lib/firestore-helpers'
import { logger } from '@/lib/logger'
import { authorizePatientAccess } from '@/lib/rbac-middleware'
import type { PatientMedication } from '@/types/medical'

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
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Check patient access
    const auth = await authorizePatientAccess(userId, patientId)
    if (!auth.authorized || !auth.permissions?.editMedications) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse update data
    const updates = await request.json()

    // Update medication in user's patient subcollection
    const medicationRef = adminDb
      .collection('users')
      .doc(userId)
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
    logger.error('[Medications API] Error updating medication', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update medication', details: error.message },
      { status: 500 }
    )
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

    // Verify auth
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Check patient access
    const auth = await authorizePatientAccess(request, patientId)
    if (auth instanceof Response) {
      return auth
    }

    // Check if user is owner OR has editMedications permission
    const canEdit = auth.role === 'owner' || auth.permissions?.editMedications
    if (!canEdit) {
      return NextResponse.json({ error: 'Access denied - editMedications permission required' }, { status: 403 })
    }

    const medicationRef = adminDb
      .collection('users')
      .doc(auth.ownerUserId)
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
      .doc(auth.ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('deletedMedications')
      .doc(medicationId)
      .set({
        ...medicationData,
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
        deletedByEmail: decodedToken.email || 'unknown',
        originalId: medicationId
      })

    // Now delete from active medications
    await medicationRef.delete()

    logger.info('[Medications API] Medication deleted and archived', {
      patientId,
      medicationId,
      deletedBy: userId,
      deletedByEmail: decodedToken.email,
      medicationName: medicationData?.name
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('[Medications API] Error deleting medication', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete medication', details: error.message },
      { status: 500 }
    )
  }
}
