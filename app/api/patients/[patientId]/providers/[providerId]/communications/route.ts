/**
 * API Route: /api/patients/[patientId]/providers/[providerId]/communications
 *
 * Handles communication logging with healthcare providers
 * POST - Log a communication (email/call/fax) with a provider
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import type { ProviderCommunication, HealthcareProvider } from '@/types/providers'
import { errorResponse, notFoundResponse, validationError } from '@/lib/api-response'
import { Timestamp } from 'firebase-admin/firestore'

// POST /api/patients/[patientId]/providers/[providerId]/communications - Log a communication
export async function POST(
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
      logger.warn('[API /patients/[id]/providers/[id]/communications POST] Rate limit exceeded', {
        userId,
        patientId,
        providerId
      })
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
    logger.debug('[API /patients/[id]/providers/[id]/communications POST] Request body', {
      body,
      userId,
      ownerUserId,
      role
    })

    // Validate required fields
    if (!body.type || !['email', 'call', 'fax'].includes(body.type)) {
      logger.warn('[API /patients/[id]/providers/[id]/communications POST] Invalid communication type', {
        type: body.type
      })
      return validationError('Invalid communication type. Must be: email, call, or fax')
    }

    // Verify provider exists and belongs to the patient
    const providerDoc = await adminDb
      .collection('healthcareProviders')
      .doc(providerId)
      .get()

    if (!providerDoc.exists) {
      logger.warn('[API /patients/[id]/providers/[id]/communications POST] Provider not found', {
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

    if (provider.patientId !== patientId) {
      logger.warn('[API /patients/[id]/providers/[id]/communications POST] Provider does not belong to patient', {
        userId,
        patientId,
        providerId,
        providerPatientId: provider.patientId
      })
      return notFoundResponse('Provider')
    }

    // Create communication document
    const now = Timestamp.now()
    const communicationData: Omit<ProviderCommunication, 'id'> = {
      patientId,
      providerId,
      providerName: provider.name, // Denormalized for easier querying
      type: body.type,
      sentBy: userId,
      sentByName: body.sentByName,
      sentAt: now,
      // For emails/faxes
      subject: body.subject,
      message: body.message,
      attachments: body.attachments,
      // For calls
      duration: body.duration,
      callNotes: body.callNotes,
      status: body.status || 'sent',
      errorMessage: body.errorMessage
    }

    // Add communication to Firestore
    const communicationRef = await adminDb
      .collection('providerCommunications')
      .add(communicationData)

    // Update provider's last contact information
    await adminDb
      .collection('healthcareProviders')
      .doc(providerId)
      .update({
        lastContactDate: now,
        lastContactType: body.type,
        updatedAt: now
      })

    const newCommunication: ProviderCommunication = {
      id: communicationRef.id,
      ...communicationData
    }

    logger.info('[API /patients/[id]/providers/[id]/communications POST] Communication logged successfully', {
      userId,
      ownerUserId,
      patientId,
      providerId,
      communicationId: communicationRef.id,
      type: body.type
    })

    return NextResponse.json({
      success: true,
      data: newCommunication
    }, { status: 201 })

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/providers/[providerId]/communications',
      operation: 'create'
    })
  }
}
