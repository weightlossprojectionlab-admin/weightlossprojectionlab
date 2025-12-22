/**
 * Provider-Patient Linking API
 *
 * POST /api/providers/[providerId]/patients - Link provider to patient (legacy)
 * PATCH /api/providers/[providerId]/patients - Add or remove multiple patients
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { Provider } from '@/types/medical'
import type { HealthcareProvider } from '@/types/providers'
import { logger } from '@/lib/logger'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { errorResponse } from '@/lib/api-response'
import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'

const linkPatientSchema = z.object({
  patientId: z.string()
})

const updatePatientsSchema = z.object({
  action: z.enum(['add', 'remove']),
  patientIds: z.array(z.string()).min(1),
  patientNotes: z.record(z.string(), z.string()).optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params

    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Validate body
    const body = await request.json()
    const { patientId } = linkPatientSchema.parse(body)

    // Verify patient exists and user owns it
    const patientRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Patient not found or access denied' },
        { status: 404 }
      )
    }

    // Get provider
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

    // Check if already linked
    if (provider.patientsServed.includes(patientId)) {
      return NextResponse.json(
        { success: false, error: 'Provider already linked to this patient' },
        { status: 400 }
      )
    }

    // Add patient to provider's patientsServed array
    await providerRef.update({
      patientsServed: [...provider.patientsServed, patientId]
    })

    const updatedDoc = await providerRef.get()
    const updatedProvider: Provider = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as Provider

    console.log(`Provider ${providerId} linked to patient ${patientId}`)

    return NextResponse.json({
      success: true,
      data: updatedProvider,
      message: 'Provider linked to patient successfully'
    })
  } catch (error: any) {
    console.error('Error linking provider to patient:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to link provider to patient' },
      { status: 500 }
    )
  }
}

// PATCH /api/providers/[providerId]/patients - Add or remove patient assignments
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params

    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check rate limit
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /providers/[id]/patients PATCH] Rate limit exceeded', { userId, providerId })
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
    const validationResult = updatePatientsSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const { action, patientIds, patientNotes } = validationResult.data

    // Get provider document from healthcareProviders collection
    const providerRef = adminDb.collection('healthcareProviders').doc(providerId)
    const providerDoc = await providerRef.get()

    if (!providerDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not found',
          message: 'Provider not found'
        },
        { status: 404 }
      )
    }

    const providerData = providerDoc.data() as HealthcareProvider

    // Verify user owns this provider
    if (providerData.userId !== userId && providerData.addedBy !== userId) {
      logger.warn('[API /providers/[id]/patients PATCH] Unauthorized access attempt', {
        userId,
        providerId,
        ownerId: providerData.userId
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to modify this provider'
        },
        { status: 403 }
      )
    }

    // Verify all patients belong to the user
    for (const patientId of patientIds) {
      const patientDoc = await adminDb.collection('patients').doc(patientId).get()
      if (!patientDoc.exists) {
        return NextResponse.json(
          {
            success: false,
            error: 'Not found',
            message: `Patient ${patientId} not found`
          },
          { status: 404 }
        )
      }

      const patientData = patientDoc.data()
      if (patientData?.userId !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden',
            message: `You do not have permission to assign patient ${patientId}`
          },
          { status: 403 }
        )
      }
    }

    // Prepare update
    const updates: any = {
      updatedAt: new Date()
    }

    if (action === 'add') {
      // Add patients to the array (using arrayUnion to avoid duplicates)
      updates.patientIds = FieldValue.arrayUnion(...patientIds)

      // Add patient-specific notes if provided
      if (patientNotes) {
        const currentNotes = providerData.patientNotes || {}
        updates.patientNotes = {
          ...currentNotes,
          ...patientNotes
        }
      }

      logger.info('[API /providers/[id]/patients PATCH] Adding patients to provider', {
        userId,
        providerId,
        patientIds,
        providerName: providerData.name
      })
    } else {
      // Remove patients from the array
      updates.patientIds = FieldValue.arrayRemove(...patientIds)

      // Remove patient-specific notes
      if (providerData.patientNotes) {
        const updatedNotes = { ...providerData.patientNotes }
        patientIds.forEach(patientId => {
          delete updatedNotes[patientId]
        })
        updates.patientNotes = updatedNotes
      }

      logger.info('[API /providers/[id]/patients PATCH] Removing patients from provider', {
        userId,
        providerId,
        patientIds,
        providerName: providerData.name
      })
    }

    // Update provider
    await providerRef.update(updates)

    // Fetch updated provider
    const updatedDoc = await providerRef.get()
    const updatedProvider: HealthcareProvider = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as HealthcareProvider

    logger.info('[API /providers/[id]/patients PATCH] Provider updated successfully', {
      userId,
      providerId,
      action,
      patientCount: updatedProvider.patientIds?.length || 0
    })

    return NextResponse.json({
      success: true,
      data: updatedProvider,
      message: `Successfully ${action === 'add' ? 'added' : 'removed'} ${patientIds.length} patient(s)`
    })

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/providers/[providerId]/patients',
      operation: 'update-patients'
    })
  }
}
