'use client'

/**
 * Caregiver Duty Dashboard
 *
 * Shows duties organized by caregiver with workload indicators,
 * completion rates, and an unassigned duties section.
 */

import { useState, useMemo } from 'react'
import {
  HouseholdDuty,
  DutyCategory,
  DutyPriority
} from '@/types/household-duties'
import { CaregiverProfile } from '@/types/caregiver'
import {
  UserIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { DUTY_CATEGORY_LABELS, DUTY_PRIORITY_COLORS } from './duty-constants'

interface CaregiverDutyDashboardProps {
  duties: HouseholdDuty[]
  caregivers: CaregiverProfile[]
  onAssignDuty?: (dutyId: string, caregiverId: string) => void
}

interface CaregiverSummary {
  caregiver: CaregiverProfile
  duties: HouseholdDuty[]
  totalDuties: number
  completedCount: number
  overdueCount: number
  pendingCount: number
  totalEstimatedMinutes: number
  completionRate: number
  workload: 'light' | 'moderate' | 'heavy'
}

function getWorkload(totalMinutes: number, pendingCount: number): 'light' | 'moderate' | 'heavy' {
  if (pendingCount > 10 || totalMinutes > 300) return 'heavy'
  if (pendingCount > 5 || totalMinutes > 120) return 'moderate'
  return 'light'
}

const WORKLOAD_STYLES = {
  light: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  heavy: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30',
}

export function CaregiverDutyDashboard({
  duties,
  caregivers,
  onAssignDuty,
}: CaregiverDutyDashboardProps) {
  const [expandedCaregivers, setExpandedCaregivers] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) => {
    setExpandedCaregivers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { caregiverSummaries, unassignedDuties } = useMemo(() => {
    const summaries: CaregiverSummary[] = caregivers.map(caregiver => {
      const caregiverDuties = duties.filter(d =>
        d.assignedTo?.includes(caregiver.id || caregiver.userId)
      )
      const completedCount = caregiverDuties.filter(d => d.status === 'completed').length
      const overdueCount = caregiverDuties.filter(d => d.status === 'overdue').length
      const pendingCount = caregiverDuties.filter(d =>
        d.status === 'pending' || d.status === 'in_progress'
      ).length
      const totalEstimatedMinutes = caregiverDuties.reduce(
        (sum, d) => sum + (d.estimatedDuration || 0), 0
      )
      const totalDuties = caregiverDuties.length
      const completionRate = totalDuties > 0
        ? Math.round((completedCount / totalDuties) * 100)
        : 0

      return {
        caregiver,
        duties: caregiverDuties,
        totalDuties,
        completedCount,
        overdueCount,
        pendingCount,
        totalEstimatedMinutes,
        completionRate,
        workload: getWorkload(totalEstimatedMinutes, pendingCount),
      }
    })

    const assignedIds = new Set(
      duties.flatMap(d => d.assignedTo || [])
    )
    const unassigned = duties.filter(
      d => !d.assignedTo || d.assignedTo.length === 0
    )

    return { caregiverSummaries: summaries, unassignedDuties: unassigned }
  }, [duties, caregivers])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-accent border border-border">
          <p className="text-sm text-muted-foreground">Total Caregivers</p>
          <p className="text-2xl font-bold text-foreground">{caregivers.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-accent border border-border">
          <p className="text-sm text-muted-foreground">Active Duties</p>
          <p className="text-2xl font-bold text-foreground">
            {duties.filter(d => d.status !== 'completed').length}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-accent border border-border">
          <p className="text-sm text-muted-foreground">Unassigned</p>
          <p className="text-2xl font-bold text-foreground">{unassignedDuties.length}</p>
        </div>
      </div>

      {/* Caregiver Cards */}
      {caregiverSummaries.map(summary => {
        const isExpanded = expandedCaregivers.has(summary.caregiver.id || summary.caregiver.userId)
        const caregiverId = summary.caregiver.id || summary.caregiver.userId

        return (
          <div
            key={caregiverId}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            {/* Caregiver Header */}
            <button
              type="button"
              onClick={() => toggleExpanded(caregiverId)}
              className="w-full p-4 flex items-center gap-4 hover:bg-accent/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-primary" />
              </div>

              <div className="flex-1 text-left">
                <p className="font-semibold text-foreground">{summary.caregiver.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{summary.totalDuties} duties</span>
                  <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${WORKLOAD_STYLES[summary.workload]}`}>
                    {summary.workload}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm">
                {summary.overdueCount > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    {summary.overdueCount}
                  </span>
                )}
                <span className="flex items-center gap-1 text-yellow-400">
                  <ClockIcon className="w-4 h-4" />
                  {summary.pendingCount}
                </span>
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircleIcon className="w-4 h-4" />
                  {summary.completedCount}
                </span>
                <span className="text-muted-foreground">{summary.completionRate}%</span>
              </div>

              {isExpanded
                ? <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
                : <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
              }
            </button>

            {/* Expanded Duty List */}
            {isExpanded && (
              <div className="border-t border-border">
                {summary.duties.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">
                    No duties assigned to this caregiver
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {summary.duties.map(duty => (
                      <div key={duty.id} className="px-4 py-3 flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${
                          duty.status === 'completed' ? 'bg-green-400' :
                          duty.status === 'overdue' ? 'bg-red-400' :
                          duty.status === 'in_progress' ? 'bg-blue-400' :
                          'bg-yellow-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{duty.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {DUTY_CATEGORY_LABELS[duty.category] || duty.category}
                            {duty.estimatedDuration && ` · ${duty.estimatedDuration} min`}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          DUTY_PRIORITY_COLORS[duty.priority] || ''
                        }`}>
                          {duty.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Unassigned Duties */}
      {unassignedDuties.length > 0 && (
        <div className="rounded-xl border-2 border-dashed border-yellow-500/50 bg-yellow-500/5 p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
            Unassigned Duties ({unassignedDuties.length})
          </h3>
          <div className="space-y-2">
            {unassignedDuties.map(duty => (
              <div key={duty.id} className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{duty.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {DUTY_CATEGORY_LABELS[duty.category] || duty.category}
                  </p>
                </div>
                {onAssignDuty && caregivers.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) onAssignDuty(duty.id, e.target.value)
                    }}
                    className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground"
                  >
                    <option value="">Assign to...</option>
                    {caregivers.map(c => (
                      <option key={c.id || c.userId} value={c.id || c.userId}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {caregivers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No caregivers found for this household.</p>
          <p className="text-sm mt-1">Add caregivers to start assigning duties.</p>
        </div>
      )}
    </div>
  )
}
