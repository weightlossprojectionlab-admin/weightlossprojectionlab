/**
 * API Route: /api/patients/[patientId]
 *
 * Handles individual patient operations
 * GET - Get a single patient by ID
 * PUT - Update a patient
 * DELETE - Delete a patient
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { patientProfileSchema } from '@/lib/validations/medical'
import { assertPatientAccess, authorizePatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import type { PatientProfile, AuthorizationResult } from '@/types/medical'
import { errorResponse } from '@/lib/api-response'

// GET /api/patients/[patientId] - Get a single patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id] GET] Rate limit exceeded', { userId, patientId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    logger.debug('[API /patients/[id] GET] Fetching patient', { userId, ownerUserId, patientId })

    // Get patient document (using ownerUserId supports family member access)
    const patientRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      logger.warn('[API /patients/[id] GET] Patient not found', { userId, ownerUserId, patientId })
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      )
    }

    const patient: PatientProfile = {
      id: patientDoc.id,
      ...patientDoc.data()
    } as PatientProfile

    logger.info('[API /patients/[id] GET] Patient fetched successfully', { userId, ownerUserId, patientId })

    return NextResponse.json({
      success: true,
      data: patient
    })

  } catch (error: any) {
    return errorResponse(error: any, {
      route: '/api/patients/[patientId]',
      operation: 'fetch'
    })
  }
}

// PUT /api/patients/[patientId] - Update a patient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, patientId, 'editPatientProfile')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId, role } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id] PUT] Rate limit exceeded', { userId, patientId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Parse request body
    const body = await request.json()
    logger.debug('[API /patients/[id] PUT] Request body', { body, userId, ownerUserId, role })

    // Get existing patient
    const patientRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      logger.warn('[API /patients/[id] PUT] Patient not found', { userId, ownerUserId, patientId })
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

    logger.info('[API /patients/[id] PUT] Patient updated successfully', { userId, ownerUserId, patientId })

    return NextResponse.json({
      success: true,
      data: validationResult.data
    })

  } catch (error: any) {
    return errorResponse(error: any, {
      route: '/api/patients/[patientId]',
      operation: 'update'
    })
  }
}

// DELETE /api/patients/[patientId] - Delete a patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Check authorization and get owner userId (requires deletePatient permission)
    const authResult = await assertPatientAccess(request, patientId, 'deletePatient')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user, stricter for delete operations)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id] DELETE] Rate limit exceeded', { userId, patientId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    logger.debug('[API /patients/[id] DELETE] Deleting patient', { userId, ownerUserId, patientId })

    // Get patient reference (using ownerUserId supports family member access)
    const patientRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      logger.warn('[API /patients/[id] DELETE] Patient not found', { userId, ownerUserId, patientId })
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      )
    }

    // Delete patient document
    // Note: In production, you may want to soft-delete or archive instead
    await patientRef.delete()

    logger.info('[API /patients/[id] DELETE] Patient deleted successfully', { userId, ownerUserId, patientId })

    return NextResponse.json({
      success: true,
      message: 'Patient deleted successfully'
    })

  } catch (error: any) {
    return errorResponse(error: any, {
      route: '/api/patients/[patientId]',
      operation: 'delete'
    })
  }
}
