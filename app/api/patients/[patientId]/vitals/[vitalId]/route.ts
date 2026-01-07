/**
 * API Route: /api/patients/[patientId]/vitals/[vitalId]
 *
 * Handles individual vital sign operations
 * GET - Fetch a specific vital sign
 * PUT - Update a vital sign (with audit trail)
 * DELETE - Delete a vital sign
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import type { VitalSign, VitalModification } from '@/types/medical'

// GET /api/patients/[patientId]/vitals/[vitalId] - Fetch a specific vital sign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; vitalId: string }> }
) {
  try {
    const { patientId, vitalId } = await params

    // Check authorization
    const authResult = await assertPatientAccess(request, patientId, 'viewVitals')
    if (authResult instanceof Response) {
      return authResult
    }

    const { userId, ownerUserId } = authResult as AssertPatientAccessResult

    // Check rate limit
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id]/vitals/[vitalId] GET] Rate limit exceeded', { userId, patientId, vitalId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Get vital sign document
    const vitalRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('vitals')
      .doc(vitalId)

    const vitalDoc = await vitalRef.get()

    if (!vitalDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Vital sign not found' },
        { status: 404 }
      )
    }

    const vital: VitalSign = {
      id: vitalDoc.id,
      patientId,
      ...vitalDoc.data()
    } as VitalSign

    return NextResponse.json({
      success: true,
      data: vital
    })

  } catch (error: any) {
    logger.error('[API /patients/[id]/vitals/[vitalId] GET] Error fetching vital', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch vital sign' },
      { status: 500 }
    )
  }
}

// PUT /api/patients/[patientId]/vitals/[vitalId] - Update vital sign with audit trail
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; vitalId: string }> }
) {
  try {
    const { patientId, vitalId } = await params

    // Check authorization
    const authResult = await assertPatientAccess(request, patientId, 'logVitals')
    if (authResult instanceof Response) {
      return authResult
    }

    const { userId, ownerUserId } = authResult as AssertPatientAccessResult

    // Check rate limit
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id]/vitals/[vitalId] PUT] Rate limit exceeded', { userId, patientId, vitalId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Parse request body
    const updates = await request.json()
    logger.debug('[API /patients/[id]/vitals/[vitalId] PUT] Request body', { updates, userId, patientId, vitalId })

    // Get vital sign reference
    const vitalRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('vitals')
      .doc(vitalId)

    const vitalDoc = await vitalRef.get()

    if (!vitalDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Vital sign not found' },
        { status: 404 }
      )
    }

    const existingVital = vitalDoc.data() as VitalSign
    const now = new Date().toISOString()

    // Build modification history entry
    const changes: VitalModification['changes'] = []
    const allowedFields = ['value', 'recordedAt', 'notes', 'tags']

    allowedFields.forEach(field => {
      if (updates[field] !== undefined && JSON.stringify(updates[field]) !== JSON.stringify(existingVital[field as keyof VitalSign])) {
        changes.push({
          field,
          oldValue: existingVital[field as keyof VitalSign],
          newValue: updates[field]
        })
      }
    })

    // Build modification history entry
    const modification: VitalModification = {
      modifiedBy: userId,
      modifiedAt: now,
      changes
    }

    // Update vital sign with audit trail
    const updatedData = {
      ...updates,
      lastModifiedBy: userId,
      lastModifiedAt: now,
      modificationHistory: [
        ...(existingVital.modificationHistory || []),
        modification
      ]
    }

    await vitalRef.update(updatedData)

    // Fetch updated vital
    const updatedDoc = await vitalRef.get()
    const updatedVital: VitalSign = {
      id: updatedDoc.id,
      patientId,
      ...updatedDoc.data()
    } as VitalSign

    logger.info('[API /patients/[id]/vitals/[vitalId] PUT] Vital sign updated', {
      userId,
      ownerUserId,
      patientId,
      vitalId,
      changesCount: changes.length
    })

    return NextResponse.json({
      success: true,
      data: updatedVital
    })

  } catch (error: any) {
    logger.error('[API /patients/[id]/vitals/[vitalId] PUT] Error updating vital', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update vital sign' },
      { status: 500 }
    )
  }
}

// DELETE /api/patients/[patientId]/vitals/[vitalId] - Delete vital sign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; vitalId: string }> }
) {
  try {
    const { patientId, vitalId } = await params

    // Check authorization
    const authResult = await assertPatientAccess(request, patientId, 'logVitals')
    if (authResult instanceof Response) {
      return authResult
    }

    const { userId, ownerUserId } = authResult as AssertPatientAccessResult

    // Check rate limit
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id]/vitals/[vitalId] DELETE] Rate limit exceeded', { userId, patientId, vitalId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Get vital sign reference
    const vitalRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)
      .collection('vitals')
      .doc(vitalId)

    const vitalDoc = await vitalRef.get()

    if (!vitalDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Vital sign not found' },
        { status: 404 }
      )
    }

    // Delete the vital sign
    await vitalRef.delete()

    logger.info('[API /patients/[id]/vitals/[vitalId] DELETE] Vital sign deleted', {
      userId,
      ownerUserId,
      patientId,
      vitalId
    })

    return NextResponse.json({
      success: true,
      message: 'Vital sign deleted successfully'
    })

  } catch (error: any) {
    logger.error('[API /patients/[id]/vitals/[vitalId] DELETE] Error deleting vital', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete vital sign' },
      { status: 500 }
    )
  }
}
