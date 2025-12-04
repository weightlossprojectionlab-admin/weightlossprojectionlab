/**
 * Family Invitations API
 *
 * POST /api/invitations - Send a new invitation
 * GET /api/invitations - List sent and received invitations
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { familyInvitationFormSchema } from '@/lib/validations/medical'
import { generateInviteCode } from '@/lib/invite-code-generator'
import { sendFamilyInvitationEmail } from '@/lib/email-service'
import type { FamilyInvitation } from '@/types/medical'

/**
 * GET /api/invitations
 * Returns both sent and received invitations
 */
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

    // Get user profile for email
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const userEmail = userData?.email || decodedToken.email || ''

    // Query sent invitations
    const sentSnapshot = await adminDb
      .collection('familyInvitations')
      .where('invitedByUserId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    const sentInvitations = sentSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FamilyInvitation[]

    // Query received invitations
    const receivedSnapshot = await adminDb
      .collection('familyInvitations')
      .where('recipientEmail', '==', userEmail)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get()

    const receivedInvitations = receivedSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FamilyInvitation[]

    return NextResponse.json({
      success: true,
      data: {
        sent: sentInvitations,
        received: receivedInvitations
      }
    })
  } catch (error: any) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/invitations
 * Send a new family invitation
 */
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()
    console.log('[Invitations API] Request body:', body)

    let validatedData
    try {
      validatedData = familyInvitationFormSchema.parse(body)
    } catch (validationError: any) {
      console.error('[Invitations API] Validation error:', validationError)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid invitation data',
          details: validationError.errors || validationError.message
        },
        { status: 400 }
      )
    }

    // Get user profile for name
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const userName = userData?.displayName || userData?.name || 'A family member'

    // Verify user owns the patients being shared
    // Check both root-level and user-nested locations for backwards compatibility
    for (const patientId of validatedData.patientsShared) {
      // Try root level first
      let patientDoc = await adminDb
        .collection('patients')
        .doc(patientId)
        .get()

      // If not found at root, try nested under user
      if (!patientDoc.exists) {
        patientDoc = await adminDb
          .collection('users')
          .doc(userId)
          .collection('patients')
          .doc(patientId)
          .get()
      }

      console.log('[Invitations API] Patient check:', {
        patientId,
        exists: patientDoc.exists,
        patientUserId: patientDoc.data()?.userId,
        currentUserId: userId,
        matches: patientDoc.data()?.userId === userId || patientDoc.exists // If nested, it's owned by this user
      })

      if (!patientDoc.exists) {
        return NextResponse.json(
          { success: false, error: `Patient ${patientId} not found in database` },
          { status: 404 }
        )
      }

      // For root-level patients, check userId matches
      // For nested patients, they're already owned by this user (by virtue of the path)
      const isRootLevel = patientDoc.ref.path.startsWith('patients/')
      if (isRootLevel && patientDoc.data()?.userId !== userId) {
        return NextResponse.json(
          {
            success: false,
            error: `You don't have permission to share patient ${patientId}`,
            details: `Patient belongs to user ${patientDoc.data()?.userId}, but you are ${userId}`
          },
          { status: 403 }
        )
      }
    }

    // Check for existing pending invitation to same email
    const existingSnapshot = await adminDb
      .collection('familyInvitations')
      .where('invitedByUserId', '==', userId)
      .where('recipientEmail', '==', validatedData.recipientEmail)
      .where('status', '==', 'pending')
      .get()

    if (!existingSnapshot.empty) {
      const existingInvitation = {
        id: existingSnapshot.docs[0].id,
        ...existingSnapshot.docs[0].data()
      }
      return NextResponse.json(
        {
          success: false,
          error: 'You already have a pending invitation to this email address',
          details: { existingInvitation }
        },
        { status: 400 }
      )
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode()
    let codeExists = true
    let attempts = 0
    const maxAttempts = 10

    while (codeExists && attempts < maxAttempts) {
      const codeSnapshot = await adminDb
        .collection('familyInvitations')
        .where('inviteCode', '==', inviteCode)
        .where('status', 'in', ['pending', 'accepted'])
        .get()

      if (codeSnapshot.empty) {
        codeExists = false
      } else {
        inviteCode = generateInviteCode()
        attempts++
      }
    }

    if (codeExists) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate unique invite code. Please try again.' },
        { status: 500 }
      )
    }

    // Create invitation
    const now = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    const invitation: Omit<FamilyInvitation, 'id'> = {
      inviteCode,
      invitedByUserId: userId,
      invitedByName: userName,
      recipientEmail: validatedData.recipientEmail,
      ...(validatedData.recipientPhone && { recipientPhone: validatedData.recipientPhone }),
      patientsShared: validatedData.patientsShared,
      permissions: validatedData.permissions as any, // Will be filled with defaults from schema
      ...(validatedData.message && { message: validatedData.message }),
      createdAt: now,
      expiresAt,
      status: 'pending',
      emailSentAt: now // TODO: Integrate email service
    }

    const invitationRef = await adminDb.collection('familyInvitations').add(invitation)
    const createdInvitation: FamilyInvitation = {
      id: invitationRef.id,
      ...invitation
    }

    console.log(`Invitation created: ${invitationRef.id} from ${userId} to ${validatedData.recipientEmail}`)

    // Get patient names for the email
    const patientNames: string[] = []
    for (const patientId of validatedData.patientsShared) {
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
        recipientEmail: validatedData.recipientEmail,
        inviterName: userName,
        inviteCode,
        patientNames,
        message: validatedData.message,
        expiresAt
      })
      console.log(`Invitation email sent to ${validatedData.recipientEmail}`)
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Don't fail the whole request if email fails - invitation is still created
    }

    return NextResponse.json({
      success: true,
      data: createdInvitation,
      message: `Invitation sent to ${validatedData.recipientEmail}`
    })
  } catch (error: any) {
    console.error('Error creating invitation:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create invitation' },
      { status: 500 }
    )
  }
}
