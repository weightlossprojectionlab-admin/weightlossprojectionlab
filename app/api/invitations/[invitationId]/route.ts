/**
 * Delete Family Invitation API
 *
 * DELETE /api/invitations/[invitationId]
 *
 * Hard-deletes a DEAD invitation record so it stops cluttering the sender's
 * Sent Invitations list. Only the sender can delete, and only terminal-state
 * invitations are deletable:
 *   - revoked / declined  → dead by an explicit action
 *   - pending but past expiresAt → dead by timeout
 * Accepted invitations are kept as the audit trail of who was granted access;
 * active (unexpired) pending invitations must be revoked first.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { FamilyInvitation } from '@/types/medical'

export async function DELETE(
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

    // Only the sender can delete their invitation
    if (invitation.invitedByUserId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete invitations you sent' },
        { status: 403 }
      )
    }

    // Only terminal-state invitations are deletable.
    const isExpired = invitation.expiresAt
      ? new Date(invitation.expiresAt).getTime() < Date.now()
      : false
    const isDeletable =
      invitation.status === 'revoked' ||
      invitation.status === 'declined' ||
      invitation.status === 'expired' ||
      (invitation.status === 'pending' && isExpired)

    if (!isDeletable) {
      const reason =
        invitation.status === 'accepted'
          ? 'Accepted invitations are kept as a record of granted access'
          : `Revoke this invitation before deleting it`
      return NextResponse.json(
        { success: false, error: reason },
        { status: 400 }
      )
    }

    await invitationRef.delete()

    console.log(`Invitation ${invitationId} deleted by ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Invitation deleted'
    })
  } catch (error: any) {
    console.error('Error deleting invitation:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete invitation' },
      { status: 500 }
    )
  }
}
