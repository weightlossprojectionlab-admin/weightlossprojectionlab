/**
 * GET /api/tenant/[tenantId]/dashboard/activity
 *
 * Tenant-scoped activity feed. Reads from admin_audit_logs where
 * tenantId matches. Returns the same ActivityItem[] shape as
 * /api/dashboard/activity so the franchise dashboard mirrors the
 * family-admin UI (DRY).
 *
 * Auth: verifyTenantStaffOrAdminAuth — franchise admin or staff.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyTenantStaffOrAdminAuth } from '@/lib/tenant-auth'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ tenantId: string }>
}

const ACTION_LABELS: Record<string, { title: (c: any) => string; icon: string; type: string }> = {
  tenant_family_attached: {
    title: (c) => `Added ${c?.email || 'a family'} as a managed family`,
    icon: '👨‍👩‍👧‍👦',
    type: 'family',
  },
  tenant_family_revoked: {
    title: (c) => `Removed ${c?.email || 'a family'} from managed families`,
    icon: '🚪',
    type: 'family',
  },
  tenant_staff_invited: {
    title: (c) => `Invited ${c?.invitedEmail || 'someone'} as staff`,
    icon: '✉️',
    type: 'staff',
  },
  tenant_staff_accepted: {
    title: (c) => `${c?.invitedEmail || 'Staff member'} accepted invitation`,
    icon: '✅',
    type: 'staff',
  },
  tenant_staff_revoked: {
    title: (c) => `Revoked staff access for ${c?.invitedEmail || 'a staff member'}`,
    icon: '🔒',
    type: 'staff',
  },
  tenant_request_submitted: {
    title: (c) => `New management request received`,
    icon: '📥',
    type: 'request',
  },
  tenant_request_approved: {
    title: () => `Approved a management request`,
    icon: '✅',
    type: 'request',
  },
  tenant_request_declined: {
    title: () => `Declined a management request`,
    icon: '❌',
    type: 'request',
  },
  tenant_branding_updated: {
    title: () => `Updated branding`,
    icon: '🎨',
    type: 'branding',
  },
}

function normalizeTimestamp(raw: any): string {
  if (!raw) return new Date().toISOString()
  if (typeof raw === 'string') return raw
  if (raw.toDate && typeof raw.toDate === 'function') return raw.toDate().toISOString()
  if (raw instanceof Date) return raw.toISOString()
  // Firestore Timestamp-like with _seconds
  if (typeof raw._seconds === 'number') return new Date(raw._seconds * 1000).toISOString()
  return new Date().toISOString()
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId } = await context.params
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const verification = await verifyTenantStaffOrAdminAuth(request.headers.get('authorization'))
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error || 'Forbidden' }, { status: 403 })
    }
    if (!verification.isSuperAdmin && verification.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden — wrong tenant' }, { status: 403 })
    }

    const limitParam = request.nextUrl.searchParams.get('limit')
    const limit = Math.min(Math.max(parseInt(limitParam || '15', 10) || 15, 1), 50)

    // Single equality filter only — no orderBy. Combining where + orderBy
    // on different fields requires a composite index. Sort in memory instead
    // (same approach as loadPendingRequests).
    const snap = await adminDb
      .collection('admin_audit_logs')
      .where('tenantId', '==', tenantId)
      .limit(limit)
      .get()

    const activity = snap.docs.map(doc => {
      const d = doc.data() as any
      const action = d.action as string
      const label = ACTION_LABELS[action]
      const changes = d.changes || {}

      return {
        id: doc.id,
        type: label?.type || 'system',
        title: label?.title(changes) || action.replace(/_/g, ' '),
        description: d.adminEmail ? `by ${d.adminEmail}` : '',
        timestamp: normalizeTimestamp(d.timestamp),
        icon: label?.icon || '📋',
        priority: 'normal' as const,
      }
    })

    // Sort newest first in memory (no orderBy in query to avoid index requirement)
    activity.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    return NextResponse.json({ success: true, data: { activity } })
  } catch (err) {
    logger.error('[tenant dashboard activity] failed', err as Error)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
