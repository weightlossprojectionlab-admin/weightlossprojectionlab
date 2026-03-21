'use client'

/**
 * Duty Analytics Dashboard
 *
 * Shows completion rates, category breakdown, caregiver leaderboard,
 * and weekly trends. Pure CSS charts — no external chart library.
 */

import { useMemo } from 'react'
import {
  HouseholdDuty,
  DutyStats,
  DutyCategory,
} from '@/types/household-duties'
import { CaregiverProfile } from '@/types/caregiver'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { DUTY_CATEGORY_LABELS, DUTY_CATEGORY_COLORS } from './duty-constants'

interface DutyAnalyticsProps {
  duties: HouseholdDuty[]
  stats: DutyStats | null
  caregivers: CaregiverProfile[]
}

interface CaregiverMetric {
  id: string
  name: string
  completed: number
  assigned: number
  rate: number
  overdue: number
}

export function DutyAnalytics({ duties, stats, caregivers }: DutyAnalyticsProps) {
  // Compute caregiver metrics
  const caregiverMetrics: CaregiverMetric[] = useMemo(() => {
    return caregivers.map(c => {
      const id = c.id || c.userId
      const assigned = duties.filter(d => d.assignedTo?.includes(id))
      const completed = assigned.filter(d => d.status === 'completed').length
      const overdue = assigned.filter(d => d.status === 'overdue').length
      return {
        id,
        name: c.name,
        completed,
        assigned: assigned.length,
        rate: assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0,
        overdue,
      }
    }).sort((a, b) => b.completed - a.completed)
  }, [duties, caregivers])

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Partial<Record<DutyCategory, number>> = {}
    duties.forEach(d => {
      counts[d.category] = (counts[d.category] || 0) + 1
    })
    return Object.entries(counts)
      .map(([cat, count]) => ({ category: cat as DutyCategory, count: count as number }))
      .sort((a, b) => b.count - a.count)
  }, [duties])

  const maxCategoryCount = Math.max(...categoryBreakdown.map(c => c.count), 1)

  // Weekly trend (last 4 weeks)
  const weeklyTrend = useMemo(() => {
    const weeks: { label: string; completed: number; total: number }[] = []
    const now = new Date()

    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7)
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const weekDuties = duties.filter(d => {
        if (!d.lastCompletedAt) return false
        const completed = new Date(d.lastCompletedAt)
        return completed >= weekStart && completed < weekEnd
      })

      weeks.push({
        label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed: weekDuties.length,
        total: duties.length,
      })
    }
    return weeks
  }, [duties])

  const maxWeeklyCompleted = Math.max(...weeklyTrend.map(w => w.completed), 1)

  // Overall stats
  const totalDuties = duties.length
  const completedDuties = duties.filter(d => d.status === 'completed').length
  const overdueDuties = duties.filter(d => d.status === 'overdue').length
  const pendingDuties = duties.filter(d => d.status === 'pending' || d.status === 'in_progress').length
  const overallRate = totalDuties > 0 ? Math.round((completedDuties / totalDuties) * 100) : 0

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Completion Rate"
          value={`${overallRate}%`}
          icon={<CheckCircleIcon className="w-5 h-5" />}
          color="text-green-400"
        />
        <StatCard
          label="Overdue"
          value={overdueDuties.toString()}
          icon={<ExclamationTriangleIcon className="w-5 h-5" />}
          color="text-red-400"
        />
        <StatCard
          label="Pending"
          value={pendingDuties.toString()}
          icon={<ClockIcon className="w-5 h-5" />}
          color="text-yellow-400"
        />
        <StatCard
          label="Total Duties"
          value={totalDuties.toString()}
          icon={<ChartBarIcon className="w-5 h-5" />}
          color="text-blue-400"
        />
      </div>

      {/* Completion Ring */}
      <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-8">
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-border"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${overallRate}, 100`}
              className="text-green-500"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-foreground">{overallRate}%</span>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-1">Overall Completion</h3>
          <p className="text-sm text-muted-foreground">
            {completedDuties} of {totalDuties} duties completed
          </p>
          {stats?.averageCompletionTime && (
            <p className="text-sm text-muted-foreground mt-1">
              Avg. completion time: {stats.averageCompletionTime} min
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-foreground mb-4">Duties by Category</h3>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No duties yet.</p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map(({ category, count }) => (
                <div key={category} className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${DUTY_CATEGORY_COLORS[category] || 'bg-gray-500'}`} />
                  <span className="text-sm text-foreground w-28 truncate">
                    {DUTY_CATEGORY_LABELS[category] || category}
                  </span>
                  <div className="flex-1 h-5 bg-accent rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${DUTY_CATEGORY_COLORS[category] || 'bg-gray-500'}`}
                      style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Caregiver Leaderboard */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-foreground mb-4">Caregiver Performance</h3>
          {caregiverMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No caregivers assigned.</p>
          ) : (
            <div className="space-y-3">
              {caregiverMetrics.map((cm, idx) => (
                <div key={cm.id} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-medium text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{cm.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cm.completed}/{cm.assigned} completed
                      {cm.overdue > 0 && <span className="text-red-400"> · {cm.overdue} overdue</span>}
                    </p>
                  </div>
                  <div className="w-16 h-2 bg-accent rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${cm.rate}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-10 text-right">{cm.rate}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold text-foreground mb-4">Weekly Completions (Last 4 Weeks)</h3>
        <div className="flex items-end gap-4 h-32">
          {weeklyTrend.map((week, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-foreground">{week.completed}</span>
              <div className="w-full bg-accent rounded-t-lg overflow-hidden" style={{ height: '100px' }}>
                <div
                  className="w-full bg-primary rounded-t-lg transition-all"
                  style={{
                    height: `${(week.completed / maxWeeklyCompleted) * 100}%`,
                    marginTop: `${100 - (week.completed / maxWeeklyCompleted) * 100}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{week.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
