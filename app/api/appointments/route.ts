/**
 * Appointments API
 *
 * GET /api/appointments - List appointments (filter by patient, provider, date range)
 * POST /api/appointments - Create new appointment
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { appointmentFormSchema } from '@/lib/validations/medical'
import { authorizePatientAccess, verifyAuthToken } from '@/lib/rbac-middleware'
import type { Appointment, PatientProfile, Provider, AuthorizationResult } from '@/types/medical'
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

    // Check authorization - requires scheduleAppointments permission for family members
    const authResult = await authorizePatientAccess(request, validatedData.patientId, 'scheduleAppointments')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, role } = authResult as AuthorizationResult

    // Get patient owner's userId (for database query)
    let ownerUserId = userId
    if (role === 'family') {
      // Find the patient's owner
      const patientSnapshot = await adminDb
        .collectionGroup('patients')
        .where('__name__', '==', validatedData.patientId)
        .limit(1)
        .get()

      if (patientSnapshot.empty) {
        return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 })
      }

      // Extract owner userId from the path
      const patientDocRef = patientSnapshot.docs[0].ref
      ownerUserId = patientDocRef.parent.parent!.id
    }

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

    // Verify provider exists
    const providerRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('providers')
      .doc(validatedData.providerId)

    const providerDoc = await providerRef.get()
    if (!providerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Provider not found' },
        { status: 404 }
      )
    }

    const patient = { id: patientDoc.id, ...patientDoc.data() } as PatientProfile
    const provider = { id: providerDoc.id, ...providerDoc.data() } as Provider

    // Create appointment
    const appointmentId = uuidv4()
    const now = new Date().toISOString()

    const appointment: Appointment = {
      id: appointmentId,
      userId,
      patientId: validatedData.patientId,
      patientName: patient.name,
      providerId: validatedData.providerId,
      providerName: provider.name,
      specialty: provider.specialty,
      dateTime: validatedData.dateTime,
      endTime: validatedData.endTime,
      duration: validatedData.duration,
      type: validatedData.type,
      reason: validatedData.reason,
      location: validatedData.location || `${provider.name}, ${provider.address || ''}`.trim(),
      status: validatedData.status || 'scheduled',
      notes: validatedData.notes,
      createdFrom: validatedData.createdFrom,
      requiresDriver: validatedData.requiresDriver || false,
      driverStatus: validatedData.requiresDriver ? 'pending' : 'not-needed',
      createdAt: now,
      createdBy: userId,
      updatedAt: now,
      updatedBy: userId
    }

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
