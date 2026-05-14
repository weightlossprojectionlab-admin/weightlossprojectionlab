'use client'

/**
 * DutyActionSheet — inline action panel for a single household duty.
 *
 * Semantic intent: a caregiver doing the work needs a "I just did this"
 * button, not a route to the family-admin "manage duties" page. The Today
 * worklist opens this sheet on duty-card tap; the sheet posts to the
 * existing /api/household-duties/[dutyId]/complete endpoint.
 *
 * Mark complete is the only write action for now. Skip is deferred — no
 * endpoint exists and the parallel-coordination model leans on real
 * completions plus the Care log for context.
 */

import { useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import type { HouseholdDuty } from '@/types/household-duties'

interface DutyActionSheetProps {
  duty: HouseholdDuty
  ownerName: string
  patientName?: string
  onClose: () => void
  /** Fired after a successful Mark complete. Caller refetches and
   *  closes the sheet. */
  onCompleted: () => void
}

function prettyCategory(category?: string): string {
  if (!category) return ''
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDue(iso?: string | null): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  const now = Date.now()
  const diff = t - now
  const day = 86_400_000
  if (diff < -day) return `${Math.floor(-diff / day)} days overdue`
  if (diff < 0) return `${Math.floor(-diff / 3_600_000)}h overdue`
  if (diff < day) return 'Due today'
  if (diff < 2 * day) return 'Due tomorrow'
  if (diff < 7 * day) return `Due in ${Math.floor(diff / day)} days`
  return new Date(iso).toLocaleDateString()
}

export function DutyActionSheet({
  duty,
  ownerName,
  patientName,
  onClose,
  onCompleted,
}: DutyActionSheetProps) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Close on Escape — standard modal contract.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, submitting])

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const user = auth.currentUser
      if (!user) {
        setError('You need to be signed in.')
        setSubmitting(false)
        return
      }
      const token = await user.getIdToken()
      const res = await fetch(`/api/household-duties/${duty.id}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(note.trim() ? { notes: note.trim() } : {}),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body?.error || `Couldn't mark this done (${res.status}).`)
        setSubmitting(false)
        return
      }
      onCompleted()
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.')
      setSubmitting(false)
    }
  }

  const dueLabel = formatDue(duty.nextDueDate)
  const overdue = duty.nextDueDate ? Date.parse(duty.nextDueDate) < Date.now() : false

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duty-sheet-title"
      data-testid="duty-action-sheet"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={() => !submitting && onClose()}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h2 id="duty-sheet-title" className="text-lg font-semibold text-foreground">
              {duty.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {patientName ? `for ${patientName} · ` : ''}{ownerName}&apos;s Family
            </p>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="p-1 -m-1 text-muted-foreground hover:text-foreground"
            aria-label="Close"
            data-testid="duty-sheet-close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {(duty.category || dueLabel) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {duty.category && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                {prettyCategory(duty.category)}
              </span>
            )}
            {dueLabel && (
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  overdue
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                }`}
              >
                {overdue ? '⚠️ ' : '⏰ '}
                {dueLabel}
              </span>
            )}
          </div>
        )}

        {duty.description && (
          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed mb-4">
            {duty.description}
          </p>
        )}

        <label htmlFor="duty-sheet-note" className="block text-xs font-medium text-muted-foreground mb-1.5">
          Add a note (optional)
        </label>
        <textarea
          id="duty-sheet-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How did it go? Anything the family should know?"
          maxLength={1000}
          rows={3}
          disabled={submitting}
          className="w-full px-3 py-2 text-sm border-2 border-border bg-background rounded-md focus:border-primary focus:outline-none resize-y disabled:opacity-60"
          data-testid="duty-sheet-note"
        />
        <p className="text-[10px] text-muted-foreground mt-1">{note.length}/1000</p>

        {error && (
          <p className="mt-3 text-sm text-error" role="alert">{error}</p>
        )}

        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-xl bg-card border-2 border-border text-foreground hover:border-primary disabled:opacity-60 min-h-[44px]"
            data-testid="duty-sheet-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover disabled:opacity-60 min-h-[44px]"
            data-testid="duty-sheet-complete"
          >
            {submitting ? 'Marking done…' : '✓ Mark complete'}
          </button>
        </div>
      </div>
    </div>
  )
}
