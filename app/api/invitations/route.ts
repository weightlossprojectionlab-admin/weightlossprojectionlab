/**
 * Family Invitations API
 *
 * POST /api/invitations - Send a new invitation
 * GET /api/invitations - List sent and received invitations
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { errorResponse, unauthorizedResponse, validationError } from '@/lib/api-response'
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
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult) {
      return unauthorizedResponse()
    }
    const userId = authResult.userId

    // Get user profile for email. Prefer the VERIFIED auth email (always
    // present) over the users-doc email, which some accounts are missing —
    // without this, `recipientEmail == ''` matches nothing and the inbox is
    // silently empty. Mirrors the accept route's same fallback.
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const userEmail = authResult.email || userData?.email || ''

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

    // Enrich each received invite with WHO you'd help + WHO is asking, so the
    // inbox card can show a real decision (names, not just a count). Resolved
    // server-side with the admin SDK because the recipient has no client read
    // access to the inviter's patients until they accept. Display-only.
    const receivedInvitations = await Promise.all(
      receivedSnapshot.docs.map(async (doc) => {
        const inv = { id: doc.id, ...doc.data() } as FamilyInvitation

        const patientNames: string[] = []
        for (const patientId of inv.patientsShared || []) {
          let patientDoc = await adminDb.collection('patients').doc(patientId).get()
          if (!patientDoc.exists) {
            patientDoc = await adminDb
              .collection('users')
              .doc(inv.invitedByUserId)
              .collection('patients')
              .doc(patientId)
              .get()
          }
          if (patientDoc.exists) {
            const p = patientDoc.data()
            patientNames.push(p?.nickname || p?.firstName || p?.name || 'Someone')
          }
        }

        let invitedByEmail = ''
        try {
          const inviterDoc = await adminDb.collection('users').doc(inv.invitedByUserId).get()
          invitedByEmail = inviterDoc.data()?.email || ''
        } catch {
          // best-effort — the card falls back to the stored invitedByName
        }

        return { ...inv, patientNames, invitedByEmail } as FamilyInvitation
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        sent: sentInvitations,
        received: receivedInvitations
      }
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/invitations', operation: 'list' })
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
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult) {
      return unauthorizedResponse()
    }
    const userId = authResult.userId

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

    // Is the recipient ALREADY an accepted caregiver of this owner? If so this
    // is a new-patient assignment, not a first-contact invite — deliver it
    // in-app (their invitation inbox) instead of re-onboarding them by email.
    const acceptedMembersSnap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('familyMembers')
      .where('status', '==', 'accepted')
      .get()
    const recipientLower = validatedData.recipientEmail.trim().toLowerCase()
    const isExistingCaregiver = acceptedMembersSnap.docs.some(
      (d) => (d.data().email || '').trim().toLowerCase() === recipientLower
    )
    const deliveryMethod: 'email' | 'in_app' = isExistingCaregiver ? 'in_app' : 'email'

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
      deliveryMethod,
      ...(deliveryMethod === 'email' && { emailSentAt: now }) // only email invites get an email timestamp
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

    // Send invitation email — SKIPPED for in-app assignments to an existing
    // caregiver (it lands in their inbox instead).
    let emailSent = false
    let emailError = null
    if (deliveryMethod === 'email') {
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
        emailSent = true
      } catch (error: any) {
        console.error('Failed to send invitation email:', error)
        emailError = error.message
        // Don't fail the whole request if email fails - invitation is still created
      }
    }

    return NextResponse.json({
      success: true,
      data: createdInvitation,
      // deliveredInApp lets the client show "added to their inbox" instead of an
      // email-delivery message (or a false "email failed" warning).
      deliveredInApp: deliveryMethod === 'in_app',
      message:
        deliveryMethod === 'in_app'
          ? `Added to ${validatedData.recipientEmail}'s invitation inbox`
          : emailSent
            ? `Invitation sent to ${validatedData.recipientEmail}`
            : `Invitation created for ${validatedData.recipientEmail}. Share code: ${inviteCode}`,
      emailSent,
      emailError,
      inviteCode // Include invite code in response for easy sharing
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return validationError('Invalid invitation data', error.errors)
    }

    return errorResponse(error, { route: '/api/invitations', operation: 'create' })
  }
}
