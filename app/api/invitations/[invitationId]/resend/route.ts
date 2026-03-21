/**
 * Resend Family Invitation Email API
 *
 * POST /api/invitations/[invitationId]/resend - Resend invitation email
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'
import { sendFamilyInvitationEmail } from '@/lib/email-service'
import type { FamilyInvitation } from '@/types/medical'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult) {
      return unauthorizedResponse()
    }
    const userId = authResult.userId

    const { invitationId } = await params

    // Get invitation
    const invitationDoc = await adminDb
      .collection('familyInvitations')
      .doc(invitationId)
      .get()

    if (!invitationDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const invitation = {
      id: invitationDoc.id,
      ...invitationDoc.data()
    } as FamilyInvitation

    // Verify user owns this invitation
    if (invitation.invitedByUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only resend invitations you created' },
        { status: 403 }
      )
    }

    // Only allow resending pending invitations
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Cannot resend ${invitation.status} invitation` },
        { status: 400 }
      )
    }

    // Check if invitation has expired
    const now = new Date()
    const expiresAt = new Date(invitation.expiresAt)
    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Cannot resend expired invitation' },
        { status: 400 }
      )
    }

    // Get patient names for the email
    const patientNames: string[] = []
    for (const patientId of invitation.patientsShared) {
      // Try root level first
      let patientDoc = await adminDb.collection('patients').doc(patientId).get()

      // If not found at root, try nested under user
      if (!patientDoc.exists) {
        patientDoc = await adminDb
          .collection('users')
          .doc(userId)
          .collection('patients')
          .doc(patientId)
          .get()
      }

      if (patientDoc.exists) {
        const patientData = patientDoc.data()
        patientNames.push(patientData?.name || 'Unknown Patient')
      }
    }

    // Send invitation email
    try {
      await sendFamilyInvitationEmail({
        recipientEmail: invitation.recipientEmail,
        inviterName: invitation.invitedByName,
        inviteCode: invitation.inviteCode,
        patientNames,
        message: invitation.message,
        expiresAt: invitation.expiresAt
      })

      // Update emailSentAt timestamp
      await adminDb
        .collection('familyInvitations')
        .doc(invitationId)
        .update({
          emailSentAt: new Date().toISOString()
        })

      console.log(`Invitation email resent to ${invitation.recipientEmail}`)

      return NextResponse.json({
        success: true,
        message: `Invitation email resent to ${invitation.recipientEmail}`
      })
    } catch (emailError: any) {
      console.error('Failed to resend invitation email:', emailError)
      return NextResponse.json(
        { success: false, error: 'Failed to send email. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    return errorResponse(error, { route: '/api/invitations/[invitationId]/resend', operation: 'resend' })
  }
}
