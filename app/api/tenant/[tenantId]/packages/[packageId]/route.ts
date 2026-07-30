/**
 * Single care-package endpoint (white-label).
 *
 *   PATCH  /api/tenant/[tenantId]/packages/[packageId]  → update a package
 *   DELETE /api/tenant/[tenantId]/packages/[packageId]  → delete a package
 *
 * Auth: verifyTenantAdminAuth — owner-level (mirrors the branding endpoint).
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
import { normalizePackageInput } from '@/lib/care-packages'
import type { CarePackage } from '@/types/tenant'

interface RouteContext {
  params: Promise<{ tenantId: string; packageId: string }>
}

const ROUTE = '/api/tenant/[tenantId]/packages/[packageId]'

async function authorize(request: NextRequest, tenantId: string) {
  const verification = await verifyTenantAdminAuth(request.headers.get('authorization'))
  if (!verification.ok) return { error: forbiddenResponse(verification.error || 'Forbidden') }
  if (!verification.isSuperAdmin && verification.tenantId !== tenantId) {
    return { error: forbiddenResponse('Forbidden — wrong tenant') }
  }
  return { ok: true as const }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId, packageId } = await context.params
    const auth = await authorize(request, tenantId)
    if ('error' in auth) return auth.error

    const ref = adminDb
      .collection('tenants')
      .doc(tenantId)
      .collection('carePackages')
      .doc(packageId)
    const snap = await ref.get()
    if (!snap.exists) return notFoundResponse('Package')

    const body = await request.json().catch(() => ({}))
    const parsed = normalizePackageInput(body)
    if (!parsed.ok) return validationError(parsed.error)

    const nowIso = new Date().toISOString()
    await ref.set({ ...parsed.value, updatedAt: nowIso }, { merge: true })

    const updated = { ...(snap.data() as Omit<CarePackage, 'id'>), ...parsed.value, id: packageId, updatedAt: nowIso }
    return successResponse({ package: updated })
  } catch (err) {
    return errorResponse(err, { route: ROUTE, operation: 'update' })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId, packageId } = await context.params
    const auth = await authorize(request, tenantId)
    if ('error' in auth) return auth.error

    const ref = adminDb
      .collection('tenants')
      .doc(tenantId)
      .collection('carePackages')
      .doc(packageId)
    const snap = await ref.get()
    if (!snap.exists) return notFoundResponse('Package')

    await ref.delete()
    return successResponse({ deleted: packageId })
  } catch (err) {
    return errorResponse(err, { route: ROUTE, operation: 'delete' })
  }
}
