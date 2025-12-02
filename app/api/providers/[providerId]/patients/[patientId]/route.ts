/**
 * Provider-Patient Unlinking API
 *
 * DELETE /api/providers/[providerId]/patients/[patientId] - Unlink provider from patient
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import type { Provider } from '@/types/medical'
import { errorResponse } from '@/lib/api-response'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string; patientId: string }> }
) {
  try {
    const { providerId, patientId } = await params

    // Check authorization - user must have access to the patient
    const authResult = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /providers/[id]/patients/[id] DELETE] Rate limit exceeded', { userId, patientId, providerId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    logger.debug('[API /providers/[id]/patients/[id] DELETE] Unlinking provider', {
      userId,
      ownerUserId,
      providerId,
      patientId
    })

    // Get provider (providers are stored under the userId, not ownerUserId)
    const providerRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('providers')
      .doc(providerId)

    const providerDoc = await providerRef.get()

    if (!providerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 404 }
      )
    }

    const provider = { id: providerDoc.id, ...providerDoc.data() } as Provider

    // Check if linked
    if (!provider.patientsServed.includes(patientId)) {
      return NextResponse.json(
        { success: false, error: 'Provider is not linked to this patient' },
        { status: 400 }
      )
    }

    // Remove patient from provider's patientsServed array
    const updatedPatientsServed = provider.patientsServed.filter(id => id !== patientId)

    await providerRef.update({
      patientsServed: updatedPatientsServed
    })

    const updatedDoc = await providerRef.get()
    const updatedProvider: Provider = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as Provider

    logger.info('[API /providers/[id]/patients/[id] DELETE] Provider unlinked from patient', {
      userId,
      providerId,
      patientId,
      remainingPatients: updatedPatientsServed.length
    })

    return NextResponse.json({
      success: true,
      data: updatedProvider,
      message: 'Provider unlinked from patient successfully'
    })
  } catch (error: any) {
    return errorResponse(error: any, {
      route: '/api/providers/[providerId]/patients/[patientId]',
      operation: 'delete'
    })
  }
}
