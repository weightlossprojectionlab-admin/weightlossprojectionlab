/**
 * Notes ON a single appointment (white-label CRM — the visit's running record).
 *
 *   GET  /api/tenant/[tenantId]/clients/[userId]/appointments/[apptId]/notes → list
 *   POST /api/tenant/[tenantId]/clients/[userId]/appointments/[apptId]/notes → add a note
 *
 * A note lives UNDER the appointment it's about
 * (users/{userId}/appointments/{apptId}/notes), so there's never a question
 * which visit a note belongs to. Internal to the practice (staff/admin).
 *
 * Auth: verifyTenantStaffOrAdminAuth + the caller's tenant must manage this
 * client (managedBy) AND the appointment must exist under that client.
 */

import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyTenantStaffOrAdminAuth } from '@/lib/tenant-auth'
import {
  errorResponse,
  successResponse,
  forbiddenResponse,
  validationError,
  notFoundResponse,
} from '@/lib/api-response'
import type { AppointmentNote, AppointmentNoteReply } from '@/types/tenant'

interface RouteContext {
  params: Promise<{ tenantId: string; userId: string; apptId: string }>
}

const ROUTE = '/api/tenant/[tenantId]/clients/[userId]/appointments/[apptId]/notes'

/** Normalize a note/reply doc to the shared authored shape. */
function mapAuthored(id: string, n: any) {
  return {
    id,
    authorUid: n.authorUid || '',
    authorName: n.authorName || 'Staff',
    authorRole: (n.authorRole === 'admin' ? 'admin' : 'staff') as 'admin' | 'staff',
    body: n.body || '',
    createdAt: typeof n.createdAt === 'string' ? n.createdAt : '',
  }
}

/** Gate: valid staff/admin of THIS tenant, the tenant manages the client, and
 *  the appointment exists. Returns the appointment ref on success. */
async function authorize(request: NextRequest, tenantId: string, userId: string, apptId: string) {
  const v = await verifyTenantStaffOrAdminAuth(request.headers.get('authorization'))
  if (!v.ok) return { error: forbiddenResponse(v.error || 'Forbidden') } as const
  if (!v.isSuperAdmin && v.tenantId !== tenantId) {
    return { error: forbiddenResponse('Forbidden — wrong tenant') } as const
  }

  const userSnap = await adminDb.collection('users').doc(userId).get()
  if (!userSnap.exists) return { error: notFoundResponse('Client') } as const
  const managedBy: string[] = Array.isArray((userSnap.data() as any)?.managedBy)
    ? (userSnap.data() as any).managedBy
    : []
  if (!v.isSuperAdmin && !managedBy.includes(tenantId)) {
    return { error: forbiddenResponse('Forbidden — client not managed by this tenant') } as const
  }

  const apptRef = adminDb
    .collection('users')
    .doc(userId)
    .collection('appointments')
    .doc(apptId)
  const apptSnap = await apptRef.get()
  if (!apptSnap.exists) return { error: notFoundResponse('Appointment') } as const

  return { v, apptRef } as const
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId, userId, apptId } = await context.params
    const auth = await authorize(request, tenantId, userId, apptId)
    if ('error' in auth) return auth.error

    const snap = await auth.apptRef.collection('notes').orderBy('createdAt', 'asc').limit(100).get()
    const notes: AppointmentNote[] = await Promise.all(
      snap.docs.map(async d => {
        const n = d.data() as any
        const repliesSnap = await d.ref.collection('replies').orderBy('createdAt', 'asc').limit(100).get()
        const replies: AppointmentNoteReply[] = repliesSnap.docs.map(r => mapAuthored(r.id, r.data()))
        return {
          ...mapAuthored(d.id, n),
          replyCount: typeof n.replyCount === 'number' ? n.replyCount : replies.length,
          replies,
        }
      })
    )
    return successResponse({ notes })
  } catch (err) {
    return errorResponse(err, { route: ROUTE, operation: 'list' })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId, userId, apptId } = await context.params
    const auth = await authorize(request, tenantId, userId, apptId)
    if ('error' in auth) return auth.error
    const { v, apptRef } = auth

    const body = await request.json().catch(() => ({}))
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    if (!message) return validationError('A note is required')

    const role = v.isSuperAdmin || v.isFranchiseAdmin ? 'admin' : 'staff'
    const nowIso = new Date().toISOString()
    const note = {
      authorUid: v.uid,
      authorName: v.email || 'Staff',
      authorRole: role,
      body: message.slice(0, 5000),
      createdAt: nowIso,
      replyCount: 0,
    }
    const ref = await apptRef.collection('notes').add(note)
    return successResponse({ note: { id: ref.id, ...note, replies: [] } }, 201)
  } catch (err) {
    return errorResponse(err, { route: ROUTE, operation: 'add-note' })
  }
}
