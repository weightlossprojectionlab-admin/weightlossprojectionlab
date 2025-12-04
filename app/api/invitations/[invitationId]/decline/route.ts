/**
 * Decline Family Invitation API
 *
 * POST /api/invitations/[invitationId]/decline
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { FamilyInvitation } from '@/types/medical'

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

    // Get user email
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const userEmail = userData?.email || decodedToken.email || ''

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

    // Update invitation status
    await invitationRef.update({
      status: 'declined'
    })

    console.log(`Invitation ${invitationId} declined by ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Invitation declined'
    })
  } catch (error: any) {
    console.error('Error declining invitation:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to decline invitation' },
      { status: 500 }
    )
  }
}
