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
import { errorResponse } from '@/lib/api-response'

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
    return errorResponse(error, {
      route: '/api/invitations',
      operation: 'fetch'
    })
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
    return errorResponse(validationError: any, {
      route: '/api/invitations',
      operation: 'create'
    })
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
    return errorResponse(emailError, {
      route: '/api/invitations',
      operation: 'create'
    })
  }
}
