/**
 * API Route: /api/patients/[patientId]/providers
 *
 * Handles healthcare provider operations for a specific patient
 * GET - List all healthcare providers for the patient
 * POST - Create a new healthcare provider
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import type { HealthcareProvider } from '@/types/providers'
import { errorResponse } from '@/lib/api-response'
import { Timestamp } from 'firebase-admin/firestore'

// GET /api/patients/[patientId]/providers - List all providers
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

    const { userId, ownerUserId, role } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id]/providers GET] Rate limit exceeded', { userId, patientId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    logger.debug('[API /patients/[id]/providers GET] Fetching providers', {
      userId,
      ownerUserId,
      patientId,
      role
    })

    // Query providers from Firebase Admin
    const providersSnapshot = await adminDb
      .collection('healthcareProviders')
      .where('patientId', '==', patientId)
      .orderBy('name', 'asc')
      .get()

    const providers: HealthcareProvider[] = providersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as HealthcareProvider[]

    logger.info('[API /patients/[id]/providers GET] Providers fetched successfully', {
      userId,
      ownerUserId,
      patientId,
      count: providers.length
    })

    return NextResponse.json({
      success: true,
      data: providers
    })

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/providers',
      operation: 'fetch'
    })
  }
}

// POST /api/patients/[patientId]/providers - Create a new provider
export async function POST(
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
      logger.warn('[API /patients/[id]/providers POST] Rate limit exceeded', { userId, patientId })
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
    logger.debug('[API /patients/[id]/providers POST] Request body', { body, userId, ownerUserId, role })

    // Validate required fields
    if (!body.name || !body.specialty) {
      logger.warn('[API /patients/[id]/providers POST] Validation failed - missing required fields', {
        hasName: !!body.name,
        hasSpecialty: !!body.specialty
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Name and specialty are required fields'
        },
        { status: 400 }
      )
    }

    // Create provider document
    const now = new Date()
    const providerData: Omit<HealthcareProvider, 'id'> = {
      patientId,
      name: body.name,
      title: body.title,
      specialty: body.specialty,
      email: body.email,
      phone: body.phone,
      fax: body.fax,
      facility: body.facility,
      address: body.address,
      addedBy: userId,
      addedAt: now,
      updatedAt: now,
      source: body.source || 'manual',
      sourceId: body.sourceId,
      lastContactDate: body.lastContactDate,
      lastContactType: body.lastContactType,
      notes: body.notes
    }

    const providerRef = await adminDb
      .collection('healthcareProviders')
      .add(providerData)

    const newProvider: HealthcareProvider = {
      id: providerRef.id,
      ...providerData
    }

    logger.info('[API /patients/[id]/providers POST] Provider created successfully', {
      userId,
      ownerUserId,
      patientId,
      providerId: providerRef.id,
      name: newProvider.name
    })

    return NextResponse.json({
      success: true,
      data: newProvider
    }, { status: 201 })

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/providers',
      operation: 'create'
    })
  }
}
