/**
 * Accept Family Invitation API
 *
 * POST /api/invitations/[invitationId]/accept
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { FamilyInvitation, FamilyMember } from '@/types/medical'
import { errorResponse } from '@/lib/api-response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await params

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

    // Get user profile
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const userEmail = userData?.email || decodedToken.email || ''
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

      // Family Role Management (Account Owner System)
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

    const memberRef = await adminDb
      .collection('users')
      .doc(invitation.invitedByUserId)
      .collection('familyMembers')
      .add(familyMember)

    // Create family member records for each patient in patientsShared
    const batch = adminDb.batch()

    for (const patientId of invitation.patientsShared) {
      const patientFamilyMemberRef = adminDb
        .collection('users')
        .doc(invitation.invitedByUserId)
        .collection('patients')
        .doc(patientId)
        .collection('familyMembers')
        .doc(memberRef.id) // Use same ID as account-level family member

      batch.set(patientFamilyMemberRef, {
        userId,
        email: userEmail,
        name: userName,
        relationship: 'family',
        permissions: invitation.permissions,
        status: 'accepted',
        addedAt: acceptedAt,
        addedBy: invitation.invitedByUserId,
        lastModified: acceptedAt
      })
    }

    await batch.commit()

    // Update invitation status
    await invitationRef.update({
      status: 'accepted',
      acceptedBy: userId,
      acceptedAt
    })

    // Update the accepting user's profile to set userMode='caregiver'
    // This ensures they see the caregiver dashboard
    const userRef = adminDb.collection('users').doc(userId)
    await userRef.set({
      preferences: {
        userMode: 'caregiver',
        onboardingAnswers: {
          userMode: 'caregiver',
          primaryRole: 'caregiver',
          featurePreferences: ['medical_tracking', 'caregiving', 'vitals', 'medications'],
          kitchenMode: 'self',
          mealLoggingMode: 'both',
          automationLevel: 'no',
          addFamilyNow: false,
          completedAt: acceptedAt
        }
      }
    }, { merge: true })

    const createdMember: FamilyMember = {
      id: memberRef.id,
      ...familyMember
    }

    console.log(`Invitation ${invitationId} accepted by ${userId}, userMode set to 'caregiver'`)

    return NextResponse.json({
      success: true,
      data: createdMember,
      message: 'Invitation accepted successfully'
    })
  } catch (error: any) {
    return errorResponse(error: any, {
      route: '/api/invitations/[invitationId]/accept',
      operation: 'create'
    })
  }
}
