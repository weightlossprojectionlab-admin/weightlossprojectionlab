import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { removeUndefinedValues } from '@/lib/firestore-helpers'
import { logger } from '@/lib/logger'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import type { PatientMedication, MedicationImage, MedicationAuditLog, MedicationFieldChange } from '@/types/medical'
import { sendNotificationToFamilyMembers } from '@/lib/notification-service'

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

    const oldMedication = medicationDoc.data() as PatientMedication

    // Validate images array if present
    if (updates.images) {
      if (!Array.isArray(updates.images)) {
        return NextResponse.json({ error: 'Images must be an array' }, { status: 400 })
      }

      // Validate each image object
      for (const img of updates.images) {
        if (!img.id || !img.url || !img.storagePath) {
          return NextResponse.json(
            { error: 'Invalid image data: missing required fields (id, url, storagePath)' },
            { status: 400 }
          )
        }
      }
    }

    // Remove undefined values and add lastModified timestamp
    const filteredUpdates = removeUndefinedValues({
      ...updates,
      lastModified: new Date().toISOString(),
      lastModifiedBy: userId
    })

    // Calculate field changes for audit log
    const changes: MedicationFieldChange[] = []
    const fieldLabels: Record<string, string> = {
      name: 'Medication Name',
      brandName: 'Brand Name',
      strength: 'Strength',
      dosageForm: 'Dosage Form',
      frequency: 'Dosage Instructions',
      prescribedFor: 'Prescribed For',
      prescribingDoctor: 'Prescribing Doctor',
      rxNumber: 'Rx Number',
      quantity: 'Quantity',
      refills: 'Refills',
      fillDate: 'Fill Date',
      expirationDate: 'Expiration Date',
      pharmacyName: 'Pharmacy Name',
      pharmacyPhone: 'Pharmacy Phone',
      notes: 'Notes',
      images: 'Prescription Images'
    }

    for (const [field, newValue] of Object.entries(filteredUpdates)) {
      if (field === 'lastModified' || field === 'lastModifiedBy') continue

      const oldValue = oldMedication[field as keyof PatientMedication]

      // Skip if values are the same
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue

      let dataType: MedicationFieldChange['dataType'] = 'string'
      if (typeof newValue === 'number') dataType = 'number'
      else if (typeof newValue === 'boolean') dataType = 'boolean'
      else if (Array.isArray(newValue)) dataType = 'array'
      else if (newValue && typeof newValue === 'object') dataType = 'object'
      else if (field.includes('Date')) dataType = 'date'

      changes.push({
        field,
        fieldLabel: fieldLabels[field] || field,
        oldValue: Array.isArray(oldValue) ? oldValue.length : oldValue,
        newValue: Array.isArray(newValue) ? newValue.length : newValue,
        dataType
      })
    }

    await medicationRef.update(filteredUpdates)

    // Create audit log entry if there are changes
    if (changes.length > 0) {
      try {
        // Get user and patient info for audit log
        const userDoc = await adminDb.collection('users').doc(userId).get()
        const userName = userDoc.exists ? userDoc.data()?.name || userDoc.data()?.email : 'Unknown User'

        const patientRef = adminDb
          .collection('users')
          .doc(ownerUserId)
          .collection('patients')
          .doc(patientId)
        const patientSnapshot = await patientRef.get()
        const patientName = patientSnapshot.exists ? patientSnapshot.data()?.name || 'Patient' : 'Patient'

        const auditLog: Omit<MedicationAuditLog, 'id'> = {
          medicationId,
          patientId,
          userId: ownerUserId,
          action: 'updated',
          performedBy: userId,
          performedByName: userName,
          performedAt: new Date().toISOString(),
          changes,
          patientName,
          medicationName: filteredUpdates.name || oldMedication.name
        }

        await medicationRef
          .collection('auditLogs')
          .add(auditLog)

        logger.info('[Medications API] Audit log created', {
          patientId,
          medicationId,
          changesCount: changes.length
        })
      } catch (auditError) {
        // Log error but don't fail the main operation
        logger.error('[Medications API] Error creating audit log', auditError as Error, {
          patientId,
          medicationId
        })
      }
    }

    // Fetch updated document
    const updatedDoc = await medicationRef.get()
    const medication = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as PatientMedication

    logger.info('[Medications API] Medication updated', { patientId, medicationId })

    // Trigger notification to family members
    try {
      // Get patient and user info for notification
      const patientRef = adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(patientId)
      const patientSnapshot = await patientRef.get()
      const userDoc = await adminDb.collection('users').doc(userId).get()
      const userName = userDoc.exists ? userDoc.data()?.name || userDoc.data()?.email : 'Unknown User'

      await sendNotificationToFamilyMembers({
        userId: '', // Will be overridden for each recipient
        patientId,
        type: 'medication_updated',
        priority: 'normal',
        title: 'Medication Updated',
        message: `${userName} updated medication information`,
        excludeUserId: userId,
        metadata: {
          medicationId: medicationId,
          actionBy: userName,
          actionByUserId: userId,
          patientName: patientSnapshot.data()?.name || 'Patient',
          medicationName: medication.name,
          strength: medication.strength
        }
      })
    } catch (notificationError) {
      // Log error but don't fail the main operation
      logger.error('[Medications API] Error sending notification', notificationError as Error, {
        patientId,
        medicationId
      })
    }

    return NextResponse.json({ success: true, data: medication })
  } catch (error: any) {
    logger.error('[Medications API] Error updating medication', error as Error)
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

    // Trigger notification to family members
    try {
      // Get patient and user info for notification
      const patientRef = adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(patientId)
      const patientSnapshot = await patientRef.get()
      const userDoc = await adminDb.collection('users').doc(userId).get()
      const userName = userDoc.exists ? userDoc.data()?.name || userDoc.data()?.email : 'Unknown User'

      await sendNotificationToFamilyMembers({
        userId: '', // Will be overridden for each recipient
        patientId,
        type: 'medication_deleted',
        priority: 'normal',
        title: 'Medication Removed',
        message: `${userName} removed a medication`,
        excludeUserId: userId,
        metadata: {
          medicationId: medicationId,
          actionBy: userName,
          actionByUserId: userId,
          patientName: patientSnapshot.data()?.name || 'Patient',
          medicationName: medicationData?.name || 'Unknown medication'
        }
      })
    } catch (notificationError) {
      // Log error but don't fail the main operation
      logger.error('[Medications API] Error sending notification', notificationError as Error, {
        patientId,
        medicationId
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('[Medications API] Error deleting medication', error as Error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete medication', details: error.message },
      { status: 500 }
    )
  }
}
