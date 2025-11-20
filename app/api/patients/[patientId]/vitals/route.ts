/**
 * API Route: /api/patients/[patientId]/vitals
 *
 * Handles vital sign operations for a specific patient
 * GET - List all vital signs for the patient (with optional filtering)
 * POST - Log a new vital sign reading
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { vitalSignFormSchema } from '@/lib/validations/medical'
import { authorizePatientAccess } from '@/lib/rbac-middleware'
import type { VitalSign, AuthorizationResult } from '@/types/medical'
import { v4 as uuidv4 } from 'uuid'

// GET /api/patients/[patientId]/vitals - List vital signs with optional filtering
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params
    const { searchParams } = new URL(request.url)

    // Check authorization - requires viewVitals permission for family members
    const authResult = await authorizePatientAccess(request, patientId, 'viewVitals')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, role } = authResult as AuthorizationResult

    // Parse query parameters
    const type = searchParams.get('type')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    logger.debug('[API /patients/[id]/vitals GET] Fetching vitals', {
      userId,
      patientId,
      role,
      type,
      limit,
      startDate,
      endDate
    })

    // Get patient owner's userId (for database query)
    let ownerUserId = userId
    if (role === 'family') {
      // Find the patient's owner
      const patientSnapshot = await adminDb
        .collectionGroup('patients')
        .where('__name__', '==', patientId)
        .limit(1)
        .get()

      if (patientSnapshot.empty) {
        return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 })
      }

      // Extract owner userId from the path
      const patientDocRef = patientSnapshot.docs[0].ref
      ownerUserId = patientDocRef.parent.parent!.id
    }

    // Ensure ownerUserId is defined
    if (!ownerUserId) {
      return NextResponse.json(
        { success: false, error: 'Unable to determine patient owner' },
        { status: 400 }
      )
    }

    // Get patient reference
    const patientRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)

    // Build query
    let vitalsQuery = patientRef
      .collection('vitals')
      .orderBy('recordedAt', 'desc')

    // Apply filters
    if (type) {
      vitalsQuery = vitalsQuery.where('type', '==', type)
    }

    if (startDate) {
      vitalsQuery = vitalsQuery.where('recordedAt', '>=', startDate)
    }

    if (endDate) {
      vitalsQuery = vitalsQuery.where('recordedAt', '<=', endDate)
    }

    if (limit) {
      vitalsQuery = vitalsQuery.limit(limit)
    }

    // Execute query
    const snapshot = await vitalsQuery.get()

    const vitals: VitalSign[] = snapshot.docs.map(doc => ({
      id: doc.id,
      patientId,
      ...doc.data()
    })) as VitalSign[]

    logger.info('[API /patients/[id]/vitals GET] Vitals fetched successfully', {
      userId,
      patientId,
      count: vitals.length
    })

    return NextResponse.json({
      success: true,
      data: vitals
    })

  } catch (error: any) {
    logger.error('[API /patients/[id]/vitals GET] Error fetching vitals', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch vitals' },
      { status: 500 }
    )
  }
}

// POST /api/patients/[patientId]/vitals - Log a new vital sign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Check authorization - requires logVitals permission for family members
    const authResult = await authorizePatientAccess(request, patientId, 'logVitals')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, role } = authResult as AuthorizationResult

    // Ensure userId is defined
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID not found in authorization result' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    logger.debug('[API /patients/[id]/vitals POST] Request body', { body, userId, role })

    // Get patient owner's userId (for database query)
    let ownerUserId = userId
    if (role === 'family') {
      // Find the patient's owner
      const patientSnapshot = await adminDb
        .collectionGroup('patients')
        .where('__name__', '==', patientId)
        .limit(1)
        .get()

      if (patientSnapshot.empty) {
        return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 })
      }

      // Extract owner userId from the path
      const patientDocRef = patientSnapshot.docs[0].ref
      ownerUserId = patientDocRef.parent.parent!.id
    }

    // Ensure ownerUserId is defined
    if (!ownerUserId) {
      return NextResponse.json(
        { success: false, error: 'Unable to determine patient owner' },
        { status: 400 }
      )
    }

    // Get patient reference
    const patientRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)

    // Validate vital sign data
    const validationResult = vitalSignFormSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('[API /patients/[id]/vitals POST] Validation failed', {
        errors: validationResult.error.format()
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.format()
        },
        { status: 400 }
      )
    }

    const vitalData = validationResult.data

    // Create vital sign document
    const vitalId = uuidv4()
    const now = new Date().toISOString()

    const newVital: VitalSign = {
      id: vitalId,
      patientId,
      ...vitalData,
      recordedAt: vitalData.recordedAt || now,
      takenBy: userId,
      method: vitalData.method || 'manual'
    }

    const vitalRef = patientRef.collection('vitals').doc(vitalId)
    await vitalRef.set(newVital)

    logger.info('[API /patients/[id]/vitals POST] Vital sign logged successfully', {
      userId,
      patientId,
      vitalId,
      type: newVital.type
    })

    return NextResponse.json({
      success: true,
      data: newVital
    }, { status: 201 })

  } catch (error: any) {
    logger.error('[API /patients/[id]/vitals POST] Error logging vital sign', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to log vital sign' },
      { status: 500 }
    )
  }
}
