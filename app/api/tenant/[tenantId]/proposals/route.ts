/**
 * Proposal generation endpoint (white-label).
 *
 *   POST /api/tenant/[tenantId]/proposals  → snapshot the tenant's active
 *   care packages into a client-facing proposal and mint an unguessable
 *   share token. The agency sends the returned URL to a family.
 *
 * The tiers are FROZEN into packagesSnapshot at generation time, so editing a
 * package later never mutates an already-sent proposal. `tenantId` is stored on
 * the doc so the public page's collection-group token lookup can resolve
 * branding server-side (no broad client read rule needed).
 *
 * Auth: verifyTenantAdminAuth — owner-level (mirrors the branding endpoint).
 */

import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { adminDb } from '@/lib/firebase-admin'
import { verifyTenantAdminAuth } from '@/lib/tenant-auth'
import {
  errorResponse,
  successResponse,
  forbiddenResponse,
  validationError,
  notFoundResponse,
} from '@/lib/api-response'
import { sortPackages } from '@/lib/care-packages'
import type { CarePackage, ProposalRecord } from '@/types/tenant'

interface RouteContext {
  params: Promise<{ tenantId: string }>
}

const ROUTE = '/api/tenant/[tenantId]/proposals'

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId } = await context.params
    const verification = await verifyTenantAdminAuth(request.headers.get('authorization'))
    if (!verification.ok) return forbiddenResponse(verification.error || 'Forbidden')
    if (!verification.isSuperAdmin && verification.tenantId !== tenantId) {
      return forbiddenResponse('Forbidden — wrong tenant')
    }

    const tenantRef = adminDb.collection('tenants').doc(tenantId)
    const tenantSnap = await tenantRef.get()
    if (!tenantSnap.exists) return notFoundResponse('Tenant')

    const body = await request.json().catch(() => ({}))
    const clientName = typeof body?.clientName === 'string' ? body.clientName.trim().slice(0, 120) : ''
    const familyId = typeof body?.familyId === 'string' ? body.familyId : undefined

    // Snapshot the ACTIVE packages, sorted for display.
    const pkgSnap = await tenantRef.collection('carePackages').get()
    const active = sortPackages(
      pkgSnap.docs
        .map(d => ({ ...(d.data() as Omit<CarePackage, 'id'>), id: d.id }))
        .filter(p => p.active !== false),
    )
    if (active.length === 0) {
      return validationError('Add at least one active package before generating a proposal')
    }

    const shareToken = randomBytes(24).toString('hex')
    const nowIso = new Date().toISOString()
    // Top-level collection keyed by the unguessable share token, so the public
    // proposal page resolves it with an O(1) direct doc get — no collection-group
    // index needed. Tenant-private data (carePackages) stays in the tenant
    // subcollection; this shareable tokenized artifact lives at the top level.
    const ref = adminDb.collection('proposals').doc(shareToken)
    const proposal: ProposalRecord = {
      id: shareToken,
      tenantId,
      ...(familyId ? { familyId } : {}),
      ...(clientName ? { clientName } : {}),
      packagesSnapshot: active,
      shareToken,
      status: 'sent',
      createdAt: nowIso,
      createdBy: verification.uid,
    }
    await ref.set(proposal)

    return successResponse({ proposalId: ref.id, shareToken, url: `/pricing-proposal/${shareToken}` }, 201)
  } catch (err) {
    return errorResponse(err, { route: ROUTE, operation: 'create' })
  }
}
