'use client'

/**
 * HandoffNotes — per-household composer + recent feed for the shift view.
 *
 * Semantic intent: "what happened on my shift / what does the next person
 * need to know?" A caregiver leaves a short note; the next caregiver and
 * the household owner read the same ledger. One component per household
 * section on the shift view.
 *
 * UX shape (minimal P4 cut):
 *   - Composer: textarea + Post button. Disabled when empty or while
 *     posting. Submit clears the field.
 *   - Feed: last N notes (default 5 shown; see component prop).
 *     Each item: author name, relative time, body.
 *
 * Future polish (deferred):
 *   - "Flag for owner" toggle (data layer ready in P3, UI not wired yet)
 *   - Per-patient tags
 *   - Edit / delete own notes
 *   - View-all link expanding the feed
 */

import { useState } from 'react'
import { useHandoffNotes } from '@/hooks/useHandoffNotes'
import type { HandoffNote } from '@/types/handoff'

interface HandoffNotesProps {
  ownerId: string
  ownerName: string
  /** Max notes shown inline. Default 5. */
  visibleCount?: number
}

function formatRelative(iso: string): string {
  if (!iso) return ''
  const now = Date.now()
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, now - then)
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return new Date(iso).toLocaleDateString()
}

function NoteRow({ note }: { note: HandoffNote }) {
  return (
    <li
      className="bg-background border border-border rounded-md p-3 text-sm"
      data-testid={`handoff-note-${note.id}`}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="font-medium text-foreground text-xs">{note.authorName}</span>
        <span className="text-xs text-muted-foreground">{formatRelative(note.createdAt)}</span>
      </div>
      <p className="text-foreground whitespace-pre-wrap leading-snug">{note.body}</p>
    </li>
  )
}

export function HandoffNotes({ ownerId, ownerName, visibleCount = 5 }: HandoffNotesProps) {
  const { notes, loading, posting, error, post } = useHandoffNotes(ownerId, Math.max(visibleCount, 10))
  const [draft, setDraft] = useState('')
  const visible = notes.slice(0, visibleCount)
  const more = notes.length - visible.length

  const submit = async () => {
    if (!draft.trim()) return
    const ok = await post(draft)
    if (ok) setDraft('')
  }

  return (
    <div
      className="mt-4 bg-card rounded-lg border-2 border-border p-4"
      data-testid={`handoff-notes-${ownerId}`}
    >
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Handoff notes</h3>
        <span className="text-xs text-muted-foreground">
          {notes.length > 0 ? `${notes.length} recent` : 'no notes yet'}
        </span>
      </div>

      <div className="mb-4">
        <label htmlFor={`handoff-composer-${ownerId}`} className="sr-only">
          Leave a note for {ownerName}&apos;s family
        </label>
        <textarea
          id={`handoff-composer-${ownerId}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Leave a note for the next person caring for ${ownerName}'s family…`}
          maxLength={2000}
          rows={3}
          className="w-full px-3 py-2 text-sm border-2 border-border bg-background rounded-md focus:border-primary focus:outline-none resize-y"
          data-testid={`handoff-composer-input-${ownerId}`}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {draft.length}/2000
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim() || posting}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
            data-testid={`handoff-composer-submit-${ownerId}`}
          >
            {posting ? 'Posting…' : 'Post note'}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-error">{error}</p>
        )}
      </div>

      {loading && notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">Loading notes…</p>
      ) : visible.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No notes yet. The next caregiver will see what you write here.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((note) => <NoteRow key={note.id} note={note} />)}
          {more > 0 && (
            <li className="text-xs text-muted-foreground text-center pt-1">
              +{more} older note{more === 1 ? '' : 's'}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
