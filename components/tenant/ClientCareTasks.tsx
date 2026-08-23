'use client'

/**
 * Client care tasks (white-label CRM — visit checklist, Phase 2).
 *
 * The client's standing household duties as a visit checklist: staff mark a task
 * done and it routes through the tenant duties API → the shared completeDuty()
 * service (real DutyCompletion; recurring tasks reschedule). Optimistic per-row
 * update. This component never touches Firestore directly.
 */

import { useState } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { getCSRFToken } from '@/lib/csrf'
import type { ClientDutyTask } from '@/app/tenant-shell/dashboard/_lib/load-families'

interface Props {
  tenantId: string
  userId: string
  tasks: ClientDutyTask[]
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}
function relative(iso: string | null): string {
  if (!iso) return ''
  try {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return formatDate(iso)
  } catch {
    return ''
  }
}

export default function ClientCareTasks({ tenantId, userId, tasks: initial }: Props) {
  const [tasks, setTasks] = useState<ClientDutyTask[]>(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [justDone, setJustDone] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  if (tasks.length === 0) return null

  async function markDone(taskId: string) {
    setBusy(taskId)
    setError(null)
    try {
      if (!auth?.currentUser) throw new Error('You are not signed in.')
      const token = await auth.currentUser.getIdToken()
      const res = await fetch(
        `/api/tenant/${tenantId}/clients/${userId}/duties/${taskId}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-CSRF-Token': getCSRFToken(),
          },
          body: JSON.stringify({}),
        }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.data?.task) {
        throw new Error(json?.error || `Could not mark done (${res.status})`)
      }
      const updated = json.data.task as ClientDutyTask
      setTasks(ts => ts.map(t => (t.id === taskId ? updated : t)))
      setJustDone(d => ({ ...d, [taskId]: true }))
    } catch (err) {
      logger.error('[ClientCareTasks] mark done failed', err as Error)
      setError(err instanceof Error ? err.message : 'Could not mark done.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section>
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Due care tasks</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        This client&apos;s active household duties — the care plan for a visit. Mark one done as you
        complete it.
      </p>

      {error && (
        <div role="alert" className="mb-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <ul className="space-y-2">
        {tasks.map(t => {
          const done = !!justDone[t.id]
          return (
            <li
              key={t.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{t.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {t.category.replace(/_/g, ' ')}
                  {t.lastCompletedAt ? ` · last done ${relative(t.lastCompletedAt)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    t.overdue
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t.overdue ? 'Overdue' : t.nextDueAt ? `Due ${formatDate(t.nextDueAt)}` : 'As needed'}
                </span>
                {done ? (
                  <span className="inline-flex items-center gap-1 min-h-[44px] px-4 text-sm font-semibold text-green-700 dark:text-green-300">
                    ✓ Done
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => markDone(t.id)}
                    disabled={busy === t.id}
                    className="min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
                  >
                    {busy === t.id ? 'Saving…' : 'Mark done'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
