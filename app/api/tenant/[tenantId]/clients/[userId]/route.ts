/**
 * A managed client's full detail (white-label CRM workspace).
 *
 *   GET /api/tenant/[tenantId]/clients/[userId] → { client, appointments, careTasks }
 *
 * SECURITY: this is how the client workspace loads its data CLIENT-side, so the
 * PII/PHI (name/email/phone, practiceNotes, per-patient health) is NOT
 * server-rendered into the RSC payload of a route with only a client-side auth
 * guard. Gated by verifyTenantStaffOrAdminAuth + tenant match; loadClientDetail
 * additionally enforces the client is managedBy this tenant (returns 404 if not).
 */

import { NextRequest } from 'next/server'
import { verifyTenantStaffOrAdminAuth } from '@/lib/tenant-auth'
import {
  loadClientDetail,
  loadClientAppointments,
  loadClientDuties,
} from '@/app/tenant-shell/dashboard/_lib/load-families'
import { errorResponse, successResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-response'

interface RouteContext {
  params: Promise<{ tenantId: string; userId: string }>
}

const ROUTE = '/api/tenant/[tenantId]/clients/[userId]'

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId, userId } = await context.params

    const v = await verifyTenantStaffOrAdminAuth(request.headers.get('authorization'))
    if (!v.ok) return forbiddenResponse(v.error || 'Forbidden')
    if (!v.isSuperAdmin && v.tenantId !== tenantId) {
      return forbiddenResponse('Forbidden — wrong tenant')
    }

    // loadClientDetail returns null unless the client is managedBy this tenant.
    const client = await loadClientDetail(tenantId, userId)
    if (!client) return notFoundResponse('Client')

    const [appointments, careTasks] = await Promise.all([
      loadClientAppointments(tenantId, userId),
      loadClientDuties(tenantId, userId),
    ])

    return successResponse({ client, appointments, careTasks })
  } catch (err) {
    return errorResponse(err, { route: ROUTE, operation: 'get' })
  }
}
