import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { removeUndefinedValues } from '@/lib/firestore-helpers'
import { logger } from '@/lib/logger'
import { authorizePatientAccess, assertPatientAccess } from '@/lib/rbac-middleware'
import type { PatientMedication } from '@/types/medical'
import { errorResponse } from '@/lib/api-response'

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

    // Check patient access and get authorization
    const authResult = await authorizePatientAccess(request, patientId, 'viewMedicalRecords')

    // If authResult is a Response (error), return it
    if (authResult instanceof Response) {
      return authResult
    }

    // Get the patient owner's userId for querying
    const accessInfo = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (accessInfo instanceof Response) {
      return accessInfo
    }

    // Fetch medications from owner's patient subcollection
    const medicationsSnapshot = await adminDb
      .collection('users')
      .doc(accessInfo.ownerUserId)
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
  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/medications',
      operation: 'fetch'
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

    // Check patient access and get authorization
    const authResult = await authorizePatientAccess(request, patientId, 'editMedications')

    // If authResult is a Response (error), return it
    if (authResult instanceof Response) {
      return authResult
    }

    // Get the patient owner's userId for querying
    const accessInfo = await assertPatientAccess(request, patientId, 'editMedications')
    if (accessInfo instanceof Response) {
      return accessInfo
    }

    // Parse request body
    const medicationData = await request.json()

    // Verify patient exists in owner's collection
    const patientDoc = await adminDb
      .collection('users')
      .doc(accessInfo.ownerUserId)
      .collection('patients')
      .doc(patientId)
      .get()

    if (!patientDoc.exists) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Check for duplicate medications
    // A duplicate is defined as: same name AND same strength
    const existingMedicationsSnapshot = await adminDb
      .collection('users')
      .doc(accessInfo.ownerUserId)
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
      .doc(accessInfo.ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('medications')
      .doc()

    const now = new Date()

    // Build medication object
    const medicationData_full = {
      id: medicationRef.id,
      patientId,
      userId: accessInfo.ownerUserId,
      ...medicationData,
      addedAt: now.toISOString(),
      addedBy: accessInfo.userId,
      lastModified: now.toISOString()
    }

    // Remove undefined values (Firestore doesn't accept undefined)
    const medication = removeUndefinedValues(medicationData_full)

    await medicationRef.set(medication)

    logger.info('[Medications API] Medication added', { patientId, medicationId: medication.id })

    return NextResponse.json({ success: true, data: medication }, { status: 201 })
  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/medications',
      operation: 'create'
    })
  }
}
