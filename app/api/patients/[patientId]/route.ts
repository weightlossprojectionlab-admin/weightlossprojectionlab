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
import { errorResponse, notFoundResponse } from '@/lib/api-response'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import type { PatientProfile, AuthorizationResult } from '@/types/medical'
import { mergePatientPreferences } from '@/lib/services/patient-preferences'
import { writeAuditEntry, writeAuditEntries, PATIENT_TRACKED_FIELDS } from '@/lib/audit-log'

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
      return notFoundResponse('Patient')
    }

    const patientData = patientDoc.data()
    const patient: PatientProfile = {
      id: patientDoc.id,
      ...patientData
    } as PatientProfile

    logger.info('[API /patients/[id] GET] Patient fetched successfully', { userId, ownerUserId, patientId })

    return NextResponse.json({
      success: true,
      data: patient
    })

  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]',
      operation: 'get'
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
      return notFoundResponse('Patient')
    }

    // Merge updates with existing data (using service for DRY)
    const existingPatient = patientDoc.data() as PatientProfile
    const now = new Date().toISOString()

    // Use centralized preference merging service (Separation of Concerns)
    const mergedPreferences = body.preferences
      ? mergePatientPreferences(existingPatient.preferences, body.preferences)
      : existingPatient.preferences

    const updatedPatient: PatientProfile = {
      ...existingPatient,
      ...body,
      preferences: mergedPreferences,
      id: patientId,
      userId,
      createdAt: existingPatient.createdAt,
      lastModified: now
    }

    // Validate only the fields actually present in the body. Using
    // `.partial()` so missing fields don't fail — this is an UPDATE,
    // not a create, and existing patients may pre-date current schema
    // requirements. Previously a single-field rename (e.g. PatientName-
    // Editor sending `{ name: 'Penny' }`) would force full-record
    // validation, failing whenever the existing doc was missing any
    // required field (e.g. legacy patients without dateOfBirth).
    const validationResult = patientProfileSchema.partial().safeParse(body)
    if (!validationResult.success) {
      logger.warn('[API /patients/[id] PUT] Validation failed', {
        errors: validationResult.error.format(),
        bodyKeys: Object.keys(body)
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

    // Update patient — explicit field allowlist (don't spread `body` to
    // avoid leaking arbitrary keys / Timestamp objects into Firestore).
    // Use `in body` (not truthy check) so callers can explicitly clear a
    // field by passing null / '' / 0.
    const updateData: any = {
      lastModified: now
    }

    // Identity & profile basics
    if ('name' in body) updateData.name = body.name
    if ('firstName' in body) updateData.firstName = body.firstName
    if ('middleName' in body) updateData.middleName = body.middleName
    if ('lastName' in body) updateData.lastName = body.lastName
    if ('gender' in body) updateData.gender = body.gender
    if ('relationship' in body) updateData.relationship = body.relationship
    if ('photo' in body) updateData.photo = body.photo
    if ('nickname' in body) updateData.nickname = body.nickname
    if ('displayPreference' in body) updateData.displayPreference = body.displayPreference

    // Emergency / medical identifiers
    if ('bloodType' in body) updateData.bloodType = body.bloodType
    if ('emergencyContacts' in body) updateData.emergencyContacts = body.emergencyContacts

    // Vitals profile (goal/lifestyle data, distinct from logged vitals)
    if ('height' in body) updateData.height = body.height
    if ('heightUnit' in body) updateData.heightUnit = body.heightUnit
    if ('weightUnit' in body) updateData.weightUnit = body.weightUnit
    if ('activityLevel' in body) updateData.activityLevel = body.activityLevel
    if ('weightGoal' in body) updateData.weightGoal = body.weightGoal
    if ('targetWeight' in body) updateData.targetWeight = body.targetWeight
    if ('targetWeightUnit' in body) updateData.targetWeightUnit = body.targetWeightUnit

    // Health
    if ('healthConditions' in body) updateData.healthConditions = body.healthConditions
    if ('conditionDetails' in body) updateData.conditionDetails = body.conditionDetails
    if ('medications' in body) updateData.medications = body.medications

    // Food profile
    if ('foodAllergies' in body) updateData.foodAllergies = body.foodAllergies
    if ('preferredFoods' in body) updateData.preferredFoods = body.preferredFoods
    if ('aversions' in body) updateData.aversions = body.aversions
    if ('preparationNeeds' in body) updateData.preparationNeeds = body.preparationNeeds
    if ('dietaryPreferences' in body) updateData.dietaryPreferences = body.dietaryPreferences

    // Other structured slots
    if (body.preferences) updateData.preferences = mergedPreferences
    if ('lifestyle' in body) updateData.lifestyle = body.lifestyle
    if ('bodyMeasurements' in body) updateData.bodyMeasurements = body.bodyMeasurements

    await patientRef.update(updateData)

    // Audit-log identity/health changes. Diffs old vs new over the
    // canonical tracked fields and writes one entry per request.
    // No-op when only untracked fields changed (e.g. preferences,
    // lifestyle blobs). See memory/project_audit_log_primitives.md.
    const newDoc = { ...existingPatient, ...updateData }
    await writeAuditEntries({
      entityType: 'patient',
      entityId: patientId,
      entityName: newDoc.name || existingPatient.name || 'Unknown Patient',
      userId: ownerUserId,
      action: 'updated',
      performedBy: userId,
      // TODO: thread actor displayName lookup (same gap as DELETE
      // writer noted in lib/audit-log.ts caller comments).
      performedByName: 'User',
      oldDoc: existingPatient as unknown as Record<string, unknown>,
      newDoc: newDoc as unknown as Record<string, unknown>,
      trackedFields: PATIENT_TRACKED_FIELDS,
      request,
    })

    logger.info('[API /patients/[id] PUT] Patient updated successfully', { userId, ownerUserId, patientId })

    // Return the merged patient data
    return NextResponse.json({
      success: true,
      data: { ...existingPatient, ...updateData, id: patientId }
    })

  } catch (error) {
    return errorResponse(error, {
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
      return notFoundResponse('Patient')
    }

    const patientData = patientDoc.data()
    if (!patientData) {
      logger.error('[API /patients/[id] DELETE] Patient document exists but has no data', undefined, { userId, ownerUserId, patientId })
      return notFoundResponse('Patient data')
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

    // Create audit log for deletion (HIPAA compliance).
    // Uses the shared writeAuditEntry primitive — same on-disk shape as
    // the previous inline writer (preserving query compatibility for
    // existing entries), now extracted so future writers (PUT field-
    // diff, medication changes, etc.) emit the same structure.
    // See memory/project_audit_log_primitives.md.
    await writeAuditEntry({
      entityType: 'patient',
      entityId: patientId,
      entityName: patientData.name || 'Unknown Patient',
      userId: ownerUserId,
      action: 'deleted',
      performedBy: userId,
      // Note: original writer used patientData.name here too — appears
      // to have been a bug (this should be the actor's display name,
      // not the patient's). Preserved as-is for pure refactor; fix in
      // a follow-up commit that also threads actor profile lookup.
      performedByName: patientData.name || 'Unknown',
      changes: [{
        field: 'status',
        oldValue: patientData.status || 'active',
        newValue: 'deleted',
        fieldLabel: 'Patient Status',
        dataType: 'string',
      }],
      metadata: { deletionReason },
      request,
    })

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

  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]',
      operation: 'delete'
    })
  }
}
