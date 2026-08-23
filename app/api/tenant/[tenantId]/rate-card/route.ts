/**
 * Agency rate-card endpoint (white-label, agency-side).
 *
 *   GET  /api/tenant/[tenantId]/rate-card  → the tenant's rate card (or the
 *                                            shipped defaults if uncustomized)
 *   PUT  /api/tenant/[tenantId]/rate-card  → save the tenant's rate card
 *
 * Auth: verifyTenantAdminAuth — pricing is owner-level config (mirrors packages/
 * branding), so franchise_admin or super-admin only, not staff. Stored as a
 * field on the tenant doc; DEFAULT_RATE_CARD is the single source of the seed,
 * so a tenant that never customizes carries no copy to drift.
 */

import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyTenantAdminAuth } from '@/lib/tenant-auth'
import {
  errorResponse,
  successResponse,
  forbiddenResponse,
  validationError,
} from '@/lib/api-response'
import { getRateCard, sanitizeRateCard } from '@/lib/rate-card'

interface RouteContext {
  params: Promise<{ tenantId: string }>
}

const ROUTE = '/api/tenant/[tenantId]/rate-card'

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId } = await context.params
    const verification = await verifyTenantAdminAuth(request.headers.get('authorization'))
    if (!verification.ok) return forbiddenResponse(verification.error || 'Forbidden')
    if (!verification.isSuperAdmin && verification.tenantId !== tenantId) {
      return forbiddenResponse('Forbidden — wrong tenant')
    }

    const snap = await adminDb.collection('tenants').doc(tenantId).get()
    const data = snap.data() as { rateCard?: unknown } | undefined
    // getRateCard falls back to DEFAULT_RATE_CARD when the tenant hasn't saved one.
    const rateCard = getRateCard((data?.rateCard as any) ?? null)
    return successResponse({ rateCard })
  } catch (err) {
    return errorResponse(err, { route: ROUTE, operation: 'get' })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId } = await context.params
    const verification = await verifyTenantAdminAuth(request.headers.get('authorization'))
    if (!verification.ok) return forbiddenResponse(verification.error || 'Forbidden')
    if (!verification.isSuperAdmin && verification.tenantId !== tenantId) {
      return forbiddenResponse('Forbidden — wrong tenant')
    }

    const body = await request.json().catch(() => ({}))
    const clean = sanitizeRateCard(body?.rateCard)
    if (!clean) return validationError('Invalid rate card')

    await adminDb
      .collection('tenants')
      .doc(tenantId)
      .set({ rateCard: clean, updatedAt: new Date().toISOString() }, { merge: true })

    return successResponse({ rateCard: clean })
  } catch (err) {
    return errorResponse(err, { route: ROUTE, operation: 'save' })
  }
}
