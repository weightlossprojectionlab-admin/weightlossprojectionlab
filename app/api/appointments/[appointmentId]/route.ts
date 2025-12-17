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
    console.error('Error fetching appointment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch appointment' },
      { status: 500 }
    )
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
    console.error('Error updating appointment:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid appointment data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update appointment' },
      { status: 500 }
    )
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

    // Delete the appointment
    await appointmentRef.delete()
    console.log(`[DELETE] Appointment deleted: ${appointmentId}`)

    // Delete associated notification (if it exists)
    // Query notifications with this appointmentId in metadata
    console.log(`[DELETE] Querying notifications for userId=${userId}, appointmentId=${appointmentId}`)

    const notificationsSnapshot = await adminDb
      .collection('notifications')
      .where('userId', '==', userId)
      .where('metadata.appointmentId', '==', appointmentId)
      .get()

    console.log(`[DELETE] Found ${notificationsSnapshot.size} notification(s) to delete for appointment ${appointmentId}`)

    if (notificationsSnapshot.size === 0) {
      // Try alternate query - get all notifications for this user and filter manually
      console.log(`[DELETE] No notifications found with direct query, trying manual filter...`)
      const allUserNotifications = await adminDb
        .collection('notifications')
        .where('userId', '==', userId)
        .get()

      console.log(`[DELETE] User has ${allUserNotifications.size} total notifications`)
      allUserNotifications.docs.forEach(doc => {
        const data = doc.data()
        console.log(`[DELETE] Notification ${doc.id}: type=${data.type}, appointmentId=${data.metadata?.appointmentId}`)
      })
    }

    // Delete all matching notifications
    if (!notificationsSnapshot.empty) {
      const batch = adminDb.batch()
      notificationsSnapshot.docs.forEach(doc => {
        console.log(`[DELETE] Deleting notification ${doc.id}`)
        batch.delete(doc.ref)
      })
      await batch.commit()
      console.log(`[DELETE] Successfully deleted ${notificationsSnapshot.size} notification(s)`)
    }

    console.log(`[DELETE] Appointment ${appointmentId} and associated notifications removed successfully`)

    return NextResponse.json({
      success: true,
      message: 'Appointment deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete appointment' },
      { status: 500 }
    )
  }
}
