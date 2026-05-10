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
import { v4 as uuidv4 } from 'uuid'

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

    // ============= Auto-create follow-up appointment =============
    // When a completion-edit comes in with followUpNeeded=true and a
    // nextAppointmentDate, materialize a tentative follow-up so it
    // shows up on the family calendar instead of being a stranded
    // field on the parent record. Idempotent: skip if a follow-up
    // already exists (followUpAppointmentId set on the parent).
    let followUpAppointmentId: string | undefined
    if (
      updatedAppointment.status === 'completed' &&
      updatedAppointment.followUpNeeded === true &&
      updatedAppointment.nextAppointmentDate &&
      !updatedAppointment.followUpAppointmentId
    ) {
      followUpAppointmentId = uuidv4()
      const nowIso = new Date().toISOString()
      const followUp: Appointment = {
        id: followUpAppointmentId,
        userId: updatedAppointment.userId,
        patientId: updatedAppointment.patientId,
        patientName: updatedAppointment.patientName,
        providerId: updatedAppointment.providerId,
        providerName: updatedAppointment.providerName,
        ...(updatedAppointment.specialty ? { specialty: updatedAppointment.specialty } : {}),
        dateTime: updatedAppointment.nextAppointmentDate,
        duration: updatedAppointment.duration ?? 30,
        type: 'follow-up',
        reason: `Follow-up to ${updatedAppointment.reason}`,
        ...(updatedAppointment.location ? { location: updatedAppointment.location } : {}),
        status: 'scheduled',
        createdFrom: 'manual',
        requiresDriver: false,
        driverStatus: 'not-needed',
        createdAt: nowIso,
        createdBy: userId,
        updatedAt: nowIso,
        parentAppointmentId: appointmentId,
      }

      await adminDb
        .collection('users')
        .doc(userId)
        .collection('appointments')
        .doc(followUpAppointmentId)
        .set(followUp)

      // Backlink on the parent so we don't recreate the follow-up
      // if the user re-saves the visit summary.
      await appointmentRef.update({ followUpAppointmentId })
      updatedAppointment.followUpAppointmentId = followUpAppointmentId
    }

    console.log(
      `Appointment updated: ${appointmentId}` +
        (followUpAppointmentId ? ` (auto-created follow-up ${followUpAppointmentId})` : ''),
    )

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
