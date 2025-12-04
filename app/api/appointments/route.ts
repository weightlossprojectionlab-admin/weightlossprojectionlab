/**
 * Appointments API
 *
 * GET /api/appointments - List appointments (filter by patient, provider, date range)
 * POST /api/appointments - Create new appointment
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase-admin'
import { appointmentFormSchema } from '@/lib/validations/medical'
import { assertPatientAccess, verifyAuthToken, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import type { Appointment, PatientProfile, Provider } from '@/types/medical'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
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

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /appointments GET] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const providerId = searchParams.get('providerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let appointmentsQuery = adminDb
      .collection('users')
      .doc(userId)
      .collection('appointments')
      .orderBy('dateTime', 'asc')

    // Apply filters
    if (startDate) {
      appointmentsQuery = appointmentsQuery.where('dateTime', '>=', startDate) as any
    }
    if (endDate) {
      appointmentsQuery = appointmentsQuery.where('dateTime', '<=', endDate) as any
    }

    const snapshot = await appointmentsQuery.get()
    let appointments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Appointment[]

    // Client-side filtering (Firestore doesn't support multiple array-contains)
    if (patientId) {
      appointments = appointments.filter(a => a.patientId === patientId)
    }
    if (providerId) {
      appointments = appointments.filter(a => a.providerId === providerId)
    }

    return NextResponse.json({
      success: true,
      data: appointments
    })
  } catch (error: any) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch appointments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body first to get patientId
    const body = await request.json()
    const validatedData = appointmentFormSchema.parse(body)

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, validatedData.patientId, 'scheduleAppointments')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /appointments POST] Rate limit exceeded', { userId, patientId: validatedData.patientId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    logger.debug('[API /appointments POST] Creating appointment', {
      userId,
      ownerUserId,
      patientId: validatedData.patientId,
      providerId: validatedData.providerId
    })

    // Verify patient exists
    const patientRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(validatedData.patientId)

    const patientDoc = await patientRef.get()
    if (!patientDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      )
    }

    const patient = { id: patientDoc.id, ...patientDoc.data() } as PatientProfile

    // Verify provider exists (if provided)
    let provider: Provider | null = null
    if (validatedData.providerId) {
      const providerRef = adminDb
        .collection('users')
        .doc(ownerUserId)
        .collection('providers')
        .doc(validatedData.providerId)

      const providerDoc = await providerRef.get()
      if (!providerDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Provider not found' },
          { status: 404 }
        )
      }
      provider = { id: providerDoc.id, ...providerDoc.data() } as Provider
    }

    // Create appointment
    const appointmentId = uuidv4()
    const now = new Date().toISOString()

    // Build appointment object, excluding undefined values
    const appointment: any = {
      id: appointmentId,
      userId,
      patientId: validatedData.patientId,
      patientName: patient.name,
      providerId: validatedData.providerId,
      dateTime: validatedData.dateTime,
      type: validatedData.type,
      status: validatedData.status || 'scheduled',
      requiresDriver: validatedData.requiresDriver || false,
      driverStatus: validatedData.requiresDriver ? 'pending' : 'not-needed',
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId
    }

    // Add optional fields only if they have values
    if (provider?.name) appointment.providerName = provider.name
    if (provider?.specialty || validatedData.specialty) {
      appointment.specialty = provider?.specialty || validatedData.specialty
    }
    if (validatedData.endTime) appointment.endTime = validatedData.endTime
    if (validatedData.duration) appointment.duration = validatedData.duration
    if (validatedData.reason) appointment.reason = validatedData.reason
    if (validatedData.location) {
      appointment.location = validatedData.location
    } else if (provider) {
      appointment.location = `${provider.name}, ${provider.address || ''}`.trim()
    }
    if (validatedData.notes) appointment.notes = validatedData.notes
    if (validatedData.createdFrom) appointment.createdFrom = validatedData.createdFrom

    const appointmentRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('appointments')
      .doc(appointmentId)

    await appointmentRef.set(appointment)

    console.log(`Appointment created: ${appointmentId} for patient ${validatedData.patientId}`)

    return NextResponse.json({
      success: true,
      data: appointment,
      message: 'Appointment created successfully'
    })
  } catch (error: any) {
    console.error('Error creating appointment:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid appointment data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create appointment' },
      { status: 500 }
    )
  }
}
