/**
 * Individual Appointment API
 *
 * GET /api/appointments/[appointmentId] - Get appointment details
 * PUT /api/appointments/[appointmentId] - Update appointment
 * DELETE /api/appointments/[appointmentId] - Delete appointment
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { appointmentFormSchema } from '@/lib/validations/medical'
import type { Appointment } from '@/types/medical'
import { errorResponse } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params

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

    const appointmentRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('appointments')
      .doc(appointmentId)

    const appointmentDoc = await appointmentRef.get()

    if (!appointmentDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      )
    }

    const appointment: Appointment = {
      id: appointmentDoc.id,
      ...appointmentDoc.data()
    } as Appointment

    return NextResponse.json({
      success: true,
      data: appointment
    })
  } catch (error: any) {
    return errorResponse(error: any, {
      route: '/api/appointments/[appointmentId]',
      operation: 'fetch'
    })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params

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

    const appointmentRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('appointments')
      .doc(appointmentId)

    const appointmentDoc = await appointmentRef.get()

    if (!appointmentDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Parse and validate updates
    const body = await request.json()
    const validatedData = appointmentFormSchema.partial().parse(body)

    const updates = {
      ...validatedData,
      lastModified: new Date().toISOString(),
      modifiedBy: userId
    }

    await appointmentRef.update(updates)

    const updatedDoc = await appointmentRef.get()
    const updatedAppointment: Appointment = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as Appointment

    console.log(`Appointment updated: ${appointmentId}`)

    return NextResponse.json({
      success: true,
      data: updatedAppointment,
      message: 'Appointment updated successfully'
    })
  } catch (error: any) {
    return errorResponse(error: any, {
      route: '/api/appointments/[appointmentId]',
      operation: 'update'
    })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params

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

    const appointmentRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('appointments')
      .doc(appointmentId)

    const appointmentDoc = await appointmentRef.get()

    if (!appointmentDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      )
    }

    await appointmentRef.delete()

    console.log(`Appointment deleted: ${appointmentId}`)

    return NextResponse.json({
      success: true,
      message: 'Appointment deleted successfully'
    })
  } catch (error: any) {
    return errorResponse(error: any, {
      route: '/api/appointments/[appointmentId]',
      operation: 'delete'
    })
  }
}
