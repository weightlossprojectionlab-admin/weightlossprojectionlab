'use client'

/**
 * Migration status banner + completion modal.
 *
 * Subscribes to the `migrations/migrate-to-usda` Firestore doc that the
 * admin migration route writes to. Two surfaces:
 *
 * 1. **Banner** — sticky at the top of the app shell whenever a migration
 *    is `running`. Shows live progress (X / Y processed). Persists across
 *    navigation, so the admin can leave /admin/barcodes without losing
 *    sight of the job.
 *
 * 2. **Completion modal** — fires once when the doc transitions from
 *    `running` to `complete` or `failed`. Surfaces final stats so the
 *    admin sees the result no matter which page they're on.
 *
 * Mount once in a high-level layout (dashboard layout). The component is
 * cheap when there's nothing running — it just listens to one doc.
 */

import { useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

type MigrationStatus = {
  status: 'running' | 'complete' | 'failed' | 'paused'
  total: number
  processed: number
  migrated: number
  deleted: number
  errors: number
  cursor?: string | null
  runId?: string
  startedAt?: Timestamp | Date
  finishedAt?: Timestamp | Date
  errorMessage?: string
  performedByEmail?: string
}

export function MigrationStatusBanner() {
  const [status, setStatus] = useState<MigrationStatus | null>(null)
  const [completionModal, setCompletionModal] = useState<MigrationStatus | null>(null)
  const prevStatusRef = useRef<string | null>(null)
  // Keys of finished migrations the user has already dismissed — keyed by
  // the finishedAt timestamp so a fresh run produces a fresh modal.
  const dismissedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const ref = doc(db, 'migrations', 'migrate-to-usda')
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? (snap.data() as MigrationStatus) : null
        if (data) {
          // Detect transition from running → complete/failed/paused and pop
          // the modal. Paused = chain broken; user should see the cursor so
          // they can resume.
          if (
            prevStatusRef.current === 'running' &&
            (data.status === 'complete' || data.status === 'failed' || data.status === 'paused')
          ) {
            const key = finishedAtKey(data)
            if (!dismissedRef.current.has(key)) {
              setCompletionModal(data)
            }
          }
          prevStatusRef.current = data.status
        }
        setStatus(data)
      },
      (err) => {
        // Snapshot listener errors (permissions, network, etc.) shouldn't
        // crash the whole shell — silently fall back to no banner.
        // eslint-disable-next-line no-console
        console.warn('[MigrationStatusBanner] snapshot error', err)
      },
    )
    return () => unsub()
  }, [])

  const dismissModal = () => {
    if (completionModal) {
      dismissedRef.current.add(finishedAtKey(completionModal))
    }
    setCompletionModal(null)
  }

  const isRunning = status?.status === 'running'
  const pct = isRunning && status.total > 0 ? Math.min(100, Math.round((status.processed / status.total) * 100)) : 0

  return (
    <>
      {isRunning && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-0 z-50 w-full border-b border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100"
        >
          <div className="container mx-auto px-4 py-2">
            <div className="flex items-center gap-3 text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
              <span className="font-medium flex-shrink-0">Migrating products to USDA</span>
              <span className="text-blue-700 dark:text-blue-200/80 tabular-nums">
                {status.processed.toLocaleString()} / {status.total.toLocaleString()} ({pct}%)
              </span>
              <div className="flex-1 max-w-xs h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-blue-700 dark:text-blue-200/80 hidden sm:inline">
                {status.migrated.toLocaleString()} migrated · {status.deleted.toLocaleString()} deleted
                {status.errors > 0 && ` · ${status.errors.toLocaleString()} errors`}
              </span>
            </div>
          </div>
        </div>
      )}

      {completionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div
              className={`px-5 py-4 flex items-center gap-3 border-b border-border ${
                completionModal.status === 'complete'
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}
            >
              {completionModal.status === 'complete' ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              )}
              <h2 className="text-lg font-semibold text-foreground flex-1">
                {completionModal.status === 'complete'
                  ? 'Migration complete'
                  : completionModal.status === 'paused'
                    ? 'Migration paused'
                    : 'Migration failed'}
              </h2>
              <button
                type="button"
                onClick={dismissModal}
                className="inline-flex items-center justify-center h-8 w-8 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Dismiss"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              {(completionModal.status === 'failed' || completionModal.status === 'paused') &&
                completionModal.errorMessage && (
                  <p className="text-red-700 dark:text-red-300 text-xs italic">
                    {completionModal.errorMessage}
                  </p>
                )}
              {completionModal.status === 'paused' && completionModal.cursor && (
                <p className="text-xs text-muted-foreground">
                  Paused at cursor <span className="font-mono">{completionModal.cursor}</span>.
                  Re-run "Migrate All to USDA" with that cursor to resume.
                </p>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <dt className="text-muted-foreground">Total products</dt>
                <dd className="text-foreground font-medium tabular-nums text-right">
                  {completionModal.total.toLocaleString()}
                </dd>
                <dt className="text-muted-foreground">Processed</dt>
                <dd className="text-foreground font-medium tabular-nums text-right">
                  {completionModal.processed.toLocaleString()}
                </dd>
                <dt className="text-muted-foreground">Migrated (USDA hit)</dt>
                <dd className="text-green-600 dark:text-green-400 font-medium tabular-nums text-right">
                  {completionModal.migrated.toLocaleString()}
                </dd>
                <dt className="text-muted-foreground">Deleted (USDA miss)</dt>
                <dd className="text-orange-600 dark:text-orange-400 font-medium tabular-nums text-right">
                  {completionModal.deleted.toLocaleString()}
                </dd>
                <dt className="text-muted-foreground">Errors</dt>
                <dd
                  className={`font-medium tabular-nums text-right ${
                    completionModal.errors > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-foreground'
                  }`}
                >
                  {completionModal.errors.toLocaleString()}
                </dd>
              </dl>
              {completionModal.startedAt && completionModal.finishedAt && (
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  Ran {formatDuration(completionModal.startedAt, completionModal.finishedAt)}
                  {completionModal.performedByEmail && ` · by ${completionModal.performedByEmail}`}
                </p>
              )}
            </div>
            <div className="px-5 py-3 bg-muted/30 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={dismissModal}
                className="btn btn-primary text-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function finishedAtKey(s: MigrationStatus): string {
  const t = s.finishedAt
  if (!t) return ''
  if (t instanceof Date) return t.toISOString()
  // Firestore Timestamp
  if (typeof (t as Timestamp).toMillis === 'function') return String((t as Timestamp).toMillis())
  return String(t)
}

function formatDuration(start: Timestamp | Date, end: Timestamp | Date): string {
  const startMs = start instanceof Date ? start.getTime() : (start as Timestamp).toMillis()
  const endMs = end instanceof Date ? end.getTime() : (end as Timestamp).toMillis()
  const ms = endMs - startMs
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remSec = seconds % 60
  if (minutes < 60) return `${minutes}m ${remSec}s`
  const hours = Math.floor(minutes / 60)
  const remMin = minutes % 60
  return `${hours}h ${remMin}m`
}
