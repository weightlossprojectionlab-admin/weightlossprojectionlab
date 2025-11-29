'use client'

/**
 * Caregiver Task Modal
 *
 * Displays outstanding action items for caregivers with:
 * - Priority-based sorting
 * - Category badges
 * - Due date indicators
 * - Expandable task details
 * - Completion tracking
 */

import { useState, useEffect } from 'react'
import { CaregiverActionItem } from '@/types/medical'
import {
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

interface CaregiverTaskModalProps {
  patientId?: string
  onClose: () => void
  onTaskCompleted?: () => void
}

export function CaregiverTaskModal({ patientId, onClose, onTaskCompleted }: CaregiverTaskModalProps) {
  const [tasks, setTasks] = useState<CaregiverActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTasks()
  }, [patientId])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const user = auth.currentUser
      if (!user) return

      const token = await user.getIdToken()

      const url = patientId
        ? `/api/caregiver/action-items?patientId=${patientId}`
        : '/api/caregiver/action-items'

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const data = await response.json()
      setTasks(data.items || [])
    } catch (error) {
      logger.error('[CaregiverTaskModal] Error fetching tasks', error as Error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      setCompletingTasks(prev => new Set(prev).add(taskId))

      const user = auth.currentUser
      if (!user) return

      const token = await user.getIdToken()

      const response = await fetch(`/api/caregiver/action-items/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to complete task')
      }

      // Remove task from list
      setTasks(prev => prev.filter(t => t.id !== taskId))
      toast.success('Task completed!')

      if (onTaskCompleted) {
        onTaskCompleted()
      }
    } catch (error) {
      logger.error('[CaregiverTaskModal] Error completing task', error as Error)
      toast.error('Failed to complete task')
    } finally {
      setCompletingTasks(prev => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }
  }

  const toggleExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700'
      case 'this_week':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300 dark:border-orange-700'
      case 'this_month':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'URGENT'
      case 'this_week':
        return 'This Week'
      case 'this_month':
        return 'This Month'
      default:
        return 'Ongoing'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'medication':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'appointment':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'shopping':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'monitoring':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'
      case 'nutrition':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null

    const now = new Date()
    const due = new Date(dueDate)
    const diffMs = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    return diffDays
  }

  const groupedTasks = {
    urgent: tasks.filter(t => t.priority === 'urgent'),
    thisWeek: tasks.filter(t => t.priority === 'this_week'),
    thisMonth: tasks.filter(t => t.priority === 'this_month'),
    ongoing: tasks.filter(t => t.priority === 'ongoing')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircleIcon className="w-7 h-7" />
              Caregiver Action Items
            </h2>
            <p className="text-sm text-purple-100 mt-1">
              {tasks.length} outstanding task{tasks.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircleIcon className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">All caught up!</h3>
              <p className="text-muted-foreground">
                No outstanding action items at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Urgent Tasks */}
              {groupedTasks.urgent.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                    Urgent ({groupedTasks.urgent.length})
                  </h3>
                  <div className="space-y-3">
                    {groupedTasks.urgent.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        expanded={expandedTasks.has(task.id)}
                        completing={completingTasks.has(task.id)}
                        onToggleExpand={() => toggleExpanded(task.id)}
                        onComplete={() => handleCompleteTask(task.id)}
                        getPriorityColor={getPriorityColor}
                        getPriorityLabel={getPriorityLabel}
                        getCategoryColor={getCategoryColor}
                        getDaysUntilDue={getDaysUntilDue}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* This Week */}
              {groupedTasks.thisWeek.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-orange-500" />
                    This Week ({groupedTasks.thisWeek.length})
                  </h3>
                  <div className="space-y-3">
                    {groupedTasks.thisWeek.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        expanded={expandedTasks.has(task.id)}
                        completing={completingTasks.has(task.id)}
                        onToggleExpand={() => toggleExpanded(task.id)}
                        onComplete={() => handleCompleteTask(task.id)}
                        getPriorityColor={getPriorityColor}
                        getPriorityLabel={getPriorityLabel}
                        getCategoryColor={getCategoryColor}
                        getDaysUntilDue={getDaysUntilDue}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* This Month */}
              {groupedTasks.thisMonth.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">
                    This Month ({groupedTasks.thisMonth.length})
                  </h3>
                  <div className="space-y-3">
                    {groupedTasks.thisMonth.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        expanded={expandedTasks.has(task.id)}
                        completing={completingTasks.has(task.id)}
                        onToggleExpand={() => toggleExpanded(task.id)}
                        onComplete={() => handleCompleteTask(task.id)}
                        getPriorityColor={getPriorityColor}
                        getPriorityLabel={getPriorityLabel}
                        getCategoryColor={getCategoryColor}
                        getDaysUntilDue={getDaysUntilDue}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Ongoing */}
              {groupedTasks.ongoing.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">
                    Ongoing ({groupedTasks.ongoing.length})
                  </h3>
                  <div className="space-y-3">
                    {groupedTasks.ongoing.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        expanded={expandedTasks.has(task.id)}
                        completing={completingTasks.has(task.id)}
                        onToggleExpand={() => toggleExpanded(task.id)}
                        onComplete={() => handleCompleteTask(task.id)}
                        getPriorityColor={getPriorityColor}
                        getPriorityLabel={getPriorityLabel}
                        getCategoryColor={getCategoryColor}
                        getDaysUntilDue={getDaysUntilDue}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-muted">
          <p className="text-xs text-muted-foreground text-center">
            Tasks generated from latest health report • Check off items as you complete them
          </p>
        </div>
      </div>
    </div>
  )
}

// Task Card Component
function TaskCard({
  task,
  expanded,
  completing,
  onToggleExpand,
  onComplete,
  getPriorityColor,
  getPriorityLabel,
  getCategoryColor,
  getDaysUntilDue
}: {
  task: CaregiverActionItem
  expanded: boolean
  completing: boolean
  onToggleExpand: () => void
  onComplete: () => void
  getPriorityColor: (priority: string) => string
  getPriorityLabel: (priority: string) => string
  getCategoryColor: (category: string) => string
  getDaysUntilDue: (dueDate?: string) => number | null
}) {
  const daysUntil = getDaysUntilDue(task.dueDate)

  return (
    <div className={`border-2 ${getPriorityColor(task.priority)} rounded-lg p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getPriorityColor(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getCategoryColor(task.category)}`}>
              {task.category}
            </span>
            {daysUntil !== null && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
              </span>
            )}
          </div>

          <h4 className="font-semibold text-foreground mb-2">{task.task}</h4>

          {task.details && task.details.length > 0 && (
            <div>
              <button
                onClick={onToggleExpand}
                className="text-sm text-primary hover:underline mb-2"
              >
                {expanded ? 'Hide details' : `Show ${task.details.length} detail${task.details.length !== 1 ? 's' : ''}`}
              </button>

              {expanded && (
                <ul className="ml-4 space-y-1 text-sm text-muted-foreground">
                  {task.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onComplete}
          disabled={completing}
          className="flex-shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:cursor-not-allowed"
        >
          {completing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Completing...</span>
            </>
          ) : (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              <span>Complete</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
