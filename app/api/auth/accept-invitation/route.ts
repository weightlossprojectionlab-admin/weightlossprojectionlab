/**
 * POST /api/auth/accept-invitation
 *
 * Phase B slice 4: token-based staff acceptance flow.
 *
 * The staff member clicks the magic link from their invitation email
 * (`/auth/accept-invitation?token=...&tenant=...`). The client page POSTs
 * the token here. This endpoint:
 *
 *   1. Validates the token + tenant against the invitation doc
 *   2. Verifies the invitation is still pending and not expired
 *   3. Get-or-creates a Firebase Auth user for the invitation email
 *   4. Sets custom claims `{ tenantId, tenantRole: 'franchise_staff' }`
 *   5. Mints a Firebase custom token (with claims baked in for immediate use)
 *   6. Flips invitation status to 'accepted' and stamps the uid
 *   7. Returns { token, tenantSlug } for the client to signInWithCustomToken
 *
 * No Bearer auth required — the bearer of the random 32-byte token IS the
 * authentication. Same shape as a one-time password.
 *
 * Token lookup uses Firebase Admin (bypasses Firestore Rules) so the
 * unauthenticated client can never read the invitation doc directly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const tenantId = typeof body?.tenantId === 'string' ? body.tenantId.trim() : ''

    if (!token || !tenantId) {
      return NextResponse.json(
        { error: 'token and tenantId are required' },
        { status: 400 }
      )
    }

    // Defensive: 64-hex-char token format check.
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }

    const invitationRef = adminDb
      .collection('tenants')
      .doc(tenantId)
      .collection('invitations')
      .doc(token)
    const invitationSnap = await invitationRef.get()
    if (!invitationSnap.exists) {
      return NextResponse.json(
        { error: 'This invitation link is invalid or has been revoked.' },
        { status: 404 }
      )
    }

    const invitation = invitationSnap.data() as any

    if (invitation.status === 'revoked') {
      return NextResponse.json(
        { error: 'This invitation has been revoked. Ask your administrator for a new one.' },
        { status: 410 }
      )
    }
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted. Sign in normally.' },
        { status: 409 }
      )
    }

    // Expiration check
    const expiresAt = invitation.expiresAt ? new Date(invitation.expiresAt).getTime() : 0
    if (!expiresAt || expiresAt < Date.now()) {
      return NextResponse.json(
        { error: 'This invitation has expired. Ask your administrator for a new one.' },
        { status: 410 }
      )
    }

    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get()
    if (!tenantSnap.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    const tenant = tenantSnap.data() as any

    const inviteEmail: string = invitation.email
    if (!inviteEmail) {
      return NextResponse.json({ error: 'Invitation has no email' }, { status: 500 })
    }

    // Get-or-create the Firebase Auth user. Mirrors the franchise webhook
    // owner-provisioning pattern.
    let userRecord
    try {
      userRecord = await adminAuth.getUserByEmail(inviteEmail)
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        userRecord = await adminAuth.createUser({
          email: inviteEmail,
          emailVerified: true,
          displayName: inviteEmail,
        })
        logger.info('[accept-invitation] created auth user for new staff', {
          uid: userRecord.uid,
          email: inviteEmail,
          tenantId,
        })
      } else {
        throw err
      }
    }

    // Set persistent custom claims so future sign-ins (e.g. from another
    // device that doesn't have the custom token) also resolve as staff.
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      tenantId,
      tenantRole: 'franchise_staff',
    })

    // Mint a custom token with the same claims embedded. This is the same
    // pattern the dev sign-in helper uses — claims are present immediately
    // on signInWithCustomToken without needing a token refresh round-trip.
    const customToken = await adminAuth.createCustomToken(userRecord.uid, {
      tenantId,
      tenantRole: 'franchise_staff',
    })

    // Flip invitation to accepted.
    await invitationRef.update({
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
      acceptedByUid: userRecord.uid,
    })

    // Audit log under the inviter so the trail still shows who authorized
    // the seat. The targetId is the new staff uid for queryability.
    await logAdminAction({
      adminUid: invitation.invitedBy || 'unknown',
      adminEmail: invitation.invitedByEmail || 'unknown',
      action: 'tenant_staff_accepted',
      targetType: 'user',
      targetId: userRecord.uid,
      tenantId,
      changes: { invitedEmail: inviteEmail, invitationId: token },
      reason: 'invited staff completed acceptance',
    })

    logger.info('[accept-invitation] staff accepted', {
      tenantId,
      invitationId: token,
      uid: userRecord.uid,
    })

    return NextResponse.json({
      success: true,
      token: customToken,
      tenantId,
      tenantSlug: tenant.slug,
      ownerEmail: inviteEmail,
    })
  } catch (err) {
    logger.error('[accept-invitation] failed', err as Error)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
