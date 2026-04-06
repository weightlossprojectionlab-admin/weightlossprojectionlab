/**
 * PATCH /api/tenant/branding
 *
 * Franchise owners (or super admins) update their tenant branding.
 * Validates and writes only the four allowed branding fields — no
 * privilege escalation by writing arbitrary tenant fields.
 *
 * Auth: lib/tenant-auth.ts verifyTenantAdminAuth — accepts either a
 * franchise_admin claim matching the tenantId, or a super admin (role: 'admin').
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase-admin'
import { verifyTenantAdminAuth } from '@/lib/tenant-auth'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'

interface BrandingPayload {
  logoUrl?: string
  primaryColor?: string
  companyName?: string
  supportEmail?: string
}

function sanitize(input: any): BrandingPayload {
  const out: BrandingPayload = {}
  if (typeof input?.logoUrl === 'string') out.logoUrl = input.logoUrl.trim().slice(0, 2000)
  if (typeof input?.primaryColor === 'string') out.primaryColor = input.primaryColor.trim().slice(0, 64)
  if (typeof input?.companyName === 'string') out.companyName = input.companyName.trim().slice(0, 200)
  if (typeof input?.supportEmail === 'string') out.supportEmail = input.supportEmail.trim().slice(0, 320)
  return out
}

export async function PATCH(request: NextRequest) {
  try {
    const verification = await verifyTenantAdminAuth(request.headers.get('authorization'))
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error || 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const requestedTenantId: string | undefined = body.tenantId
    if (!requestedTenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    // Tenant admins can only edit their own tenant. Super admins can edit any.
    if (!verification.isSuperAdmin && verification.tenantId !== requestedTenantId) {
      return NextResponse.json({ error: 'Forbidden — wrong tenant' }, { status: 403 })
    }

    const branding = sanitize(body.branding)
    if (Object.keys(branding).length === 0) {
      return NextResponse.json({ error: 'No branding fields supplied' }, { status: 400 })
    }

    const tenantRef = adminDb.collection('tenants').doc(requestedTenantId)
    const tenantDoc = await tenantRef.get()
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
    for (const [k, v] of Object.entries(branding)) {
      updates[`branding.${k}`] = v
    }
    await tenantRef.update(updates)

    await logAdminAction({
      adminUid: verification.uid,
      adminEmail: verification.email,
      action: 'tenant_branding_updated',
      targetType: 'tenant',
      targetId: requestedTenantId,
      tenantId: requestedTenantId,
      changes: branding,
      reason: verification.isSuperAdmin ? 'super-admin edit' : 'franchise owner self-serve edit',
    })

    // Re-render the public landing page so the new branding is visible immediately.
    revalidatePath('/tenant-shell')
    revalidatePath('/tenant-shell/dashboard')

    logger.info('[Tenant Branding] Updated', {
      tenantId: requestedTenantId,
      uid: verification.uid,
      fields: Object.keys(branding),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('[Tenant Branding] PATCH failed', err as Error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
