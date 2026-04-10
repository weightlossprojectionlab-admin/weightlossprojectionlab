/**
 * GET /api/tenant/[tenantId]/dashboard/stats
 *
 * Tenant-scoped dashboard stats. Returns the same response shape as
 * /api/dashboard/stats so the franchise dashboard can mirror the
 * family-admin dashboard's UI patterns (DRY).
 *
 * Auth: verifyTenantStaffOrAdminAuth — franchise admin or staff.
 *
 * Reuses loadManagedFamilies + loadHealthSnapshot from
 * app/tenant-shell/dashboard/_lib/load-families.ts (server-side).
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyTenantStaffOrAdminAuth } from '@/lib/tenant-auth'
import { loadManagedFamilies, loadPendingRequests } from '@/app/tenant-shell/dashboard/_lib/load-families'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ tenantId: string }>
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

    // Load families and pending requests in parallel (reuse existing loaders)
    const [families, pendingRequests] = await Promise.all([
      loadManagedFamilies(tenantId),
      loadPendingRequests(tenantId),
    ])

    // Load staff count from invitations subcollection
    let staffCount = 0
    try {
      const staffSnap = await adminDb
        .collection('tenants')
        .doc(tenantId)
        .collection('invitations')
        .where('status', 'in', ['pending', 'accepted'])
        .get()
      staffCount = staffSnap.size
    } catch {
      // soft-fail
    }

    // Compute aggregate stats
    const now = Date.now()
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
    let activeCount = 0
    let mealsCount = 0
    let vitalsCount = 0
    let weightsCount = 0

    for (const f of families) {
      if (f.lastActiveAt && now - new Date(f.lastActiveAt).getTime() < THIRTY_DAYS) {
        activeCount++
      }
      if (f.health.lastMealAt) mealsCount++
      if (f.health.lastVitalAt) vitalsCount++
      if (f.health.lastWeightAt) weightsCount++
    }

    // Build family snapshots (same shape as PatientSnapshot from useDashboard)
    const familySnapshots = families.map(f => ({
      id: f.id,
      name: f.name,
      email: f.email,
      photo: undefined as string | undefined,
      type: 'human' as const,
      relationship: 'Managed Family',
      activeMedications: f.health.activeMedicationsCount,
      lastVitalCheck: f.health.lastVitalAt,
      latestWeight: f.health.lastWeightValue !== null
        ? {
            weight: f.health.lastWeightValue,
            unit: (f.health.lastWeightUnit || 'lbs') as 'lbs' | 'kg',
            loggedAt: f.health.lastWeightAt || '',
          }
        : null,
      // Extra fields for franchise card (not in consumer PatientSnapshot)
      lastActiveAt: f.lastActiveAt,
      lastMealAt: f.health.lastMealAt,
      lastMealName: f.health.lastMealName,
      joinedPlatformAt: f.joinedPlatformAt,
    }))

    const stats = {
      patients: {
        total: families.length,
        humans: families.length,
        pets: 0,
      },
      familyMembers: staffCount,
      notifications: { unread: 0, urgent: 0 },
      recommendations: { active: 0, urgent: 0 },
      appointments: { upcoming: 0 },
      actionItems: {
        total: pendingRequests.length,
        overdue: 0,
        dueToday: pendingRequests.length,
      },
      recentActivity: {
        medications: 0,
        vitals: vitalsCount,
      },
      // Franchise-specific extras
      families: {
        total: families.length,
        active: activeCount,
        inactive: families.length - activeCount,
      },
      staff: { total: staffCount },
      pendingRequests: pendingRequests.length,
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        patientSnapshots: familySnapshots,
        upcomingAppointments: [],
        actionItems: pendingRequests.map(req => ({
          id: req.id,
          title: `${req.familyName} requested to join your practice`,
          description: req.message || 'No message',
          type: 'management_request',
          priority: 'normal' as const,
          dueDate: req.submittedAt || new Date().toISOString(),
          patientName: req.familyName,
          completed: false,
        })),
        pendingRequests,
      },
    })
  } catch (err) {
    logger.error('[tenant dashboard stats] failed', err as Error)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
