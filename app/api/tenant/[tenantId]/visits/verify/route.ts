/**
 * POST /api/tenant/[tenantId]/visits/verify
 *
 * Visit verification (EVV, phase A — timestamp only). A staff member checks in
 * on arrival and checks out on departure at a home visit; the timestamps are the
 * single source of truth for oversight ("on track") and payroll (hours worked).
 *
 * Body: { userId, appointmentId, action: 'check-in' | 'check-out' }
 *   userId        = the client/family user doc that owns the appointment
 *   appointmentId = the raw appointment doc id (NOT the namespaced visit id)
 *
 * Writes onto the appointment (users/{userId}/appointments/{appointmentId}):
 *   check-in  → { checkInAt, visitStatus: 'in_progress', checkedInBy }
 *   check-out → { checkOutAt, visitStatus: 'completed' }  (requires a check-in)
 *
 * Auth: verifyTenantStaffOrAdminAuth. Franchise STAFF may verify only their OWN
 * assigned visits (practiceStaffId === their uid); admins/super-admins may verify
 * any (e.g. to correct a missed check-in).
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyTenantStaffOrAdminAuth } from '@/lib/tenant-auth'
import { logger } from '@/lib/logger'

type VerifyAction = 'start-trip' | 'check-in' | 'check-out'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const auth = await verifyTenantStaffOrAdminAuth(request.headers.get('authorization'))
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
    }
    // Super-admins carry tenantId=''; franchise users must match the route tenant.
    if (!auth.isSuperAdmin && auth.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Wrong tenant' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const appointmentId = typeof body.appointmentId === 'string' ? body.appointmentId : ''
    const action = body.action as VerifyAction
    const validAction =
      action === 'start-trip' || action === 'check-in' || action === 'check-out'
    if (!userId || !appointmentId || !validAction) {
      return NextResponse.json(
        { error: 'userId, appointmentId and a valid action are required' },
        { status: 400 }
      )
    }

    const apptRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('appointments')
      .doc(appointmentId)
    const snap = await apptRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }
    const a = snap.data() as any

    // The visit must belong to this tenant.
    if (a.tenantId && a.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Visit is not in this tenant' }, { status: 403 })
    }
    // Staff may only verify their OWN assigned visits.
    if (auth.isFranchiseStaff && a.practiceStaffId !== auth.uid) {
      return NextResponse.json({ error: 'Not your visit to verify' }, { status: 403 })
    }

    const nowIso = new Date().toISOString()
    const update: Record<string, any> = { updatedAt: nowIso }

    if (action === 'start-trip') {
      // Payroll starts when the caregiver leaves for the visit (travel time).
      // Only set once, so re-tapping doesn't reset the trip clock.
      update.tripStartedAt = a.tripStartedAt || nowIso
      update.visitStatus = 'en_route'
    } else if (action === 'check-in') {
      // Don't move the recorded arrival if they re-tap; only set it once.
      update.checkInAt = a.checkInAt || nowIso
      // Backfill the trip start if they skipped "Start trip", so travel time is
      // always defined (zero travel rather than undefined).
      update.tripStartedAt = a.tripStartedAt || nowIso
      update.visitStatus = 'in_progress'
      update.checkedInBy = auth.uid
      // The client gates check-in behind an explicit "I've arrived" confirmation,
      // so checkInAt IS the attested arrival time. (A later phase replaces the
      // attestation with GPS/QR-verified arrival.)
      update.arrivalConfirmed = true
    } else {
      // Can't check out of a visit that was never checked into.
      if (!a.checkInAt) {
        return NextResponse.json({ error: 'Check in before checking out' }, { status: 409 })
      }
      update.checkOutAt = nowIso
      update.visitStatus = 'completed'
    }

    await apptRef.update(update)
    logger.info('[visits/verify] visit verified', { tenantId, userId, appointmentId, action, by: auth.uid })

    // `success: true` is the envelope the shared apiClient validates on.
    return NextResponse.json({
      success: true,
      visitStatus: update.visitStatus,
      tripStartedAt: update.tripStartedAt ?? a.tripStartedAt ?? null,
      checkInAt: update.checkInAt ?? a.checkInAt ?? null,
      checkOutAt: update.checkOutAt ?? a.checkOutAt ?? null,
    })
  } catch (err) {
    logger.error('[visits/verify] failed', err as Error)
    return NextResponse.json({ error: 'Failed to verify visit' }, { status: 500 })
  }
}
