/**
 * Public API endpoint to verify invitation codes
 * Does not require authentication - allows unauthenticated users to view invitation details
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { errorResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'Invitation code is required' },
        { status: 400 }
      )
    }

    // Search for invitation by code
    const db = getAdminDb()
    const invitationsSnapshot = await db
      .collection('familyInvitations')
      .where('inviteCode', '==', code.toUpperCase().trim())
      .limit(1)
      .get()

    if (invitationsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Invalid invite code. Please check the code and try again.' },
        { status: 404 }
      )
    }

    const invitationDoc = invitationsSnapshot.docs[0]
    const invitationData = invitationDoc.data()

    // Convert Firestore timestamps to ISO strings for JSON serialization
    const invitation = {
      id: invitationDoc.id,
      ...invitationData,
      createdAt: invitationData.createdAt?.toDate?.()?.toISOString() || invitationData.createdAt,
      updatedAt: invitationData.updatedAt?.toDate?.()?.toISOString() || invitationData.updatedAt,
      expiresAt: invitationData.expiresAt?.toDate?.()?.toISOString() || invitationData.expiresAt,
      emailSentAt: invitationData.emailSentAt?.toDate?.()?.toISOString() || invitationData.emailSentAt,
      acceptedAt: invitationData.acceptedAt?.toDate?.()?.toISOString() || invitationData.acceptedAt,
      declinedAt: invitationData.declinedAt?.toDate?.()?.toISOString() || invitationData.declinedAt
    }

    return NextResponse.json(invitation)
  } catch (error) {
    return errorResponse(error, {
      route: '/api/invitations/verify',
      operation: 'fetch'
    })
  }
}
