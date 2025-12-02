/**
 * Revoke Family Invitation API
 *
 * POST /api/invitations/[invitationId]/revoke
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { FamilyInvitation } from '@/types/medical'
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

    // Verify user is the one who sent the invitation
    if (invitation.invitedByUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only revoke invitations you sent' },
        { status: 403 }
      )
    }

    // Verify invitation is still pending
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Cannot revoke ${invitation.status} invitation` },
        { status: 400 }
      )
    }

    // Update invitation status
    await invitationRef.update({
      status: 'revoked'
    })

    console.log(`Invitation ${invitationId} revoked by ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Invitation revoked'
    })
  } catch (error: any) {
    return errorResponse(error: any, {
      route: '/api/invitations/[invitationId]/revoke',
      operation: 'create'
    })
  }
}
