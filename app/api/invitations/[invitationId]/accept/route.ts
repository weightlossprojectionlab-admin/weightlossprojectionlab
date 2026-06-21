/**
 * Accept Family Invitation API
 *
 * POST /api/invitations/[invitationId]/accept
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'
import {
  upsertCaregiverOf,
  upsertFamilyMember,
  upsertPatientFamilyMember,
} from '@/lib/caregiver-relationship'
import type { FamilyInvitation, FamilyMember } from '@/types/medical'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await params

    // Parse request body (may contain HIPAA acknowledgment)
    const body = await request.json().catch(() => ({}))

    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult) {
      return unauthorizedResponse()
    }
    const userId = authResult.userId

    // Get user profile
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const userEmail = userData?.email || ''
    const userName = userData?.displayName || userData?.name || 'Family Member'

    // Get invitation
    const invitationRef = adminDb.collection('familyInvitations').doc(invitationId)
    const invitationDoc = await invitationRef.get()

    if (!invitationDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const invitation = { id: invitationDoc.id, ...invitationDoc.data() } as FamilyInvitation

    // Verify invitation is for this user
    if (invitation.recipientEmail !== userEmail) {
      return NextResponse.json(
        { success: false, error: 'This invitation is not for you' },
        { status: 403 }
      )
    }

    // Verify invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Invitation already ${invitation.status}` },
        { status: 400 }
      )
    }

    // Check if expired
    const now = new Date()
    const expiresAt = new Date(invitation.expiresAt)
    if (now > expiresAt) {
      await invitationRef.update({ status: 'expired' })
      return NextResponse.json(
        { success: false, error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    const acceptedAt = new Date().toISOString()

    // Create family member record in inviter's family members collection
    // Only include defined values to avoid Firestore errors
    const familyMember: any = {
      userId,
      email: userEmail,
      name: userName,
      relationship: 'family', // Can be updated later
      invitedBy: invitation.invitedByUserId,
      invitedAt: invitation.createdAt,
      acceptedAt,
      status: 'accepted',
      permissions: invitation.permissions,
      notificationPreferences: {
        appointmentReminders: true,
        appointmentUpdates: true,
        vitalAlerts: true,
        medicationReminders: true,
        documentUploads: true,
        aiRecommendations: true,
        chatMessages: true,
        urgentAlerts: true,
        driverAssignmentNotifications: true,
        driverReminderDaysBefore: [7, 3, 1]
      },
      patientsAccess: invitation.patientsShared,
      lastActive: acceptedAt,

      // Family Role Management (Principal Owner System)
      familyRole: invitation.familyRole || 'caregiver', // Default to caregiver if not specified
      managedBy: invitation.invitedByUserId, // Who invited/manages them
      canBeEditedBy: [invitation.invitedByUserId], // Initial editor is the inviter
      roleAssignedAt: acceptedAt,
      roleAssignedBy: invitation.invitedByUserId
    }

    // Only add photo if it exists
    const photo = userData?.photoURL || userData?.photo
    if (photo) {
      familyMember.photo = photo
    }

    // Strip undefined values before Firestore write
    const cleanedMember = Object.fromEntries(
      Object.entries(familyMember).filter(([, v]) => v !== undefined)
    )

    // Idempotent upsert: if a familyMembers doc for this caregiver already
    // exists on this owner, merge into it. Otherwise create. Stops the
    // "3 caregiver rows for the same person" duplicates that resulted from
    // multiple invites to the same email.
    const familyMemberId = await upsertFamilyMember(
      invitation.invitedByUserId,
      {
        userId,
        email: userEmail,
        name: userName,
        permissions: invitation.permissions as unknown as Record<string, boolean>,
        patientsAccess: invitation.patientsShared,
      },
      cleanedMember,
    )

    logger.info('[Invitations] Family member record upserted', {
      memberId: familyMemberId,
      role: familyMember.familyRole,
      patientsShared: invitation.patientsShared?.length || 0
    })

    // Same idempotent shape for each per-patient family-member doc.
    for (const patientId of invitation.patientsShared) {
      await upsertPatientFamilyMember(
        invitation.invitedByUserId,
        patientId,
        familyMemberId,
        {
          userId,
          email: userEmail,
          name: userName,
          relationship: 'family',
          permissions: invitation.permissions,
          status: 'accepted',
          addedAt: acceptedAt,
          addedBy: invitation.invitedByUserId,
          lastModified: acceptedAt,
        },
      )
    }

    // Update invitation status
    await invitationRef.update({
      status: 'accepted',
      acceptedBy: userId,
      acceptedAt
    })

    // Add or extend caregiver context on the user's profile. Same idempotent
    // semantics as the owner-side upsert — a second invite from the same
    // owner extends the existing relationship instead of duplicating it.
    // Caregiver-only users skip onboarding; do not set userMode here.
    const userRef = adminDb.collection('users').doc(userId)
    await upsertCaregiverOf(userId, {
      accountOwnerId: invitation.invitedByUserId,
      accountOwnerName: invitation.invitedByName,
      role: invitation.familyRole || 'caregiver',
      patientsAccess: invitation.patientsShared,
      permissions: invitation.permissions as unknown as Record<string, boolean>,
      addedAt: acceptedAt,
      invitationId: invitationId,
      familyPlan: true,
    })

    // Log HIPAA acknowledgment to Firestore for compliance audit trail
    if (body.hipaaAcknowledged) {
      await userRef.collection('complianceAcknowledgments').add({
        type: 'hipaa_privacy_practices',
        acceptedAt: body.acknowledgedAt || new Date().toISOString(),
        invitationId: invitationId,
        accountOwnerId: invitation.invitedByUserId,
        accountOwnerName: invitation.invitedByName,
        patientsAccess: invitation.patientsShared,
        userAgent: request.headers.get('user-agent') || 'unknown',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      })

      console.log(`HIPAA acknowledgment logged for user ${userId} accepting invitation ${invitationId}`)
    }

    const createdMember: FamilyMember = {
      id: familyMemberId,
      ...familyMember
    }

    console.log(`Invitation ${invitationId} accepted by ${userId}, added to caregiverOf array`)

    return NextResponse.json({
      success: true,
      data: createdMember,
      message: 'Invitation accepted successfully'
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/invitations/[invitationId]/accept', operation: 'accept' })
  }
}
