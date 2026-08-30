'use client'

/**
 * Client appointments with per-visit notes (white-label CRM).
 *
 * Each appointment is the visit's running record: staff expand an appointment
 * and log notes ON it (prep → what happened → follow-up). A note lives on the
 * appointment it's about, so there's never a question which visit it belongs to
 * — the note is added from inside that appointment. Internal to the practice;
 * the family does not see these.
 *
 * All mutations go through the tenant appointment-notes API (admin SDK); this
 * component never touches Firestore directly.
 */

import { useState } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { getCSRFToken } from '@/lib/csrf'
import type { ClientAppointment } from '@/app/tenant-shell/dashboard/_lib/load-families'
import type { AppointmentNote, AppointmentNoteReply } from '@/types/tenant'

interface Props {
  tenantId: string
  userId: string
  appointments: ClientAppointment[]
}

function when(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function ClientAppointments({ tenantId, userId, appointments }: Props) {
  // Notes hydrated from the server load; mutated in place as staff add notes.
  const [notesByAppt, setNotesByAppt] = useState<Record<string, AppointmentNote[]>>(() =>
    Object.fromEntries(appointments.map(a => [a.id, a.notes]))
  )
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState<Record<string, string>>({}) // apptId → new-note draft
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({}) // noteId → reply draft
  const [busy, setBusy] = useState<string | null>(null) // apptId being posted to
  const [busyReply, setBusyReply] = useState<string | null>(null) // noteId being replied to
  const [error, setError] = useState<string | null>(null)

  if (appointments.length === 0) return null

  async function authedPost(url: string, message: string): Promise<any> {
    if (!auth?.currentUser) throw new Error('You are not signed in.')
    const token = await auth.currentUser.getIdToken()
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-CSRF-Token': getCSRFToken(),
      },
      body: JSON.stringify({ message }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
    return json?.data
  }

  async function addNote(apptId: string) {
    const text = (draft[apptId] || '').trim()
    if (!text) return
    setBusy(apptId)
    setError(null)
    try {
      const data = await authedPost(
        `/api/tenant/${tenantId}/clients/${userId}/appointments/${apptId}/notes`,
        text
      )
      if (!data?.note) throw new Error('Could not add note.')
      const note = data.note as AppointmentNote
      setNotesByAppt(m => ({ ...m, [apptId]: [...(m[apptId] || []), note] }))
      setDraft(d => ({ ...d, [apptId]: '' }))
    } catch (err) {
      logger.error('[ClientAppointments] add note failed', err as Error)
      setError(err instanceof Error ? err.message : 'Could not add note.')
    } finally {
      setBusy(null)
    }
  }

  async function addReply(apptId: string, noteId: string) {
    const text = (replyDraft[noteId] || '').trim()
    if (!text) return
    setBusyReply(noteId)
    setError(null)
    try {
      const data = await authedPost(
        `/api/tenant/${tenantId}/clients/${userId}/appointments/${apptId}/notes/${noteId}/replies`,
        text
      )
      if (!data?.reply) throw new Error('Could not reply.')
      const reply = data.reply as AppointmentNoteReply
      setNotesByAppt(m => ({
        ...m,
        [apptId]: (m[apptId] || []).map(n =>
          n.id === noteId
            ? { ...n, replies: [...n.replies, reply], replyCount: n.replyCount + 1 }
            : n
        ),
      }))
      setReplyDraft(d => ({ ...d, [noteId]: '' }))
    } catch (err) {
      logger.error('[ClientAppointments] reply failed', err as Error)
      setError(err instanceof Error ? err.message : 'Could not reply.')
    } finally {
      setBusyReply(null)
    }
  }

  const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'

  return (
    <section>
      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
        Upcoming appointments
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Open a visit to log notes on it. Notes are internal to your practice.
      </p>

      {error && (
        <div role="alert" className="mb-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <ul className="space-y-2">
        {appointments.map(a => {
          const notes = notesByAppt[a.id] || []
          const isOpen = !!expanded[a.id]
          return (
            <li
              key={a.id}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {/* Appointment row — toggles the notes drawer */}
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setExpanded(e => ({ ...e, [a.id]: !e[a.id] }))}
                className="w-full text-left p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {a.patientName} · {a.appointmentType}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{a.detail}</p>
                  <span className="mt-2 inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                    {notes.length > 0
                      ? `${isOpen ? 'Hide' : 'View'} notes (${notes.length})`
                      : isOpen
                        ? 'Hide notes'
                        : '+ Add a note'}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {new Date(a.dateTime).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      a.careContext === 'caregiver-visit'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                    }`}
                  >
                    {a.careContext === 'caregiver-visit' ? 'Care visit' : 'Coordinate'}
                  </span>
                </div>
              </button>

              {/* Notes drawer for THIS visit */}
              {isOpen && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-3">
                  {notes.length > 0 ? (
                    <ul className="space-y-3">
                      {notes.map(n => (
                        <li
                          key={n.id}
                          data-note-id={n.id}
                          className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3 text-sm"
                        >
                          {/* The note (message) */}
                          <div>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {n.authorName}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">{when(n.createdAt)}</span>
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{n.body}</p>
                          </div>

                          {/* Replies — the back-and-forth, indented under the note */}
                          {n.replies.length > 0 && (
                            <ul className="mt-2 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                              {n.replies.map(r => (
                                <li key={r.id}>
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {r.authorName}
                                  </span>
                                  <span className="text-xs text-gray-400 ml-2">{when(r.createdAt)}</span>
                                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{r.body}</p>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Reply box — messaging-style, fat-finger friendly */}
                          <div className="mt-2 flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              aria-label={`Reply to ${n.authorName}'s note`}
                              placeholder="Reply…"
                              value={replyDraft[n.id] || ''}
                              onChange={e => setReplyDraft(d => ({ ...d, [n.id]: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  addReply(a.id, n.id)
                                }
                              }}
                              className={`${inputClass} flex-1`}
                            />
                            <button
                              type="button"
                              onClick={() => addReply(a.id, n.id)}
                              disabled={busyReply === n.id || !(replyDraft[n.id] || '').trim()}
                              className="shrink-0 min-h-[44px] rounded-lg px-5 py-2.5 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-800 active:bg-gray-900 disabled:opacity-50"
                            >
                              {busyReply === n.id ? 'Replying…' : 'Reply'}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No notes on this visit yet.
                    </p>
                  )}

                  <div className="space-y-2">
                    <textarea
                      aria-label={`Add a note to ${a.patientName} · ${a.appointmentType}`}
                      rows={3}
                      placeholder="What happened / what to watch…"
                      value={draft[a.id] || ''}
                      onChange={e => setDraft(d => ({ ...d, [a.id]: e.target.value }))}
                      className={inputClass}
                    />
                    {/* Full-width, min ~48px tap target — mobile / fat-finger first. */}
                    <button
                      type="button"
                      onClick={() => addNote(a.id)}
                      disabled={busy === a.id || !(draft[a.id] || '').trim()}
                      className="w-full sm:w-auto min-h-[48px] rounded-lg px-6 py-3 text-base sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
                    >
                      {busy === a.id ? 'Adding…' : 'Add note'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
