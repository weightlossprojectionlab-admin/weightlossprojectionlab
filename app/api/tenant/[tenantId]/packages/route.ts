/**
 * Care-package collection endpoint (white-label).
 *
 *   GET  /api/tenant/[tenantId]/packages  → list the tenant's care packages
 *   POST /api/tenant/[tenantId]/packages  → create a care package
 *
 * Auth: verifyTenantAdminAuth — pricing is owner-level config (mirrors the
 * branding endpoint), so franchise_admin or super-admin only, not staff.
 */

import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyTenantAdminAuth } from '@/lib/tenant-auth'
import {
  errorResponse,
  successResponse,
  forbiddenResponse,
  validationError,
  notFoundResponse,
} from '@/lib/api-response'
import { normalizePackageInput, sortPackages } from '@/lib/care-packages'
import type { CarePackage } from '@/types/tenant'

interface RouteContext {
  params: Promise<{ tenantId: string }>
}

const ROUTE = '/api/tenant/[tenantId]/packages'

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId } = await context.params
    const verification = await verifyTenantAdminAuth(request.headers.get('authorization'))
    if (!verification.ok) return forbiddenResponse(verification.error || 'Forbidden')
    if (!verification.isSuperAdmin && verification.tenantId !== tenantId) {
      return forbiddenResponse('Forbidden — wrong tenant')
    }

    const snap = await adminDb
      .collection('tenants')
      .doc(tenantId)
      .collection('carePackages')
      .get()

    const packages = sortPackages(
      snap.docs.map(d => ({ ...(d.data() as Omit<CarePackage, 'id'>), id: d.id })),
    )
    return successResponse({ packages })
  } catch (err) {
    return errorResponse(err, { route: ROUTE, operation: 'list' })
  }
}

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
    const parsed = normalizePackageInput(body)
    if (!parsed.ok) return validationError(parsed.error)

    const nowIso = new Date().toISOString()
    const ref = tenantRef.collection('carePackages').doc()
    const pkg: CarePackage = {
      ...parsed.value,
      id: ref.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    }
    await ref.set(pkg)

    return successResponse({ package: pkg }, 201)
  } catch (err) {
    return errorResponse(err, { route: ROUTE, operation: 'create' })
  }
}
