/**
 * Family Admin Dashboard
 *
 * Comprehensive caregiver/family management interface
 * Centralizes daily tasks, family member oversight, and household coordination
 */

'use client'

// Force this page to be dynamically rendered
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { useDashboard } from '@/hooks/useDashboard'
import { useAuth } from '@/hooks/useAuth'
import { useFamilyRoles } from '@/hooks/useFamilyRoles'
import { useNotifications } from '@/hooks/useNotifications'
import { useRecommendations } from '@/hooks/useRecommendations'
import type { FamilyInvitation } from '@/types/medical'
import {
  BellIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  MinusIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'

export default function FamilyAdminDashboardPage() {
  return (
    <AuthGuard>
      <FamilyAdminDashboardContent />
    </AuthGuard>
  )
}

function FamilyAdminDashboardContent() {
  const router = useRouter()
  const { user } = useAuth()
  const { familyMembers } = useFamilyRoles()
  const { unreadCount, subscribeToNotifications } = useNotifications(user?.uid)
  const { recommendations } = useRecommendations()
  const {
    stats,
    patientSnapshots,
    activity,
    actionItems,
    upcomingAppointments,
    loading,
    error,
    refetch
  } = useDashboard()

  const [selectedView, setSelectedView] = useState<'overview' | 'tasks' | 'activity'>('overview')
  const [invitations, setInvitations] = useState<{ sent: FamilyInvitation[]; received: FamilyInvitation[] }>({ sent: [], received: [] })

  const fetchInvitations = useCallback(async () => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/invitations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const result = await response.json()
      if (result.success) {
        setInvitations(result.data)
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
    }
  }, [user])

  // Set up real-time notification listener
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = subscribeToNotifications(5)
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe()
        }
      }
    }
  }, [user?.uid, subscribeToNotifications])

  // Fetch invitations on mount for stat card
  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  // Auto-refresh dashboard data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [refetch])

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Family Admin Dashboard" />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-error-light dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-error mx-auto mb-4" />
            <h3 className="text-xl font-bold text-error-dark mb-2">Error Loading Dashboard</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Family Admin Dashboard"
        subtitle="Manage your family's health and daily tasks"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors font-medium"
            >
              Refresh
            </button>
          </div>
        }
      />

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                icon={<UserGroupIcon className="w-6 h-6" />}
                label="Family Members Under Care"
                value={stats?.patients.total || 0}
                subtext={`${stats?.patients.humans || 0} people, ${stats?.patients.pets || 0} pets`}
                color="blue"
                onClick={() => router.push('/patients')}
              />
              <StatCard
                icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
                label="Pending Tasks"
                value={stats?.actionItems.total || 0}
                subtext={`${stats?.actionItems.overdue || 0} overdue, ${stats?.actionItems.dueToday || 0} due today`}
                color={stats?.actionItems.overdue ? 'red' : 'yellow'}
                onClick={() => setSelectedView('tasks')}
                highlight={(stats?.actionItems.overdue || 0) > 0}
              />
              <StatCard
                icon={<EnvelopeIcon className="w-6 h-6" />}
                label="Pending Invites"
                value={invitations.received.length}
                subtext={`${invitations.sent.filter(inv => inv.status === 'pending').length} sent`}
                color="teal"
                onClick={() => router.push('/family-admin/invites')}
                highlight={invitations.received.length > 0}
              />
              <StatCard
                icon={<BellIcon className="w-6 h-6" />}
                label="Unread Notifications"
                value={stats?.notifications.unread || 0}
                subtext={`${stats?.notifications.urgent || 0} urgent`}
                color="purple"
                onClick={() => router.push('/notifications')}
                highlight={(stats?.notifications.urgent || 0) > 0}
              />
              <StatCard
                icon={<CalendarDaysIcon className="w-6 h-6" />}
                label="Upcoming Appointments"
                value={stats?.appointments.upcoming || 0}
                subtext="Next 30 days"
                color="green"
                onClick={() => router.push('/appointments')}
              />
            </div>

            {/* Action Center - Critical Items */}
            {(stats?.actionItems.overdue || 0) > 0 || (stats?.recommendations.urgent || 0) > 0 && (
              <div className="bg-error-light dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ExclamationTriangleIcon className="w-6 h-6 text-error" />
                  <h2 className="text-xl font-bold text-error-dark">Action Required</h2>
                </div>
                <div className="space-y-3">
                  {(stats?.actionItems.overdue || 0) > 0 && stats && (
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                      <p className="text-sm font-medium text-foreground">
                        {stats.actionItems.overdue} overdue task{stats.actionItems.overdue !== 1 ? 's' : ''} need{stats.actionItems.overdue === 1 ? 's' : ''} attention
                      </p>
                      <button
                        onClick={() => setSelectedView('tasks')}
                        className="mt-2 text-sm text-primary hover:underline"
                      >
                        View Tasks →
                      </button>
                    </div>
                  )}
                  {(stats?.recommendations.urgent || 0) > 0 && stats && (
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                      <p className="text-sm font-medium text-foreground">
                        {stats.recommendations.urgent} urgent appointment recommendation{stats.recommendations.urgent !== 1 ? 's' : ''}
                      </p>
                      <button
                        onClick={() => router.push('/appointments')}
                        className="mt-2 text-sm text-primary hover:underline"
                      >
                        View Recommendations →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* View Tabs */}
            <div className="flex items-center gap-2 border-b border-border">
              <TabButton
                active={selectedView === 'overview'}
                onClick={() => setSelectedView('overview')}
                label="Overview"
              />
              <TabButton
                active={selectedView === 'tasks'}
                onClick={() => setSelectedView('tasks')}
                label={`Tasks (${stats?.actionItems.total || 0})`}
              />
              <TabButton
                active={selectedView === 'activity'}
                onClick={() => setSelectedView('activity')}
                label="Recent Activity"
              />
            </div>

            {/* Overview Tab */}
            {selectedView === 'overview' && (
              <div className="space-y-6">
                {/* Family Member Snapshots */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-foreground">Family Member Health Snapshots</h2>
                    <Link
                      href="/patients"
                      className="text-sm text-primary hover:underline"
                    >
                      View All →
                    </Link>
                  </div>
                  {patientSnapshots.length === 0 ? (
                    <div className="bg-card rounded-lg border-2 border-border p-8 text-center">
                      <UserGroupIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-4">No family members added yet</p>
                      <Link
                        href="/patients/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                      >
                        <PlusIcon className="w-5 h-5" />
                        Add Family Member
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {patientSnapshots.map(patient => (
                        <PatientSnapshotCard
                          key={patient.id}
                          patient={patient}
                          onClick={() => router.push(`/patients/${patient.id}`)}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Upcoming Appointments */}
                {upcomingAppointments.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-foreground">Upcoming Appointments</h2>
                      <Link
                        href="/appointments"
                        className="text-sm text-primary hover:underline"
                      >
                        View All →
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {upcomingAppointments.map(apt => (
                        <AppointmentCard
                          key={apt.id}
                          appointment={apt}
                          onClick={() => router.push(`/appointments/${apt.id}`)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Management Tools Directory */}
                <section>
                  <h2 className="text-xl font-bold text-foreground mb-4">All Management Tools</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ToolCard
                      title="Family Member Profiles"
                      description="View and manage health records for your family"
                      icon={<UserGroupIcon className="w-6 h-6" />}
                      href="/patients"
                      color="blue"
                    />
                    <ToolCard
                      title="Medications"
                      description="Track prescriptions and dosage schedules"
                      icon={<span className="text-2xl">💊</span>}
                      href="/medications"
                      color="purple"
                    />
                    <ToolCard
                      title="Appointments"
                      description="Schedule and manage medical appointments"
                      icon={<CalendarDaysIcon className="w-6 h-6" />}
                      href="/appointments"
                      color="green"
                    />
                    <ToolCard
                      title="Family Directory"
                      description="Manage family members and access permissions"
                      icon={<UserGroupIcon className="w-6 h-6" />}
                      href="/family/dashboard"
                      color="amber"
                    />
                    <ToolCard
                      title="Documents"
                      description="Store and manage medical records and insurance cards"
                      icon={<span className="text-2xl">📄</span>}
                      href="/family-admin/documents"
                      color="indigo"
                    />
                    <ToolCard
                      title="Progress Tracking"
                      description="View charts and health trends"
                      icon={<ChartBarIcon className="w-6 h-6" />}
                      href="/progress"
                      color="teal"
                    />
                    <ToolCard
                      title="Notifications"
                      description="Stay updated on health events and reminders"
                      icon={<BellIcon className="w-6 h-6" />}
                      href="/notifications"
                      color="pink"
                    />
                    <ToolCard
                      title="Healthcare Providers"
                      description="Manage doctors and medical providers"
                      icon={<span className="text-2xl">👨‍⚕️</span>}
                      href="/providers"
                      color="cyan"
                    />
                    <ToolCard
                      title="Households"
                      description="Manage physical residences and assign family members"
                      icon={<span className="text-2xl">🏠</span>}
                      href="/family-admin/households"
                      color="orange"
                    />
                    <ToolCard
                      title="Shopping Lists"
                      description="View and manage shopping for each household"
                      icon={<span className="text-2xl">🛒</span>}
                      href="/family-admin/shopping"
                      color="lime"
                    />
                    <ToolCard
                      title="Kitchen Inventory"
                      description="Track food inventory across all households"
                      icon={<span className="text-2xl">📦</span>}
                      href="/family-admin/inventory"
                      color="emerald"
                    />
                    <ToolCard
                      title="Role Management"
                      description="Manage family member permissions and access"
                      icon={<span className="text-2xl">🔐</span>}
                      href="/family-admin/roles"
                      color="slate"
                    />
                    <ToolCard
                      title="Family Invitations"
                      description="Send and manage family member invites"
                      icon={<EnvelopeIcon className="w-6 h-6" />}
                      href="/family-admin/invites"
                      color="teal"
                    />
                  </div>
                </section>
              </div>
            )}

            {/* Tasks Tab */}
            {selectedView === 'tasks' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">Action Items</h2>
                  {stats && stats.actionItems.total > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {stats.actionItems.overdue > 0 && (
                        <span className="text-error font-medium">{stats.actionItems.overdue} Overdue</span>
                      )}
                      {stats.actionItems.overdue > 0 && stats.actionItems.dueToday > 0 && <span className="mx-2">•</span>}
                      {stats.actionItems.dueToday > 0 && (
                        <span className="text-warning-dark font-medium">{stats.actionItems.dueToday} Due Today</span>
                      )}
                    </div>
                  )}
                </div>
                {actionItems.length === 0 ? (
                  <div className="bg-card rounded-lg border-2 border-border p-8 text-center">
                    <CheckCircleIcon className="w-12 h-12 text-success mx-auto mb-3" />
                    <p className="text-foreground font-medium mb-1">All Caught Up!</p>
                    <p className="text-sm text-muted-foreground">No pending tasks at this time</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {actionItems.map(item => (
                      <ActionItemCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activity Tab */}
            {selectedView === 'activity' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">Recent Activity (Last 7 Days)</h2>
                {activity.length === 0 ? (
                  <div className="bg-card rounded-lg border-2 border-border p-8 text-center">
                    <ClockIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No recent activity</p>
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

          </div>
        )}
      </main>
    </div>
  )
}

// Helper Components
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  subtext?: string
  color: 'blue' | 'red' | 'yellow' | 'purple' | 'green' | 'teal'
  onClick?: () => void
  highlight?: boolean
}

function StatCard({ icon, label, value, subtext, color, onClick, highlight }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    teal: 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
  }

  return (
    <div
      className={`bg-card rounded-lg border-2 ${highlight ? 'border-error animate-pulse' : 'border-border'} p-6 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </div>
  )
}

interface TabButtonProps {
  active: boolean
  onClick: () => void
  label: string
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 font-medium transition-colors border-b-2 ${
        active
          ? 'border-primary text-primary dark:text-purple-400'
          : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  )
}

function PatientSnapshotCard({ patient, onClick }: any) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div
      className="bg-card rounded-lg border-2 border-border p-5 cursor-pointer hover:border-primary-light hover:shadow-lg transition-all"
      onClick={onClick}
    >
      <div className="flex items-start gap-4 mb-4">
        {patient.photo ? (
          <img
            src={patient.photo}
            alt={patient.name}
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center">
            <span className="text-primary font-semibold text-xl">
              {patient.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate">{patient.name}</h3>
          <p className="text-sm text-muted-foreground">{patient.relationship}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            patient.type === 'human' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
          }`}>
            {patient.type === 'human' ? 'Human' : 'Pet'}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Active Medications:</span>
          <span className="font-medium text-foreground">{patient.activeMedications}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Last Vital Check:</span>
          <span className="font-medium text-foreground">{formatDate(patient.lastVitalCheck)}</span>
        </div>
        {patient.latestWeight && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Latest Weight:</span>
            <span className="font-medium text-foreground">
              {patient.latestWeight.weight} {patient.latestWeight.unit}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function AppointmentCard({ appointment, onClick }: any) {
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    }
  }

  const { date, time } = formatDateTime(appointment.dateTime)

  return (
    <div
      className="bg-card rounded-lg border-2 border-border p-4 cursor-pointer hover:border-primary-light hover:shadow-lg transition-all"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
          <CalendarDaysIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground truncate">{appointment.providerName}</h3>
          <p className="text-sm text-muted-foreground">{appointment.appointmentType}</p>
          <p className="text-sm text-foreground mt-1">
            {appointment.patientName} • {date} at {time}
          </p>
          {appointment.requiresDriver && (
            <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
              Driver Needed
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function ToolCard({ title, description, icon, href, color }: any) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
    teal: 'bg-teal-500',
    pink: 'bg-pink-500',
    cyan: 'bg-cyan-500',
    orange: 'bg-orange-500',
    lime: 'bg-lime-500',
    emerald: 'bg-emerald-500',
    slate: 'bg-slate-500'
  }

  return (
    <Link
      href={href}
      className="bg-card rounded-lg border-2 border-border p-6 hover:border-primary-light hover:shadow-lg transition-all"
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color] || 'bg-gray-500'} flex items-center justify-center text-white flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  )
}

function ActionItemCard({ item }: any) {
  const isOverdue = new Date(item.dueDate) < new Date()
  const isDueToday = new Date(item.dueDate).toDateString() === new Date().toDateString()

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300',
    high: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-300',
    normal: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-300',
    low: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-300'
  }

  return (
    <div className={`bg-card rounded-lg border-2 ${isOverdue ? 'border-error' : 'border-border'} p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${priorityColors[item.priority] || priorityColors['normal']}`}>
              {item.priority.toUpperCase()}
            </span>
            {isOverdue && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-error-light dark:bg-red-900/20 text-error-dark border border-red-300">
                OVERDUE
              </span>
            )}
            {isDueToday && !isOverdue && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-warning-light dark:bg-yellow-900/20 text-warning-dark border border-yellow-300">
                DUE TODAY
              </span>
            )}
          </div>
          <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
          {item.patientName && (
            <p className="text-xs text-muted-foreground">For: {item.patientName}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Due: {new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
        <button
          className="px-3 py-2 bg-success text-white rounded-lg hover:bg-success-dark transition-colors text-sm font-medium whitespace-nowrap"
        >
          Mark Done
        </button>
      </div>
    </div>
  )
}

function ActivityItemCard({ item }: any) {
  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="bg-card rounded-lg border-2 border-border p-4">
      <div className="flex items-start gap-4">
        <div className="text-3xl flex-shrink-0">{item.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground mb-1">{item.title}</h3>
          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {item.patientName && <span>{item.patientName}</span>}
            {item.patientName && item.actionByName && <span>•</span>}
            {item.actionByName && <span>by {item.actionByName}</span>}
            <span>•</span>
            <span>{formatTimestamp(item.timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
