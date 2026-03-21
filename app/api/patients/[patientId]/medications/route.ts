import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { removeUndefinedValues } from '@/lib/firestore-helpers'
import { logger } from '@/lib/logger'
import { assertPatientAccess } from '@/lib/rbac-middleware'
import { errorResponse, notFoundResponse } from '@/lib/api-response'
import type { PatientMedication } from '@/types/medical'
import { sendNotificationToFamilyMembers } from '@/lib/notification-service'

/**
 * GET /api/patients/[patientId]/medications
 * Get all medications for a patient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Check patient access with RBAC
    const authResult = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (authResult instanceof Response) return authResult

    const { ownerUserId } = authResult

    // Fetch medications from owner's patient subcollection
    const medicationsSnapshot = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('medications')
      .orderBy('addedAt', 'desc')
      .get()

    const medications: PatientMedication[] = medicationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      addedAt: doc.data().addedAt?.toDate?.()?.toISOString() || doc.data().addedAt,
      lastModified: doc.data().lastModified?.toDate?.()?.toISOString() || doc.data().lastModified,
      fillDate: doc.data().fillDate?.toDate?.()?.toISOString() || doc.data().fillDate,
      expirationDate: doc.data().expirationDate?.toDate?.()?.toISOString() || doc.data().expirationDate,
      scannedAt: doc.data().scannedAt?.toDate?.()?.toISOString() || doc.data().scannedAt
    })) as PatientMedication[]

    logger.debug('[Medications API] Fetched medications', { patientId, count: medications.length })

    return NextResponse.json({ success: true, data: medications })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/medications',
      operation: 'list'
    })
  }
}

/**
 * POST /api/patients/[patientId]/medications
 * Add a new medication for a patient
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Check patient access with RBAC
    const authResult = await assertPatientAccess(request, patientId, 'editMedications')
    if (authResult instanceof Response) return authResult

    const { userId, ownerUserId } = authResult

    // Parse request body
    const medicationData = await request.json()

    // Verify patient exists in owner's collection
    const patientDoc = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .get()

    if (!patientDoc.exists) {
      return notFoundResponse('Patient')
    }

    // Check for duplicate medications
    // A duplicate is defined as: same name AND same strength
    const existingMedicationsSnapshot = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('medications')
      .get()

    const isDuplicate = existingMedicationsSnapshot.docs.some(doc => {
      const existing = doc.data()
      const sameName = existing.name?.toLowerCase().trim() === medicationData.name?.toLowerCase().trim()
      const sameStrength = existing.strength?.toLowerCase().trim() === medicationData.strength?.toLowerCase().trim()
      return sameName && sameStrength
    })

    if (isDuplicate) {
      logger.warn('[Medications API] Duplicate medication detected', {
        patientId,
        name: medicationData.name,
        strength: medicationData.strength
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate medication',
          details: `${medicationData.name} (${medicationData.strength}) is already in the medication list.`
        },
        { status: 409 } // 409 Conflict
      )
    }

    // Create medication document in owner's patient subcollection
    const medicationRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('medications')
      .doc()

    const now = new Date()

    // Build medication object
    const medicationData_full = {
      id: medicationRef.id,
      patientId,
      userId: ownerUserId,
      ...medicationData,
      addedAt: now.toISOString(),
      addedBy: userId,
      lastModified: now.toISOString()
    }

    // Remove undefined values (Firestore doesn't accept undefined)
    const medication = removeUndefinedValues(medicationData_full)

    await medicationRef.set(medication)

    logger.info('[Medications API] Medication added', { patientId, medicationId: medication.id })

    // Trigger notification to family members
    try {
      // Get patient name and user name for notification
      const userDoc = await adminDb.collection('users').doc(userId).get()
      const userName = userDoc.exists ? userDoc.data()?.name || userDoc.data()?.email : 'Unknown User'

      await sendNotificationToFamilyMembers({
        userId: '', // Will be overridden for each recipient
        patientId,
        type: 'medication_added',
        priority: 'normal',
        title: 'New Medication Added',
        message: `${userName} added a new medication`,
        excludeUserId: userId,
        metadata: {
          medicationId: medicationRef.id,
          actionBy: userName,
          actionByUserId: userId,
          patientName: patientDoc.data()?.name || 'Patient',
          medicationName: medication.name,
          strength: medication.strength,
          prescribedFor: medication.prescribedFor
        }
      })
    } catch (notificationError) {
      // Log error but don't fail the main operation
      logger.error('[Medications API] Error sending notification', notificationError as Error, {
        patientId,
        medicationId: medication.id
      })
    }

    return NextResponse.json({ success: true, data: medication }, { status: 201 })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/medications',
      operation: 'create'
    })
  }
}
