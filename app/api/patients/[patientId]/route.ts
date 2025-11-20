/**
 * API Route: /api/patients/[patientId]
 *
 * Handles individual patient operations
 * GET - Get a single patient by ID
 * PUT - Update a patient
 * DELETE - Delete a patient
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { patientProfileSchema } from '@/lib/validations/medical'
import { authorizePatientAccess } from '@/lib/rbac-middleware'
import type { PatientProfile, AuthorizationResult } from '@/types/medical'

// GET /api/patients/[patientId] - Get a single patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Extract and verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('[API /patients/[id] GET] Missing or invalid Authorization header')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    logger.debug('[API /patients/[id] GET] Fetching patient', { userId, patientId })

    // Get patient document
    const patientRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      logger.warn('[API /patients/[id] GET] Patient not found', { userId, patientId })
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      )
    }

    const patient: PatientProfile = {
      id: patientDoc.id,
      ...patientDoc.data()
    } as PatientProfile

    logger.info('[API /patients/[id] GET] Patient fetched successfully', { userId, patientId })

    return NextResponse.json({
      success: true,
      data: patient
    })

  } catch (error: any) {
    logger.error('[API /patients/[id] GET] Error fetching patient', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch patient' },
      { status: 500 }
    )
  }
}

// PUT /api/patients/[patientId] - Update a patient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Check authorization - requires editPatientProfile permission for family members
    const authResult = await authorizePatientAccess(request, patientId, 'editPatientProfile')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, role } = authResult as AuthorizationResult

    // Parse request body
    const body = await request.json()
    logger.debug('[API /patients/[id] PUT] Request body', { body, userId, role })

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

    // Get existing patient
    const patientRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      logger.warn('[API /patients/[id] PUT] Patient not found', { userId: ownerUserId, patientId })
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      )
    }

    // Merge updates with existing data
    const existingPatient = patientDoc.data() as PatientProfile
    const now = new Date().toISOString()

    const updatedPatient: PatientProfile = {
      ...existingPatient,
      ...body,
      id: patientId,
      userId,
      createdAt: existingPatient.createdAt,
      lastModified: now
    }

    // Validate merged data
    const validationResult = patientProfileSchema.safeParse(updatedPatient)
    if (!validationResult.success) {
      logger.warn('[API /patients/[id] PUT] Validation failed', {
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

    // Update patient
    await patientRef.update({
      ...body,
      lastModified: now
    })

    logger.info('[API /patients/[id] PUT] Patient updated successfully', { userId, patientId })

    return NextResponse.json({
      success: true,
      data: validationResult.data
    })

  } catch (error: any) {
    logger.error('[API /patients/[id] PUT] Error updating patient', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update patient' },
      { status: 500 }
    )
  }
}

// DELETE /api/patients/[patientId] - Delete a patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Extract and verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('[API /patients/[id] DELETE] Missing or invalid Authorization header')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    logger.debug('[API /patients/[id] DELETE] Deleting patient', { userId, patientId })

    // Get patient reference
    const patientRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      logger.warn('[API /patients/[id] DELETE] Patient not found', { userId, patientId })
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      )
    }

    // Delete patient document
    // Note: In production, you may want to soft-delete or archive instead
    await patientRef.delete()

    logger.info('[API /patients/[id] DELETE] Patient deleted successfully', { userId, patientId })

    return NextResponse.json({
      success: true,
      message: 'Patient deleted successfully'
    })

  } catch (error: any) {
    logger.error('[API /patients/[id] DELETE] Error deleting patient', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete patient' },
      { status: 500 }
    )
  }
}
