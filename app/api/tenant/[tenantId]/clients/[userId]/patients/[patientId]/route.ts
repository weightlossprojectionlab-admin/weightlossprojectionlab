/**
 * A managed client's patient detail — PHI (white-label CRM).
 *
 *   GET /api/tenant/[tenantId]/clients/[userId]/patients/[patientId] → { patient }
 *
 * SECURITY: this is how the patient-detail view loads its PHI (weight series,
 * vitals, medications + dosage) CLIENT-side, so it is NOT server-rendered into
 * the RSC payload of a route that only has a client-side auth guard. Gated by
 * verifyTenantStaffOrAdminAuth + tenant match; loadPatientDetail additionally
 * enforces the client is managedBy this tenant AND the patient lives under that
 * client (returns 404 otherwise).
 */

import { NextRequest } from 'next/server'
import { verifyTenantStaffOrAdminAuth } from '@/lib/tenant-auth'
import { loadPatientDetail } from '@/app/tenant-shell/dashboard/_lib/load-families'
import { errorResponse, successResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-response'

interface RouteContext {
  params: Promise<{ tenantId: string; userId: string; patientId: string }>
}

const ROUTE = '/api/tenant/[tenantId]/clients/[userId]/patients/[patientId]'

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId, userId, patientId } = await context.params

    const v = await verifyTenantStaffOrAdminAuth(request.headers.get('authorization'))
    if (!v.ok) return forbiddenResponse(v.error || 'Forbidden')
    if (!v.isSuperAdmin && v.tenantId !== tenantId) {
      return forbiddenResponse('Forbidden — wrong tenant')
    }

    const patient = await loadPatientDetail(tenantId, userId, patientId)
    if (!patient) return notFoundResponse('Patient')

    return successResponse({ patient })
  } catch (err) {
    return errorResponse(err, { route: ROUTE, operation: 'get' })
  }
}
