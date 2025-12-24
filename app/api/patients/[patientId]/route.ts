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

    const patientData = patientDoc.data()
    const patient: PatientProfile = {
      id: patientDoc.id,
      ...patientData
    } as PatientProfile

    // DEBUG: Log what we're returning
    console.log('[API /patients/[id] GET] Returning patient data:', {
      patientId,
      hasPreferences: !!patientData?.preferences,
      vitalReminders: patientData?.preferences?.vitalReminders,
      fullPreferences: JSON.stringify(patientData?.preferences, null, 2)
    })

    logger.info('[API /patients/[id] GET] Patient fetched successfully', { userId, ownerUserId, patientId })

    return NextResponse.json({
      success: true,
      data: patient
    })

  } catch (error: any) {
    logger.error('[API /patients/[id] GET] Error fetching patient', error, {
      patientId: await params.then(p => p.patientId),
      errorMessage: error.message,
      errorStack: error.stack
    })
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch patient', details: error.stack },
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

    // Update patient - merge preferences if present
    const updateData: any = {
      lastModified: now
    }

    // Add only the fields from body (don't spread entire objects with Timestamps)
    if (body.preferences) updateData.preferences = mergedPreferences
    if (body.emergencyContacts) updateData.emergencyContacts = body.emergencyContacts
    if (body.photo) updateData.photo = body.photo
    if (body.healthConditions) updateData.healthConditions = body.healthConditions
    if (body.foodAllergies) updateData.foodAllergies = body.foodAllergies
    if (body.conditionDetails) updateData.conditionDetails = body.conditionDetails
    if (body.medications) updateData.medications = body.medications
    if (body.dietaryPreferences) updateData.dietaryPreferences = body.dietaryPreferences
    if (body.lifestyle) updateData.lifestyle = body.lifestyle
    if (body.bodyMeasurements) updateData.bodyMeasurements = body.bodyMeasurements

    await patientRef.update(updateData)

    logger.info('[API /patients/[id] PUT] Patient updated successfully', { userId, ownerUserId, patientId })

    // Return the merged patient data
    return NextResponse.json({
      success: true,
      data: { ...existingPatient, ...updateData, id: patientId }
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

    const patientData = patientDoc.data()
    if (!patientData) {
      logger.error('[API /patients/[id] DELETE] Patient document exists but has no data', undefined, { userId, ownerUserId, patientId })
      return NextResponse.json(
        { success: false, error: 'Patient data not found' },
        { status: 404 }
      )
    }

    // Parse request body for deletion reason (optional but recommended)
    let deletionReason = 'No reason provided'
    try {
      const body = await request.json()
      if (body.reason) {
        deletionReason = body.reason
      }
    } catch {
      // Body parsing failed - continue with default reason
    }

    // Soft delete: Update status instead of hard delete
    // This preserves data for HIPAA 6-year retention requirement
    const deletionData = {
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      deletedBy: userId,
      deletionReason: deletionReason
    }

    await patientRef.update(deletionData)

    // Create audit log for deletion (HIPAA compliance)
    try {
      const auditLogRef = adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('auditLogs')
        .doc()

      await auditLogRef.set({
        entityType: 'patient',
        entityId: patientId,
        entityName: patientData.name || 'Unknown Patient',
        patientId: patientId,
        userId: ownerUserId,
        action: 'deleted',
        performedBy: userId,
        performedByName: patientData.name || 'Unknown',
        performedAt: new Date().toISOString(),
        changes: [{
          field: 'status',
          oldValue: patientData.status || 'active',
          newValue: 'deleted',
          fieldLabel: 'Patient Status',
          dataType: 'string'
        }],
        metadata: {
          deletionReason: deletionReason,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })
    } catch (auditError: any) {
      // Log but don't fail the operation if audit logging fails
      logger.error('[API /patients/[id] DELETE] Failed to create audit log', auditError instanceof Error ? auditError : undefined)
    }

    logger.info('[API /patients/[id] DELETE] Patient soft-deleted successfully', {
      userId,
      ownerUserId,
      patientId,
      reason: deletionReason
    })

    return NextResponse.json({
      success: true,
      message: 'Patient archived successfully. Data will be retained for 30 days before permanent deletion.'
    })

  } catch (error: any) {
    logger.error('[API /patients/[id] DELETE] Error deleting patient', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete patient' },
      { status: 500 }
    )
  }
}
