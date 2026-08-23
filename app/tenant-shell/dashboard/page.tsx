'use client'

/**
 * Franchise Owner Dashboard — Overview
 *
 * Mirrors app/family-admin/dashboard/page.tsx (DRY). Same stat cards,
 * same patient snapshot cards, same tool grid, same activity feed —
 * but powered by useTenantDashboard(tenantId) instead of useDashboard(),
 * and with franchise admin tools added to the tool grid alongside the
 * full clinical tool set.
 *
 * This is a client component (like the family-admin dashboard) so it
 * can use the tenant dashboard hook for data fetching + auto-refresh.
 *
 * Auth gating: FamiliesAuthGuard wraps the page content and bounces
 * unauthorized users to /login.
 *
 * tenantId is read from the DOM `data-tenant-id` attribute set by
 * the server-rendered layout.tsx.
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { useTenantRole } from '@/hooks/useTenantRole'
import { useTenantDashboard, type FranchiseFamilySnapshot } from '@/hooks/useTenantDashboard'
import type { ScheduledVisit, CoordinationAppointment } from '@/app/tenant-shell/dashboard/_lib/load-families'
import { getCSRFToken } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api-client'
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  MapPinIcon,
  MapIcon,
  PhoneIcon,
  BellIcon,
  ChartBarIcon,
  PaintBrushIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { capitalizeName } from '@/lib/utils'

export default function FranchiseDashboardOverview() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const router = useRouter()

  // Read tenantId from the DOM (set by layout.tsx's data-tenant-id)
  useEffect(() => {
    const el = document.querySelector('[data-tenant-id]')
    if (el) {
      setTenantId(el.getAttribute('data-tenant-id'))
    }
  }, [])

  // Viewer role via the shared hook (single source). tenantId is read from the
  // DOM after mount, so GATE on it: don't treat the check as resolved or redirect
  // until tenantId is known — a null tenantId would fail the claim match and
  // bounce to /login, which the auth router bounces back to /dashboard (a loop).
  const role = useTenantRole(tenantId || '')
  const authChecked = !!tenantId && role.checked
  const authorized = !!tenantId && role.isTenantMember
  const viewerUid = role.uid
  // Owner/super-admin sees the whole practice board; staff see only their visits.
  const viewerIsAdmin = role.isOwnerLevel
  useEffect(() => {
    if (tenantId && role.checked && !role.isTenantMember) {
      router.replace('/login?next=/dashboard')
    }
  }, [tenantId, role.checked, role.isTenantMember, router])

  const {
    stats,
    patientSnapshots,
    activity,
    actionItems,
    scheduledVisits,
    familyAppointments,
    pendingRequests,
    loading,
    error,
    refetch,
  } = useTenantDashboard(tenantId)

  // Whose visits to show: admin sees the whole practice; staff see only
  // visits assigned to them (matched on their uid = practiceStaffId).
  const visibleVisits = viewerIsAdmin
    ? scheduledVisits
    : scheduledVisits.filter(v => v.staffId === viewerUid)

  // Caregiver-visits scheduled for today.
  const todaysVisits = visibleVisits.filter(v => {
    const d = new Date(v.dateTime)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
  })

  // Unassigned visits today — the owner's coverage gap. Admin-only (a
  // staff member can't assign, and only ever sees their own anyway).
  const unassignedToday = viewerIsAdmin
    ? todaysVisits.filter(v => !v.staffId)
    : []

  // Distinct staff covering today's visits — for the stat-card subtext.
  const staffCoveringToday = new Set(
    todaysVisits.filter(v => v.staffId).map(v => v.staffId)
  ).size

  const [selectedView, setSelectedView] = useState<'overview' | 'activity'>('overview')

  // Auto-refresh every 5 minutes (same as family-admin)
  useEffect(() => {
    const interval = setInterval(() => { refetch() }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [refetch])

  if (!authChecked || !tenantId) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Loading&hellip;</p>
      </div>
    )
  }
  if (!authorized) return null

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
        <ExclamationTriangleIcon className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">Error Loading Dashboard</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Try Again
        </button>
      </div>
    )
  }

  // Staff (non-owner) get a focused "My day" agenda instead of the owner
  // dashboard: their visits, time-ordered — not practice-wide stats, other
  // families, or owner tools. Owners fall through to the full dashboard below.
  if (!viewerIsAdmin) {
    return (
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading your day&hellip;</p>
          </div>
        ) : (
          <StaffDayView visits={todaysVisits} tenantId={tenantId} onChange={refetch} />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              icon={<UserGroupIcon className="w-6 h-6" />}
              label="Managed Families"
              value={stats?.patients.total || 0}
              subtext={`${(stats as any)?.families?.active || 0} active, ${(stats as any)?.families?.inactive || 0} inactive`}
              color="blue"
            />
            <StatCard
              icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
              label="Pending Requests"
              value={stats?.actionItems.total || 0}
              subtext={`${stats?.actionItems.dueToday || 0} awaiting review`}
              color={stats?.actionItems.total ? 'red' : 'yellow'}
              highlight={(stats?.actionItems.total || 0) > 0}
            />
            <StatCard
              icon={<EnvelopeIcon className="w-6 h-6" />}
              label="Staff Members"
              value={(stats as any)?.staff?.total || 0}
              subtext="invited or active"
              color="teal"
            />
            <StatCard
              icon={<BellIcon className="w-6 h-6" />}
              label="Recent Vitals"
              value={stats?.recentActivity.vitals || 0}
              subtext="families with vitals logged"
              color="purple"
            />
            <StatCard
              icon={<CalendarDaysIcon className="w-6 h-6" />}
              label="Today's Visits"
              value={todaysVisits.length}
              subtext={
                viewerIsAdmin
                  ? `${staffCoveringToday} staff${unassignedToday.length ? ` · ${unassignedToday.length} unassigned` : ''}`
                  : 'assigned to you'
              }
              color={unassignedToday.length ? 'red' : 'green'}
              highlight={unassignedToday.length > 0}
            />
          </div>

          {/* Pending Requests Alert */}
          {pendingRequests.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100">
                  {pendingRequests.length} Pending Request{pendingRequests.length !== 1 ? 's' : ''}
                </h2>
              </div>
              <div className="space-y-3">
                {pendingRequests.map(req => (
                  <PendingRequestCard key={req.id} request={req} tenantId={tenantId!} onAction={refetch} />
                ))}
              </div>
            </div>
          )}

          {/* Unassigned-visit Alert — a caregiver-visit today with no staff
              covering it. Coverage gap; same prominence as Pending Requests. */}
          {unassignedToday.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-bold text-red-900 dark:text-red-100">
                  {unassignedToday.length} Unassigned Visit{unassignedToday.length !== 1 ? 's' : ''} Today
                </h2>
              </div>
              <div className="space-y-2">
                {unassignedToday.map(v => (
                  <Link
                    key={v.id}
                    href={`/dashboard/families/${v.clientId}`}
                    className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg p-3 hover:shadow-sm transition-shadow"
                  >
                    <span className="text-sm font-semibold text-red-700 dark:text-red-300 w-20 shrink-0">
                      {new Date(v.dateTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-gray-900 dark:text-gray-100">
                      {capitalizeName(v.clientName)} · {v.reason || 'Visit'}
                    </span>
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 shrink-0">Assign staff →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tab Buttons */}
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
            <TabButton active={selectedView === 'overview'} onClick={() => setSelectedView('overview')} label="Overview" />
            <TabButton active={selectedView === 'activity'} onClick={() => setSelectedView('activity')} label="Recent Activity" />
          </div>

          {/* Overview Tab */}
          {selectedView === 'overview' && (
            <div className="space-y-6">
              {/* Today's Schedule — the day's caregiver-visits. For an admin
                  it's the whole practice's board grouped by staff; for a staff
                  member it's their own route. Unassigned visits live in the
                  alert above, so the board shows only assigned ones. */}
              <TodaysScheduleSection
                visits={viewerIsAdmin ? todaysVisits.filter(v => v.staffId) : todaysVisits}
                groupByStaff={viewerIsAdmin}
              />

              {/* Family Snapshots */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Family Health Snapshots</h2>
                  <Link href="/dashboard/families/new" className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    + Add Client
                  </Link>
                </div>
                {patientSnapshots.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-8 text-center">
                    <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No clients yet</p>
                    <Link href="/dashboard/families/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      + Add Client
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {patientSnapshots.map(family => (
                      <FamilySnapshotCard key={family.id} family={family} />
                    ))}
                  </div>
                )}
              </section>

              {/* Family Appointments — members' OWN external visits. Coordination
                  awareness (transport, follow-up), NOT the practitioner's calendar.
                  Distinct intent from Today's Schedule above. */}
              <FamilyAppointmentsSection appointments={familyAppointments} />

              {/* Management Tools */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Management Tools</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Clinical tools (same as family-admin) */}
                  <ToolCard title="Family Members" description="View and manage health records for your families" icon={<UserGroupIcon className="w-6 h-6" />} href="/dashboard/families" color="blue" />
                  <ToolCard title="Medications" description="Track prescriptions and dosage schedules" icon={<span className="text-2xl">💊</span>} href="/medications" color="purple" />
                  <ToolCard title="Appointments" description="Schedule and manage medical appointments" icon={<CalendarDaysIcon className="w-6 h-6" />} href="/appointments" color="green" />
                  <ToolCard title="Documents" description="Store and manage medical records and insurance cards" icon={<span className="text-2xl">📄</span>} href="/family-admin/documents" color="indigo" />
                  <ToolCard title="Progress Tracking" description="View charts and health trends" icon={<ChartBarIcon className="w-6 h-6" />} href="/progress" color="teal" />
                  <ToolCard title="Shopping Lists" description="View and manage shopping for each family" icon={<span className="text-2xl">🛒</span>} href="/family-admin/shopping" color="lime" />
                  <ToolCard title="Kitchen Inventory" description="Track food inventory across all families" icon={<span className="text-2xl">📦</span>} href="/family-admin/inventory" color="emerald" />
                  <ToolCard title="Notifications" description="Stay updated on health events and reminders" icon={<BellIcon className="w-6 h-6" />} href="/notifications" color="pink" />
                  {/* Franchise admin tools — owner-only (hidden from franchise_staff,
                      matching the role-gated dashboard tabs). Their pages are
                      admin-guarded too; this keeps the Overview consistent. */}
                  {viewerIsAdmin && (
                    <>
                      <ToolCard title="Staff Management" description="Invite and manage your practice staff" icon={<span className="text-2xl">👤</span>} href="/dashboard/staff" color="violet" />
                      <ToolCard title="Branding & Logo" description="Customize your practice's appearance" icon={<PaintBrushIcon className="w-6 h-6" />} href="/dashboard/branding" color="orange" />
                    </>
                  )}
                  <ToolCard title="Provider Directory" description="See how your practice appears to families" icon={<MagnifyingGlassIcon className="w-6 h-6" />} href="/find-a-provider" color="amber" />
                  <ToolCard title="Public Profile" description="Your practice's public about page" icon={<DocumentTextIcon className="w-6 h-6" />} href="/about" color="cyan" />
                </div>
              </section>
            </div>
          )}

          {/* Activity Tab */}
          {selectedView === 'activity' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Recent Activity</h2>
              {activity.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-8 text-center">
                  <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activity.map(item => (
                    <ActivityItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Inline helper components (same pattern as family-admin) ──────────

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  subtext?: string
  color: 'blue' | 'red' | 'yellow' | 'purple' | 'green' | 'teal'
  highlight?: boolean
}

// ─── Staff "My day" — the field caregiver's start-of-day agenda ───────────
// A focused, mobile-first view of the signed-in staff member's OWN visits for
// today: who, when, where — leading with the next visit — instead of the
// practice-wide owner dashboard. Reuses VisitRow for the list rows (DRY).
function StaffDayView({
  visits,
  tenantId,
  onChange,
}: {
  visits: ScheduledVisit[]
  tenantId: string
  onChange: () => void | Promise<void>
}) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  // Time-ordered so the day reads top-to-bottom the way it happens.
  const sorted = [...visits].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  )
  // The highlighted visit = the one to act on now: an in-progress visit (so
  // "End visit" is front-and-centre), else the next upcoming one not yet done,
  // else any remaining unfinished visit. Drops away once the day is complete.
  const now = Date.now()
  const next =
    sorted.find(v => v.visitStatus === 'in_progress' || v.visitStatus === 'en_route') ||
    sorted.find(v => v.visitStatus !== 'completed' && new Date(v.dateTime).getTime() >= now) ||
    sorted.find(v => v.visitStatus !== 'completed')
  // One trip at a time: while a visit is en route or in progress, other visits
  // can't have their trip started.
  const hasActiveVisit = sorted.some(
    v => v.visitStatus === 'en_route' || v.visitStatus === 'in_progress'
  )

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Day</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {today} &middot;{' '}
          {visits.length === 0
            ? 'no visits'
            : `${visits.length} visit${visits.length !== 1 ? 's' : ''}`}
        </p>
      </header>

      {next && (
        <NextVisitCard
          visit={next}
          tenantId={tenantId}
          onChange={onChange}
          hasActiveVisit={hasActiveVisit}
        />
      )}

      <section className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Today&rsquo;s visits</h2>
        </div>
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
            No visits scheduled today. Enjoy the day.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {sorted.map(v => (
              <VisitRow
                key={v.id}
                visit={v}
                showStaff={false}
                action={
                  <VisitCheckInControl
                    visit={v}
                    tenantId={tenantId}
                    onChange={onChange}
                    hasActiveVisit={hasActiveVisit}
                  />
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

// Open the device's maps app with turn-by-turn to the destination. Google's
// UNIVERSAL https directions URL (not a geo:/maps: scheme) works everywhere the
// app runs: browser, installed PWA, and — via OS app-links — the native maps
// app inside a Capacitor shell. No maps API key needed. Only meaningful for a
// real street address. (When Capacitor lands, ensure external origins open in
// the system browser/maps app, not the in-app WebView — a one-time config.)
function directionsHref(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

// Tap-to-navigate. `full` = a labelled, full-width button (the Next-up card);
// otherwise a 44px icon button (a visit row). Sibling of the row's workspace
// link, never nested inside it (no nested anchors).
function DirectionsButton({ address, full = false }: { address: string; full?: boolean }) {
  const base =
    'inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 transition-colors'
  return (
    <a
      href={directionsHref(address)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Directions to ${address}`}
      title="Directions"
      onClick={e => e.stopPropagation()}
      className={
        full
          ? `${base} mt-3 w-full border border-blue-300 dark:border-blue-700 text-sm font-semibold`
          : `${base} shrink-0 w-11`
      }
    >
      <MapIcon className="w-5 h-5" />
      {full && <span>Directions</span>}
    </a>
  )
}

// Call the client/family from the agenda if there's an issue (no answer at the
// door, running late). A tel: link — dials from browser/PWA/Capacitor, no key.
// `full` = labelled, full-width; otherwise a 44px icon button.
function CallButton({ phone, full = false }: { phone: string; full?: boolean }) {
  const base =
    'inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors'
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      aria-label={`Call ${phone}`}
      title="Call"
      onClick={e => e.stopPropagation()}
      className={
        full
          ? `${base} w-full border border-gray-300 dark:border-gray-600 text-sm font-semibold`
          : `${base} shrink-0 w-11`
      }
    >
      <PhoneIcon className="w-5 h-5" />
      {full && <span>Call</span>}
    </a>
  )
}

// The single most important thing at the start of a shift: where to go next,
// and how to get there. Big tap targets (min 44px). The info + "Open" link into
// the client workspace; "Directions" launches the maps app.
function NextVisitCard({
  visit,
  tenantId,
  onChange,
  hasActiveVisit,
}: {
  visit: ScheduledVisit
  tenantId: string
  onChange: () => void | Promise<void>
  hasActiveVisit: boolean
}) {
  const time = new Date(visit.dateTime).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  const where = visit.address || visit.location
  const workspace = `/dashboard/families/${visit.clientId}`
  return (
    <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Next up
        </p>
        <VisitStatusChip visit={visit} />
      </div>
      <div className="flex items-start justify-between gap-4">
        <Link href={workspace} className="min-w-0 flex-1 group">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate group-hover:underline">
            {time} &middot; {capitalizeName(visit.clientName)}
            {visit.patientName && visit.patientName !== visit.clientName
              ? ` · ${capitalizeName(visit.patientName)}`
              : ''}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 truncate mt-0.5">
            {visit.reason || 'Home visit'}
          </p>
          {where && (
            <p className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-200 truncate mt-1">
              <MapPinIcon className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span className="truncate">{where}</span>
            </p>
          )}
        </Link>
        <Link
          href={workspace}
          className="shrink-0 inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold"
        >
          Open &rarr;
        </Link>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <VisitCheckInControl
          visit={visit}
          tenantId={tenantId}
          onChange={onChange}
          hasActiveVisit={hasActiveVisit}
          full
        />
        {visit.address && visit.visitStatus !== 'scheduled' && visit.visitStatus !== 'completed' && (
          <DirectionsButton address={visit.address} />
        )}
        {visit.clientPhone && <CallButton phone={visit.clientPhone} />}
      </div>
    </div>
  )
}

// ─── Visit verification (EVV, phase A) — check-in / check-out + status ─────
const LATE_GRACE_MIN = 15
// How early (before the scheduled time) a caregiver may start the trip — guards
// against clocking travel for a visit that isn't due yet.
const TRIP_WINDOW_LEAD_MIN = 120

// Read-only chip describing where the visit is in its lifecycle — shown to staff
// AND admins (early oversight): completed + duration, in-progress + elapsed, or
// "running late" once past scheduled + grace. On-time scheduled shows nothing,
// keeping the agenda calm.
function VisitStatusChip({ visit }: { visit: ScheduledVisit }) {
  const mins = (fromIso: string, toMs: number) =>
    Math.max(0, Math.round((toMs - new Date(fromIso).getTime()) / 60000))

  if (visit.visitStatus === 'completed' && visit.checkInAt && visit.checkOutAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-semibold text-green-800 dark:text-green-200">
        <CheckCircleIcon className="w-3.5 h-3.5" />
        Completed &middot; {mins(visit.checkInAt, new Date(visit.checkOutAt).getTime())}m
      </span>
    )
  }
  if (visit.visitStatus === 'en_route' && visit.tripStartedAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-semibold text-indigo-800 dark:text-indigo-200">
        <MapIcon className="w-3.5 h-3.5" />
        En route &middot; {mins(visit.tripStartedAt, Date.now())}m
      </span>
    )
  }
  if (visit.visitStatus === 'in_progress' && visit.checkInAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:text-blue-200">
        <ClockIcon className="w-3.5 h-3.5" />
        In progress &middot; {mins(visit.checkInAt, Date.now())}m
      </span>
    )
  }
  const late = new Date(visit.dateTime).getTime() + LATE_GRACE_MIN * 60000 < Date.now()
  if (late) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-200">
        <ExclamationTriangleIcon className="w-3.5 h-3.5" />
        Running late
      </span>
    )
  }
  return null
}

// Arrival-confirmation gate. Check-in must NOT be a stray tap from home in the
// morning — the caregiver explicitly attests they've arrived at the home before
// the visit clock starts. (A later phase upgrades this attestation to GPS/QR-
// verified arrival.) Mobile-first: a bottom sheet on phones, centred on larger.
function ArrivalConfirmModal({
  visit,
  onConfirm,
  onCancel,
  busy,
}: {
  visit: ScheduledVisit
  onConfirm: () => void
  onCancel: () => void
  busy: boolean
}) {
  const where = visit.address || visit.location
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <MapPinIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Confirm arrival</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Only start the visit once you&rsquo;re at {capitalizeName(visit.clientName)}&rsquo;s home
          {where ? (
            <>
              {' '}&mdash;{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">{where}</span>
            </>
          ) : (
            ''
          )}
          . This starts the visit clock.
        </p>
        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-60"
          >
            Not yet
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1 min-h-[44px] px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60"
          >
            <CheckCircleIcon className="w-5 h-5" />
            {busy ? 'Starting…' : "I've arrived — start visit"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Staff-facing check-in / check-out. Check-in is gated behind the arrival
// confirmation above; both write to the verify API (single source on the
// appointment) then refetch so the chip + payroll data reflect it. Completed
// visits show a static confirmation, not another button.
function VisitCheckInControl({
  visit,
  tenantId,
  onChange,
  hasActiveVisit = false,
  full = false,
}: {
  visit: ScheduledVisit
  tenantId: string
  onChange: () => void | Promise<void>
  hasActiveVisit?: boolean
  full?: boolean
}) {
  const [busy, setBusy] = useState<'start-trip' | 'check-in' | 'check-out' | null>(null)
  const [confirming, setConfirming] = useState(false)

  const post = async (action: 'start-trip' | 'check-in' | 'check-out') => {
    setBusy(action)
    try {
      await apiClient.post(`/tenant/${tenantId}/visits/verify`, {
        userId: visit.clientId,
        appointmentId: visit.appointmentId,
        action,
      })
      await onChange()
    } catch (err) {
      logger.error('[VisitCheckInControl] verify failed', err as Error)
    } finally {
      setBusy(null)
      setConfirming(false)
    }
  }

  const sizing = full ? 'w-full' : 'shrink-0 px-3'
  const btn = `inline-flex items-center justify-center min-h-[44px] rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${sizing}`

  if (visit.visitStatus === 'completed') {
    return (
      <span
        className={`inline-flex items-center justify-center gap-1 min-h-[44px] text-sm font-semibold text-green-700 dark:text-green-300 ${
          full ? 'w-full' : 'shrink-0 px-3'
        }`}
      >
        <CheckCircleIcon className="w-5 h-5" /> Done
      </span>
    )
  }
  if (visit.visitStatus === 'in_progress') {
    return (
      <button
        type="button"
        onClick={() => post('check-out')}
        disabled={busy !== null}
        className={`${btn} bg-amber-500 hover:bg-amber-600 text-white`}
      >
        {busy === 'check-out' ? 'Saving…' : 'End visit'}
      </button>
    )
  }
  // En route — arrived at the home: check in (gated by arrival confirmation).
  if (visit.visitStatus === 'en_route') {
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy !== null}
          className={`${btn} bg-green-600 hover:bg-green-700 text-white`}
        >
          Start visit
        </button>
        {confirming && (
          <ArrivalConfirmModal
            visit={visit}
            busy={busy === 'check-in'}
            onCancel={() => {
              if (busy === null) setConfirming(false)
            }}
            onConfirm={() => post('check-in')}
          />
        )}
      </>
    )
  }
  // Scheduled — starting the trip begins the travel/payroll clock AND opens
  // navigation (one tap: go + navigate, so scheduled rows need no separate
  // Directions button). Disabled until the visit is in its window and no other
  // visit is active — one trip at a time.
  const tooEarly =
    Date.now() < new Date(visit.dateTime).getTime() - TRIP_WINDOW_LEAD_MIN * 60000
  const blocked = hasActiveVisit || tooEarly
  const startTrip = () => {
    if (visit.address) window.open(directionsHref(visit.address), '_blank', 'noopener')
    post('start-trip')
  }
  return (
    <button
      type="button"
      onClick={startTrip}
      disabled={busy !== null || blocked}
      title={
        hasActiveVisit
          ? 'Finish your current visit first'
          : tooEarly
            ? "Too early — this visit isn't due yet"
            : 'Start trip & open directions'
      }
      className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}
    >
      {busy === 'start-trip' ? 'Starting…' : 'Start trip'}
    </button>
  )
}

function VisitRow({
  visit,
  showStaff,
  action,
}: {
  visit: ScheduledVisit
  showStaff: boolean
  action?: ReactNode
}) {
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const where = visit.address || visit.location

  const info = (
    <Link
      href={`/dashboard/families/${visit.clientId}`}
      className="flex items-center gap-4 py-3 px-2 -mx-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors flex-1 min-w-0"
    >
      <span className="w-16 sm:w-20 shrink-0 text-sm font-semibold text-blue-600 dark:text-blue-400">
        {fmtTime(visit.dateTime)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {capitalizeName(visit.clientName)}
          {visit.patientName && visit.patientName !== visit.clientName ? ` · ${capitalizeName(visit.patientName)}` : ''}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {visit.reason || 'Home visit'}
        </p>
        {where && (
          <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 min-w-0 mt-0.5">
            <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{where}</span>
          </p>
        )}
        <div className="mt-1 empty:hidden">
          <VisitStatusChip visit={visit} />
        </div>
      </div>
      {showStaff && visit.staffName && (
        <span className="hidden sm:inline whitespace-nowrap text-xs text-gray-400 dark:text-gray-500">
          {visit.staffName}
        </span>
      )}
    </Link>
  )

  // Staff rows carry a check-in action — stack the actions on a bar below so the
  // visit info keeps full width on a phone. Admin rows (no action) stay compact
  // with Directions inline.
  if (action) {
    return (
      <li className="py-1">
        {info}
        <div className="flex items-center justify-end gap-2 pb-2">
          {visit.clientPhone && <CallButton phone={visit.clientPhone} />}
          {/* Scheduled visits navigate via "Start trip"; show Directions only
              once en route / on site, to keep the scheduled row uncluttered. */}
          {visit.address &&
            visit.visitStatus !== 'scheduled' &&
            visit.visitStatus !== 'completed' && (
              <DirectionsButton address={visit.address} />
            )}
          {action}
        </div>
      </li>
    )
  }
  return (
    <li className="flex items-center gap-1">
      {info}
      {visit.clientPhone && <CallButton phone={visit.clientPhone} />}
      {visit.address && <DirectionsButton address={visit.address} />}
    </li>
  )
}

function TodaysScheduleSection({ visits, groupByStaff }: { visits: ScheduledVisit[]; groupByStaff: boolean }) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  // Admin view groups by staff member so coverage/workload is visible at a
  // glance. Staff view is a flat personal list (grouping is pointless when
  // every visit is theirs).
  const groups: { staffName: string; visits: ScheduledVisit[] }[] = []
  if (groupByStaff) {
    const byStaff = new Map<string, ScheduledVisit[]>()
    for (const v of visits) {
      const key = v.staffName || 'Staff'
      if (!byStaff.has(key)) byStaff.set(key, [])
      byStaff.get(key)!.push(v)
    }
    for (const [staffName, vs] of byStaff) groups.push({ staffName, visits: vs })
    groups.sort((a, b) => a.staffName.localeCompare(b.staffName))
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Today&rsquo;s Schedule</h2>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{today}</span>
      </div>
      {visits.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
          No visits scheduled today.
        </p>
      ) : groupByStaff ? (
        <div className="space-y-5">
          {groups.map(group => (
            <div key={group.staffName}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{group.staffName}</h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {group.visits.length} visit{group.visits.length !== 1 ? 's' : ''}
                </span>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {group.visits.map(v => (
                  <VisitRow key={v.id} visit={v} showStaff={false} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {visits.map(v => (
            <VisitRow key={v.id} visit={v} showStaff={false} />
          ))}
        </ul>
      )}
    </section>
  )
}

function FamilyAppointmentsSection({ appointments }: { appointments: CoordinationAppointment[] }) {
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  // Coordination is the whole point of this view, so surface the ones that
  // need a ride first — that's the action the practitioner can take here.
  const needsRide = (a: CoordinationAppointment) =>
    a.requiresDriver && a.driverStatus !== 'accepted'

  if (appointments.length === 0) return null

  return (
    <section>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Family Appointments</h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {appointments.map(a => (
          <Link
            key={a.id}
            href={`/dashboard/families/${a.clientId}`}
            className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors first:rounded-t-lg last:rounded-b-lg"
          >
            <div className="w-16 shrink-0 text-center">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmtDate(a.dateTime)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{fmtTime(a.dateTime)}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {capitalizeName(a.patientName)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {a.specialty || a.providerName}
                {a.clientName && a.clientName !== a.patientName ? ` · ${capitalizeName(a.clientName)}` : ''}
              </p>
            </div>
            {needsRide(a) ? (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                🚗 needs ride
              </span>
            ) : a.requiresDriver ? (
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                ✓ ride set
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  )
}

function StatCard({ icon, label, value, subtext, color, highlight }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    teal: 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
  }
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border-2 ${highlight ? 'border-red-400 animate-pulse' : 'border-gray-200 dark:border-gray-700'} p-6`}>
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{value}</p>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      {subtext && <p className="text-xs text-gray-500 dark:text-gray-400">{subtext}</p>}
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 font-medium transition-colors border-b-2 ${
        active
          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  )
}

function FamilySnapshotCard({ family }: { family: FranchiseFamilySnapshot }) {
  const router = useRouter()
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const isActive = family.lastActiveAt && (Date.now() - new Date(family.lastActiveAt).getTime()) < 30 * 24 * 60 * 60 * 1000

  return (
    <div
      onClick={() => router.push(`/dashboard/families/${family.id}`)}
      className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
          <span className="text-blue-600 dark:text-blue-400 font-semibold text-xl">
            {(family.name?.charAt(0) || '?').toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{capitalizeName(family.name)}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{family.email}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            isActive
              ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      {/* Household summary — a client is a household. Per-member health
          (meals/weights/vitals/meds) lives in the client-detail view (click),
          not aggregated onto this directory card. */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Care recipients:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{family.memberCount}</span>
        </div>
        {family.memberNames.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {family.memberNames.slice(0, 3).join(', ')}
            {family.memberNames.length > 3 ? ` +${family.memberNames.length - 3} more` : ''}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Last activity:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(family.lastActiveAt)}</span>
        </div>
      </div>
      <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 text-right">
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
          View Family →
        </span>
      </div>
    </div>
  )
}

function PendingRequestCard({ request, tenantId, onAction }: { request: any; tenantId: string; onAction: () => void }) {
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null)

  const fire = async (action: 'approve' | 'decline') => {
    if (!auth?.currentUser) return
    setBusy(action)
    try {
      const token = await auth.currentUser.getIdToken()
      const csrfToken = getCSRFToken()
      await fetch(`/api/tenant/${tenantId}/management-request/${request.id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrfToken },
      })
      onAction()
    } catch (err) {
      logger.error('[PendingRequestCard] action failed', err as Error)
      setBusy(null)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{request.familyName}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{request.familyEmail}</p>
          {request.message && <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-1">&ldquo;{request.message}&rdquo;</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => fire('approve')} disabled={busy !== null} className="px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded">
            {busy === 'approve' ? '...' : 'Approve'}
          </button>
          <button onClick={() => fire('decline')} disabled={busy !== null} className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 disabled:opacity-50">
            {busy === 'decline' ? '...' : 'Decline'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ToolCard({ title, description, icon, href, color }: { title: string; description: string; icon: React.ReactNode; href: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500', purple: 'bg-purple-500', green: 'bg-green-500',
    amber: 'bg-amber-500', indigo: 'bg-indigo-500', teal: 'bg-teal-500',
    pink: 'bg-pink-500', cyan: 'bg-cyan-500', orange: 'bg-orange-500',
    lime: 'bg-lime-500', emerald: 'bg-emerald-500', violet: 'bg-violet-500',
  }
  return (
    <Link href={href} className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color] || 'bg-gray-500'} flex items-center justify-center text-white shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
    </Link>
  )
}

function ActivityItemCard({ item }: { item: any }) {
  const formatTime = (ts: string) => {
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg shrink-0">
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatTime(item.timestamp)}</span>
      </div>
    </div>
  )
}
