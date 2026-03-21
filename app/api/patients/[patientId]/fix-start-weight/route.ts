import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { errorResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-response'
import { assertPatientAccess } from '@/lib/rbac-middleware'

/**
 * One-time API endpoint to fix missing startWeight for a patient
 * This endpoint finds the patient's first weight log and sets goals.startWeight to match it
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  if (process.env.NODE_ENV === 'production') {
    return forbiddenResponse('Not available in production')
  }

  try {
    const { patientId } = await params

    // Verify authentication and patient access
    const authResult = await assertPatientAccess(request, patientId)
    if (authResult instanceof Response) return authResult
    const { ownerUserId } = authResult

    // Get patient document
    const patientDoc = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .get()

    if (!patientDoc.exists) {
      return notFoundResponse('Patient')
    }

    const patientData = patientDoc.data()
    const currentStartWeight = patientData?.goals?.startWeight
    const isPet = patientData?.type === 'pet'

    let firstWeight: number | null = null
    let source = ''

    if (isPet) {
      // For pets, check vitals collection instead of weightLogs
      const vitalsSnapshot = await adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(patientId)
        .collection('vitals')
        .orderBy('timestamp', 'asc')
        .limit(1)
        .get()

      if (!vitalsSnapshot.empty) {
        const firstVital = vitalsSnapshot.docs[0].data()
        firstWeight = firstVital.weight || firstVital.petVitals?.weight || null
        source = 'vitals'
      }
    } else {
      // For humans: check vitals first (current system), then legacy weightLogs
      // 1. Check vitals collection (primary — where QuickWeightModal and VitalsWizard write)
      const vitalsSnapshot = await adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(patientId)
        .collection('vitals')
        .where('type', '==', 'weight')
        .limit(5)
        .get()

      if (!vitalsSnapshot.empty) {
        const weightVitals = vitalsSnapshot.docs
          .map(d => d.data())
          .filter(d => typeof d.value === 'number' && d.value > 0)
          .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())

        if (weightVitals.length > 0) {
          firstWeight = weightVitals[0].value as number
          source = 'vitals'
        }
      }

      // 2. Fallback: check legacy weightLogs collection
      if (!firstWeight) {
        const weightLogsSnapshot = await adminDb
          .collection('users')
          .doc(ownerUserId)
          .collection('patients')
          .doc(patientId)
          .collection('weightLogs')
          .orderBy('loggedAt', 'asc')
          .limit(1)
          .get()

        if (!weightLogsSnapshot.empty) {
          const firstWeightLog = weightLogsSnapshot.docs[0].data()
          firstWeight = firstWeightLog.weight
          source = 'weightLog'
        }
      }
    }

    // Fallback: check currentWeight field (legacy)
    if (!firstWeight && patientData?.currentWeight && patientData.currentWeight > 0) {
      firstWeight = patientData.currentWeight
      source = 'currentWeight'
    }

    // If still no weight found, return error
    if (!firstWeight) {
      return notFoundResponse(`Weight data for this ${isPet ? 'pet' : 'patient'}`)
    }

    // Only update if current startWeight is missing or unrealistic
    // For pets, any positive number is valid; for humans, >= 10 lbs
    const minValidWeight = isPet ? 0.1 : 10
    if (currentStartWeight && currentStartWeight >= minValidWeight) {
      return NextResponse.json({
        message: 'Start weight is already set and valid, no update needed',
        currentStartWeight,
        firstWeight,
        isPet
      })
    }

    // Update the goals.startWeight
    await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .update({
        'goals.startWeight': firstWeight
      })

    return NextResponse.json({
      success: true,
      message: `Start weight updated successfully from ${source}`,
      oldStartWeight: currentStartWeight || null,
      newStartWeight: firstWeight,
      source,
      isPet
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/fix-start-weight',
      operation: 'create'
    })
  }
}
