'use client'

/**
 * Duty List View
 *
 * Displays household duties with filtering, sorting, and management options.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  HouseholdDuty,
  DutyStatus,
  DutyCategory,
  DutyPriority,
  DutyStats
} from '@/types/household-duties'
import { CaregiverProfile } from '@/types/caregiver'
import { Household } from '@/types/household'
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  HomeIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline'
import { DutyFormModal } from './DutyFormModal'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { useUser } from '@/hooks/useUser'
import { canAddDutyToHousehold } from '@/lib/feature-gates'
import { UpgradePrompt } from '@/components/subscription'

interface DutyListViewProps {
  householdId: string // PRIMARY: Which household to show duties for
  householdName: string
  caregivers: CaregiverProfile[]
  // Optional: Allow switching between multiple households
  households?: Household[]
  onHouseholdChange?: (householdId: string) => void
  // Optional: Filter duties for a specific patient within the household
  forPatientId?: string
  forPatientName?: string
}

export function DutyListView({
  householdId,
  householdName,
  caregivers,
  households,
  onHouseholdChange,
  forPatientId,
  forPatientName
}: DutyListViewProps) {
  const { user } = useUser()
  const [duties, setDuties] = useState<HouseholdDuty[]>([])
  const [stats, setStats] = useState<DutyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<DutyStatus | 'all'>('all')
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingDuty, setEditingDuty] = useState<HouseholdDuty | undefined>()
  const [completingDuties, setCompletingDuties] = useState<Set<string>>(new Set())
  const [deletingDuties, setDeletingDuties] = useState<Set<string>>(new Set())

  // Check duty limit for this household
  const dutyLimitCheck = canAddDutyToHousehold(user, duties.length, householdId)

  useEffect(() => {
    fetchDuties()
  }, [householdId, forPatientId, filter])

  const fetchDuties = async () => {
    try {
      setLoading(true)
      const user = auth.currentUser
      if (!user) return

      const token = await user.getIdToken()

      // Build query with householdId as primary filter
      let url = `/api/household-duties?householdId=${householdId}`

      // Optional: Filter by patient within household
      if (forPatientId) {
        url += `&forPatientId=${forPatientId}`
      }

      if (filter !== 'all') {
        url += `&status=${filter}`
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch duties')
      }

      const data = await response.json()
      setDuties(data.duties || [])
      setStats(data.stats || null)
    } catch (error) {
      logger.error('[DutyListView] Error fetching duties', error as Error)
      toast.error('Failed to load duties')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (dutyId: string) => {
    try {
      setCompletingDuties(prev => new Set(prev).add(dutyId))

      const user = auth.currentUser
      if (!user) return

      const token = await user.getIdToken()

      const response = await fetch(`/api/household-duties/${dutyId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        throw new Error('Failed to complete duty')
      }

      toast.success('Duty completed!')
      fetchDuties()
    } catch (error) {
      logger.error('[DutyListView] Error completing duty', error as Error)
      toast.error('Failed to complete duty')
    } finally {
      setCompletingDuties(prev => {
        const next = new Set(prev)
        next.delete(dutyId)
        return next
      })
    }
  }

  const handleEdit = (duty: HouseholdDuty) => {
    setEditingDuty(duty)
    setShowFormModal(true)
  }

  const handleDelete = async (dutyId: string) => {
    if (!confirm('Are you sure you want to delete this duty?')) {
      return
    }

    try {
      setDeletingDuties(prev => new Set(prev).add(dutyId))

      const user = auth.currentUser
      if (!user) return

      const token = await user.getIdToken()

      const response = await fetch(`/api/household-duties/${dutyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete duty')
      }

      toast.success('Duty deleted')
      fetchDuties()
    } catch (error) {
      logger.error('[DutyListView] Error deleting duty', error as Error)
      toast.error('Failed to delete duty')
    } finally {
      setDeletingDuties(prev => {
        const next = new Set(prev)
        next.delete(dutyId)
        return next
      })
    }
  }

  const getPriorityColor = (priority: DutyPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  const getStatusColor = (status: DutyStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      case 'skipped':
        return 'bg-orange-100 text-orange-800'
    }
  }

  const getDaysUntilDue = (nextDueDate?: string) => {
    if (!nextDueDate) return null

    const now = new Date()
    const due = new Date(nextDueDate)
    const diffMs = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    return diffDays
  }

  const getCaregiverName = (caregiverId: string) => {
    const caregiver = caregivers.find(c => c.id === caregiverId)
    return caregiver?.name || 'Unknown'
  }

  const getShoppingListUrl = (duty: HouseholdDuty): string | null => {
    // Only grocery/shopping duties link to shopping list
    if (duty.category !== 'grocery_shopping' && duty.category !== 'shopping') return null

    // Patient-specific grocery shopping
    if (duty.forPatientId) {
      return `/shopping?memberId=${duty.forPatientId}&dutyId=${duty.id}`
    }

    // Household-level grocery shopping
    return `/shopping?householdId=${duty.householdId}&dutyId=${duty.id}`
  }

  const closeFormModal = () => {
    setShowFormModal(false)
    setEditingDuty(undefined)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Household Selector (if multiple households) */}
      {households && households.length > 1 && onHouseholdChange && (
        <div className="bg-card rounded-lg border border-border p-4">
          <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <HomeIcon className="w-4 h-4" />
            Select Household
          </label>
          <select
            value={householdId}
            onChange={(e) => onHouseholdChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
          >
            {households.map(household => (
              <option key={household.id} value={household.id}>
                {household.name} {household.nickname ? `(${household.nickname})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Header with Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-border p-4">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Duties</div>
          </div>
          <div className="bg-white rounded-lg border border-border p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completedThisWeek}</div>
            <div className="text-sm text-muted-foreground">Completed This Week</div>
          </div>
          <div className="bg-white rounded-lg border border-border p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.byStatus.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div className="bg-white rounded-lg border border-border p-4">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </div>
        </div>
      )}

      {/* Filter and Add Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'in_progress'
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Completed
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!dutyLimitCheck.allowed && dutyLimitCheck.limit && dutyLimitCheck.currentUsage !== undefined && (
            <span className="text-sm text-muted-foreground">
              {dutyLimitCheck.currentUsage}/{dutyLimitCheck.limit} duties used
            </span>
          )}
          <button
            onClick={() => setShowFormModal(true)}
            disabled={!dutyLimitCheck.allowed}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            title={!dutyLimitCheck.allowed ? dutyLimitCheck.message : undefined}
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Duty</span>
          </button>
        </div>
      </div>

      {/* Upgrade Prompt */}
      {!dutyLimitCheck.allowed && (
        <UpgradePrompt
          feature="household-management"
          featureName="Household Duties"
          message={dutyLimitCheck.message}
          variant="banner"
          upgradeUrl={dutyLimitCheck.upgradeUrl}
        />
      )}

      {/* Duty List */}
      {duties.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-bold text-foreground mb-2">No duties found</h3>
          <p className="text-muted-foreground mb-4">
            {filter === 'all'
              ? 'Create your first household duty to get started.'
              : `No ${filter} duties at this time.`}
          </p>
          {dutyLimitCheck.allowed && (
            <button
              onClick={() => setShowFormModal(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Create First Duty
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {duties.map(duty => {
            const daysUntil = getDaysUntilDue(duty.nextDueDate)
            const isCompleting = completingDuties.has(duty.id)
            const isDeleting = deletingDuties.has(duty.id)

            return (
              <div
                key={duty.id}
                className="bg-white border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className="font-semibold text-foreground">{duty.name}</h4>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(duty.priority)}`}>
                        {duty.priority}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(duty.status)}`}>
                        {duty.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Description */}
                    {duty.description && (
                      <p className="text-sm text-muted-foreground mb-2">{duty.description}</p>
                    )}

                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>Frequency: {duty.frequency}</span>
                      {duty.estimatedDuration && <span>{duty.estimatedDuration} min</span>}
                      {daysUntil !== null && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {daysUntil < 0
                            ? `Overdue by ${Math.abs(daysUntil)} days`
                            : daysUntil === 0
                            ? 'Due today'
                            : daysUntil === 1
                            ? 'Due tomorrow'
                            : `Due in ${daysUntil} days`}
                        </span>
                      )}
                    </div>

                    {/* Assigned caregivers */}
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground">Assigned to: </span>
                      <span className="text-xs font-medium text-foreground">
                        {duty.assignedTo.map(id => getCaregiverName(id)).join(', ')}
                      </span>
                    </div>

                    {/* Subtasks */}
                    {duty.subtasks && duty.subtasks.length > 0 && (
                      <div className="mt-2">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-primary hover:underline">
                            {duty.subtasks.length} subtasks
                          </summary>
                          <ul className="ml-4 mt-1 space-y-1 text-muted-foreground">
                            {duty.subtasks.map((task, i) => (
                              <li key={i}>• {task}</li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {/* Shopping List Link (for grocery shopping duties only) */}
                    {getShoppingListUrl(duty) && (
                      <Link
                        href={getShoppingListUrl(duty)!}
                        className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                      >
                        <ShoppingCartIcon className="w-4 h-4" />
                        <span>View List</span>
                      </Link>
                    )}

                    {duty.status !== 'completed' && (
                      <button
                        onClick={() => handleComplete(duty.id)}
                        disabled={isCompleting}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1 disabled:cursor-not-allowed"
                      >
                        {isCompleting ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Completing...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="w-4 h-4" />
                            <span>Complete</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleEdit(duty)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <PencilIcon className="w-4 h-4" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(duty.id)}
                      disabled={isDeleting}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <TrashIcon className="w-4 h-4" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <DutyFormModal
          householdId={householdId}
          householdName={householdName}
          caregivers={caregivers}
          forPatientId={forPatientId}
          forPatientName={forPatientName}
          duty={editingDuty}
          onClose={closeFormModal}
          onSuccess={() => {
            fetchDuties()
            closeFormModal()
          }}
        />
      )}
    </div>
  )
}
