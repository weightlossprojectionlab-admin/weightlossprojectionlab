/**
 * Replies to a note ON an appointment (white-label CRM — the visit's back-and-
 * forth). A note is a message the care team can reply to, messaging-style.
 *
 *   POST /api/tenant/[tenantId]/clients/[userId]/appointments/[apptId]/notes/[noteId]/replies
 *
 * A reply lives UNDER the note it answers
 * (…/appointments/{apptId}/notes/{noteId}/replies). Internal to the practice
 * (staff/admin).
 *
 * Auth: verifyTenantStaffOrAdminAuth + the caller's tenant must manage this
 * client (managedBy), the appointment must exist, and the note must exist.
 */

import { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyTenantStaffOrAdminAuth } from '@/lib/tenant-auth'
import {
  errorResponse,
  successResponse,
  forbiddenResponse,
  validationError,
  notFoundResponse,
} from '@/lib/api-response'

interface RouteContext {
  params: Promise<{ tenantId: string; userId: string; apptId: string; noteId: string }>
}

const ROUTE =
  '/api/tenant/[tenantId]/clients/[userId]/appointments/[apptId]/notes/[noteId]/replies'

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId, userId, apptId, noteId } = await context.params

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

    const noteRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('appointments')
      .doc(apptId)
      .collection('notes')
      .doc(noteId)
    const noteSnap = await noteRef.get()
    if (!noteSnap.exists) return notFoundResponse('Note')

    const body = await request.json().catch(() => ({}))
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    if (!message) return validationError('A reply is required')

    const role = v.isSuperAdmin || v.isFranchiseAdmin ? 'admin' : 'staff'
    const nowIso = new Date().toISOString()
    const reply = {
      authorUid: v.uid,
      authorName: v.email || 'Staff',
      authorRole: role,
      body: message.slice(0, 5000),
      createdAt: nowIso,
    }
    const ref = await noteRef.collection('replies').add(reply)
    await noteRef.update({ replyCount: FieldValue.increment(1) })
    return successResponse({ reply: { id: ref.id, ...reply } }, 201)
  } catch (err) {
    return errorResponse(err, { route: ROUTE, operation: 'add-reply' })
  }
}
