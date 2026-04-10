/**
 * /api/tenant/[tenantId]/invitations
 *
 * Phase B slice 4: franchise admin invites a staff member by email.
 *
 *   POST   create an invitation, send the acceptance email
 *   GET    list invitations for this tenant (pending + accepted + revoked)
 *
 * Auth: verifyTenantAdminAuth (admin-only). Staff cannot invite more staff
 * — that's an owner-only privilege. Super admins can invite for any tenant.
 *
 * Schema (tenants/{tenantId}/invitations/{invitationId}):
 *   {
 *     id: string,            // doc id, doubles as the acceptance token
 *     tenantId: string,
 *     email: string,         // lowercased
 *     role: 'franchise_staff',
 *     status: 'pending' | 'accepted' | 'revoked',
 *     invitedBy: string,     // uid of inviter
 *     invitedByEmail: string,
 *     invitedAt: string,     // ISO
 *     expiresAt: string,     // ISO, +7 days
 *     acceptedAt?: string,
 *     acceptedByUid?: string,
 *   }
 *
 * The doc id is the acceptance token. It's a 32-byte random hex string
 * (256 bits), generated server-side. Long-lived enough to email but short
 * enough to fit in a URL.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyTenantAdminAuth } from '@/lib/tenant-auth'
import { logAdminAction } from '@/lib/admin/audit'
import { getPlanLimits } from '@/lib/franchise-plans'
import { sendEmail } from '@/lib/email-service'
import { logger } from '@/lib/logger'
import { randomBytes } from 'crypto'

interface RouteContext {
  params: Promise<{ tenantId: string }>
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (url) return url.replace(/\/$/, '')
  return process.env.NODE_ENV === 'production'
    ? 'https://www.wellnessprojectionlab.com'
    : 'http://localhost:3000'
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId } = await context.params
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const verification = await verifyTenantAdminAuth(request.headers.get('authorization'))
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error || 'Forbidden' }, { status: 403 })
    }
    if (!verification.isSuperAdmin && verification.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden — wrong tenant' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!rawEmail) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }
    if (rawEmail.length > 254 || !EMAIL_RE.test(rawEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }
    if (rawEmail === verification.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'You cannot invite yourself.' },
        { status: 400 }
      )
    }

    const tenantRef = adminDb.collection('tenants').doc(tenantId)
    const tenantSnap = await tenantRef.get()
    if (!tenantSnap.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }
    const tenant = tenantSnap.data() as any

    // Generate the acceptance token (also the doc id) — needs to exist
    // before the transaction so we can refer to the new invitation ref.
    const token = randomBytes(32).toString('hex')
    const nowIso = new Date().toISOString()
    const expiresAtIso = new Date(Date.now() + INVITATION_TTL_MS).toISOString()
    const invitationRef = tenantRef.collection('invitations').doc(token)

    // Atomic seat-limit check + duplicate check + counter increment +
    // invitation create. Pending invitations count toward the staff seat
    // cap so an admin can't oversubscribe by spamming invites.
    type InviteError = { status: number; message: string }
    let inviteError: InviteError | null = null
    try {
      await adminDb.runTransaction(async tx => {
        const tenantTxSnap = await tx.get(tenantRef)
        if (!tenantTxSnap.exists) {
          inviteError = { status: 404, message: 'Tenant not found' }
          throw new Error('TENANT_GONE')
        }
        const tenantData = tenantTxSnap.data() as any

        // Duplicate-pending check inside the transaction so two concurrent
        // invites for the same email can't both win.
        const dupSnap = await tx.get(
          tenantRef
            .collection('invitations')
            .where('email', '==', rawEmail)
            .where('status', '==', 'pending')
            .limit(1)
        )
        if (!dupSnap.empty) {
          inviteError = {
            status: 409,
            message:
              'There is already a pending invitation for that email. Revoke it first if you want to send a new one.',
          }
          throw new Error('DUPLICATE_PENDING')
        }

        // Seat limit. Snapshotted maxSeats wins, fallback to plan default.
        const currentSeats: number = tenantData?.billing?.currentSeats || 0
        const snapshotMax: number | undefined = tenantData?.billing?.maxSeats
        const limit =
          typeof snapshotMax === 'number' && snapshotMax >= 0
            ? snapshotMax
            : getPlanLimits(tenantData?.billing?.plan).maxSeats
        if (limit !== -1 && currentSeats >= limit) {
          inviteError = {
            status: 402,
            message:
              'Your staff seat limit is reached. Upgrade your plan to invite more staff.',
          }
          throw new Error('SEAT_LIMIT')
        }

        tx.set(invitationRef, {
          id: token,
          tenantId,
          email: rawEmail,
          role: 'franchise_staff',
          status: 'pending',
          invitedBy: verification.uid,
          invitedByEmail: verification.email,
          invitedAt: nowIso,
          expiresAt: expiresAtIso,
        })
        tx.update(tenantRef, {
          'billing.currentSeats': FieldValue.increment(1),
        })
      })
    } catch (err) {
      if (inviteError) {
        return NextResponse.json({ error: inviteError.message }, { status: inviteError.status })
      }
      throw err
    }

    // Send the acceptance email via Resend.
    const businessName = tenant.branding?.companyName || tenant.name || 'your franchise'
    const acceptUrl = `${getAppUrl()}/auth/accept-invitation?token=${token}&tenant=${encodeURIComponent(
      tenantId
    )}`
    const inviterName = verification.email

    try {
      await sendEmail({
        to: rawEmail,
        subject: `You're invited to join ${businessName} on Wellness Projection Lab`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);padding:40px;text-align:center;">
<h1 style="color:#ffffff;font-size:26px;margin:0 0 8px;">You're Invited</h1>
<p style="color:rgba(255,255,255,0.95);font-size:16px;margin:0;">${businessName} added you as a staff member.</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">Hi there,</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">
${inviterName} invited you to join <strong>${businessName}</strong> as a staff member on Wellness Projection Lab.
Once you accept, you'll be able to view and manage the families your practice cares for.
</p>
<table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td align="center" style="background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);border-radius:8px;padding:16px 40px;">
<a href="${acceptUrl}" style="color:#ffffff;text-decoration:none;font-size:18px;font-weight:600;">Accept Invitation →</a>
</td></tr>
</table>
<p style="font-size:13px;color:#6b7280;line-height:1.6;margin:24px 0 0;">
This invitation expires in 7 days. If you weren't expecting this email, you can safely ignore it.
</p>
<p style="font-size:13px;color:#6b7280;line-height:1.6;margin:8px 0 0;">
If the button doesn't work, paste this URL into your browser:<br>
<a href="${acceptUrl}" style="color:#2563eb;word-break:break-all;">${acceptUrl}</a>
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
        text: `You're invited to join ${businessName} on Wellness Projection Lab.\n\n${inviterName} invited you as a staff member. Accept the invitation here:\n\n${acceptUrl}\n\nThis invitation expires in 7 days.`,
      })
    } catch (emailErr) {
      // Don't fail the request if the email fails — the invitation doc is
      // already written, the admin can resend or copy the link manually.
      logger.error('[invitations] email send failed', emailErr as Error, {
        tenantId,
        email: rawEmail,
      })
    }

    await logAdminAction({
      adminUid: verification.uid,
      adminEmail: verification.email,
      action: 'tenant_staff_invited',
      targetType: 'tenant',
      targetId: tenantId,
      tenantId,
      changes: { invitedEmail: rawEmail, role: 'franchise_staff', token },
      reason: verification.isSuperAdmin
        ? 'super-admin staff invitation'
        : 'franchise owner staff invitation',
    })

    logger.info('[invitations] staff invitation created', {
      tenantId,
      adminUid: verification.uid,
      invitedEmail: rawEmail,
    })

    return NextResponse.json({
      success: true,
      invitationId: token,
      acceptUrl,
    })
  } catch (err) {
    logger.error('[invitations] POST failed', err as Error)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId } = await context.params
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const verification = await verifyTenantAdminAuth(request.headers.get('authorization'))
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error || 'Forbidden' }, { status: 403 })
    }
    if (!verification.isSuperAdmin && verification.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden — wrong tenant' }, { status: 403 })
    }

    const snap = await adminDb
      .collection('tenants')
      .doc(tenantId)
      .collection('invitations')
      .orderBy('invitedAt', 'desc')
      .limit(200)
      .get()

    const invitations = snap.docs.map(doc => {
      const d = doc.data() as any
      // Never leak the token to the client list view — knowing the token
      // means anyone can accept the invite. Only the invitee's email link
      // contains it.
      const { id, ...rest } = d
      return { ...rest, id: doc.id, token: undefined }
    })

    return NextResponse.json({ invitations })
  } catch (err) {
    logger.error('[invitations] GET failed', err as Error)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
