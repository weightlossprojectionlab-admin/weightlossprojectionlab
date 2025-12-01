/**
 * API Route: /api/patients/[patientId]/providers/[providerId]
 *
 * Handles individual healthcare provider operations
 * GET - Fetch a specific provider
 * PATCH - Update provider information
 * DELETE - Delete a provider
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import type { HealthcareProvider } from '@/types/providers'
import { errorResponse, notFoundResponse } from '@/lib/api-response'
import { Timestamp } from 'firebase-admin/firestore'

// GET /api/patients/[patientId]/providers/[providerId] - Fetch a specific provider
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; providerId: string }> }
) {
  try {
    const { patientId, providerId } = await params

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, patientId, 'viewProviders')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId, role } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id]/providers/[id] GET] Rate limit exceeded', { userId, patientId, providerId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    logger.debug('[API /patients/[id]/providers/[id] GET] Fetching provider', {
      userId,
      ownerUserId,
      patientId,
      providerId,
      role
    })

    // Get provider document
    const providerDoc = await adminDb
      .collection('healthcareProviders')
      .doc(providerId)
      .get()

    if (!providerDoc.exists) {
      logger.warn('[API /patients/[id]/providers/[id] GET] Provider not found', {
        userId,
        patientId,
        providerId
      })
      return notFoundResponse('Provider')
    }

    const provider = {
      id: providerDoc.id,
      ...providerDoc.data()
    } as HealthcareProvider

    // Verify provider belongs to the patient
    if (provider.patientId !== patientId) {
      logger.warn('[API /patients/[id]/providers/[id] GET] Provider does not belong to patient', {
        userId,
        patientId,
        providerId,
        providerPatientId: provider.patientId
      })
      return notFoundResponse('Provider')
    }

    logger.info('[API /patients/[id]/providers/[id] GET] Provider fetched successfully', {
      userId,
      ownerUserId,
      patientId,
      providerId
    })

    return NextResponse.json({
      success: true,
      data: provider
    })

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/providers/[providerId]',
      operation: 'fetch'
    })
  }
}

// PATCH /api/patients/[patientId]/providers/[providerId] - Update provider information
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; providerId: string }> }
) {
  try {
    const { patientId, providerId } = await params

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, patientId, 'manageProviders')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId, role } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id]/providers/[id] PATCH] Rate limit exceeded', { userId, patientId, providerId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    logger.debug('[API /patients/[id]/providers/[id] PATCH] Request body', { body, userId, ownerUserId, role })

    // Verify provider exists and belongs to the patient
    const providerDoc = await adminDb
      .collection('healthcareProviders')
      .doc(providerId)
      .get()

    if (!providerDoc.exists) {
      logger.warn('[API /patients/[id]/providers/[id] PATCH] Provider not found', {
        userId,
        patientId,
        providerId
      })
      return notFoundResponse('Provider')
    }

    const existingProvider = providerDoc.data() as HealthcareProvider

    if (existingProvider.patientId !== patientId) {
      logger.warn('[API /patients/[id]/providers/[id] PATCH] Provider does not belong to patient', {
        userId,
        patientId,
        providerId,
        providerPatientId: existingProvider.patientId
      })
      return notFoundResponse('Provider')
    }

    // Prepare update data (exclude immutable fields)
    const updateData: Partial<HealthcareProvider> = {
      updatedAt: Timestamp.now()
    }

    // Only include fields that are present in the request body
    if (body.name !== undefined) updateData.name = body.name
    if (body.title !== undefined) updateData.title = body.title
    if (body.specialty !== undefined) updateData.specialty = body.specialty
    if (body.email !== undefined) updateData.email = body.email
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.fax !== undefined) updateData.fax = body.fax
    if (body.facility !== undefined) updateData.facility = body.facility
    if (body.address !== undefined) updateData.address = body.address
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.lastContactDate !== undefined) updateData.lastContactDate = body.lastContactDate
    if (body.lastContactType !== undefined) updateData.lastContactType = body.lastContactType

    // Update provider document
    await adminDb
      .collection('healthcareProviders')
      .doc(providerId)
      .update(updateData)

    // Fetch updated provider
    const updatedDoc = await adminDb
      .collection('healthcareProviders')
      .doc(providerId)
      .get()

    const updatedProvider: HealthcareProvider = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as HealthcareProvider

    logger.info('[API /patients/[id]/providers/[id] PATCH] Provider updated successfully', {
      userId,
      ownerUserId,
      patientId,
      providerId
    })

    return NextResponse.json({
      success: true,
      data: updatedProvider
    })

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/providers/[providerId]',
      operation: 'update'
    })
  }
}

// DELETE /api/patients/[patientId]/providers/[providerId] - Delete a provider
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; providerId: string }> }
) {
  try {
    const { patientId, providerId } = await params

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, patientId, 'manageProviders')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId, role } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id]/providers/[id] DELETE] Rate limit exceeded', { userId, patientId, providerId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    logger.debug('[API /patients/[id]/providers/[id] DELETE] Deleting provider', {
      userId,
      ownerUserId,
      patientId,
      providerId,
      role
    })

    // Verify provider exists and belongs to the patient
    const providerDoc = await adminDb
      .collection('healthcareProviders')
      .doc(providerId)
      .get()

    if (!providerDoc.exists) {
      logger.warn('[API /patients/[id]/providers/[id] DELETE] Provider not found', {
        userId,
        patientId,
        providerId
      })
      return notFoundResponse('Provider')
    }

    const provider = providerDoc.data() as HealthcareProvider

    if (provider.patientId !== patientId) {
      logger.warn('[API /patients/[id]/providers/[id] DELETE] Provider does not belong to patient', {
        userId,
        patientId,
        providerId,
        providerPatientId: provider.patientId
      })
      return notFoundResponse('Provider')
    }

    // Delete provider document
    await adminDb
      .collection('healthcareProviders')
      .doc(providerId)
      .delete()

    logger.info('[API /patients/[id]/providers/[id] DELETE] Provider deleted successfully', {
      userId,
      ownerUserId,
      patientId,
      providerId
    })

    return NextResponse.json({
      success: true,
      message: 'Provider deleted successfully'
    })

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/providers/[providerId]',
      operation: 'delete'
    })
  }
}
