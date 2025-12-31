import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { errorResponse } from '@/lib/api-response'

/**
 * One-time API endpoint to fix missing startWeight for a patient
 * This endpoint finds the patient's first weight log and sets goals.startWeight to match it
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const { patientId } = await params

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get patient document
    const patientDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .get()

    if (!patientDoc.exists) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
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
        .doc(userId)
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
      // For humans, check weightLogs
      const weightLogsSnapshot = await adminDb
        .collection('users')
        .doc(userId)
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

    // Fallback: check currentWeight field (legacy)
    if (!firstWeight && patientData?.currentWeight && patientData.currentWeight > 0) {
      firstWeight = patientData.currentWeight
      source = 'currentWeight'
    }

    // If still no weight found, return error
    if (!firstWeight) {
      return NextResponse.json({
        error: `No weight data found for this ${isPet ? 'pet' : 'patient'}. Please record their first weight measurement.`,
        isPet
      }, { status: 404 })
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
      .doc(userId)
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
