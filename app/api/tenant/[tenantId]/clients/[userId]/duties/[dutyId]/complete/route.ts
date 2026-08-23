/**
 * Complete a managed client's household duty (white-label CRM — visit checklist).
 *
 *   POST /api/tenant/[tenantId]/clients/[userId]/duties/[dutyId]/complete
 *
 * A franchise staff/admin marks a care task done during a visit. Routes into the
 * SHARED completeDuty() service (single source for completion — writes a
 * duty_completions record, advances a recurring duty's nextDueDate) with the
 * assignment check bypassed, since the completer is authorized here by tenant
 * role + managedBy rather than by being in the duty's assignedTo.
 *
 * Auth: verifyTenantStaffOrAdminAuth + the caller's tenant manages the client
 * AND the duty belongs to that client (duty.userId === userId).
 */

import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyTenantStaffOrAdminAuth } from '@/lib/tenant-auth'
import { completeDuty } from '@/lib/duty-completion-service'
import {
  errorResponse,
  successResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/api-response'

interface RouteContext {
  params: Promise<{ tenantId: string; userId: string; dutyId: string }>
}

const ROUTE = '/api/tenant/[tenantId]/clients/[userId]/duties/[dutyId]/complete'

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId, userId, dutyId } = await context.params

    const v = await verifyTenantStaffOrAdminAuth(request.headers.get('authorization'))
    if (!v.ok) return forbiddenResponse(v.error || 'Forbidden')
    if (!v.isSuperAdmin && v.tenantId !== tenantId) {
      return forbiddenResponse('Forbidden — wrong tenant')
    }

    const userSnap = await adminDb.collection('users').doc(userId).get()
    if (!userSnap.exists) return notFoundResponse('Client')
    const managedBy: string[] = Array.isArray((userSnap.data() as any)?.managedBy)
      ? (userSnap.data() as any).managedBy
      : []
    if (!v.isSuperAdmin && !managedBy.includes(tenantId)) {
      return forbiddenResponse('Forbidden — client not managed by this tenant')
    }

    // The duty must exist AND belong to this client.
    const dutySnap = await adminDb.collection('household_duties').doc(dutyId).get()
    if (!dutySnap.exists) return notFoundResponse('Duty')
    if ((dutySnap.data() as any)?.userId !== userId) {
      return forbiddenResponse('Forbidden — duty belongs to another client')
    }

    const body = await request.json().catch(() => ({}))
    const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 2000) : undefined

    const result = await completeDuty(dutyId, {
      completedBy: v.uid,
      completedByName: v.email || 'Staff',
      skipAssignmentCheck: true, // authorized here by tenant role + managedBy
      ...(notes ? { notes } : {}),
    })
    if (!result.success || !result.duty) {
      return errorResponse(new Error(result.error || 'Completion failed'), {
        route: ROUTE,
        operation: 'complete',
      })
    }

    const d = result.duty
    return successResponse({
      task: {
        id: dutyId,
        name: d.name,
        category: d.category,
        status: d.status,
        priority: d.priority,
        nextDueAt: d.nextDueDate || null,
        lastCompletedAt: d.lastCompletedAt || null,
        overdue: false,
      },
    })
  } catch (err) {
    return errorResponse(err, { route: ROUTE, operation: 'complete' })
  }
}
