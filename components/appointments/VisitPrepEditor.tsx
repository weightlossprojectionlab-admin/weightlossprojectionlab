'use client'

/**
 * VisitPrepEditor — expand-in-row pre-visit prep panel.
 *
 * Phase E of the medical-binder gap close. Lets the caregiver
 * capture notes + questions for the doctor BEFORE the appointment,
 * so the conversation in the room is structured rather than
 * "what did I want to ask again?"
 *
 * Renders inside an existing appointment row in AppointmentList.
 * Toggles open/closed via a parent-controlled prop. Saves through
 * the existing /api/appointments/[id] PUT endpoint via the
 * useAppointments.updateAppointment mutation — no new endpoints.
 */

import { useState, useEffect } from 'react'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { Appointment } from '@/types/medical'

interface VisitPrepEditorProps {
  appointment: Appointment
  onSave: (id: string, updates: { preVisitNotes?: string; preVisitQuestions?: string[] }) => Promise<void>
  onClose: () => void
}

export default function VisitPrepEditor({ appointment, onSave, onClose }: VisitPrepEditorProps) {
  const [notes, setNotes] = useState(appointment.preVisitNotes ?? '')
  const [questions, setQuestions] = useState<string[]>(appointment.preVisitQuestions ?? [])
  const [draftQuestion, setDraftQuestion] = useState('')
  const [saving, setSaving] = useState(false)

  // Re-sync local state if the appointment prop changes underneath us
  // (e.g. the parent refetches after another caregiver edits).
  useEffect(() => {
    setNotes(appointment.preVisitNotes ?? '')
    setQuestions(appointment.preVisitQuestions ?? [])
  }, [appointment.id, appointment.preVisitNotes, appointment.preVisitQuestions])

  const addQuestion = () => {
    const trimmed = draftQuestion.trim()
    if (!trimmed) return
    if (questions.length >= 20) {
      toast.error('Maximum 20 questions per appointment')
      return
    }
    setQuestions([...questions, trimmed])
    setDraftQuestion('')
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(appointment.id, {
        preVisitNotes: notes.trim() || undefined,
        preVisitQuestions: questions.length > 0 ? questions : undefined,
      })
      // useAppointments.updateAppointment already toasts on success.
      onClose()
    } catch (error) {
      console.error('[VisitPrepEditor] Save failed', error)
      toast.error('Could not save — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 border-t border-border pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-foreground">Pre-visit prep</h5>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close prep editor"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div>
        <label htmlFor={`prep-notes-${appointment.id}`} className="block text-xs font-medium text-foreground mb-1">
          Notes for the visit
        </label>
        <textarea
          id={`prep-notes-${appointment.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Symptoms timeline, recent changes, things to bring up"
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          Questions for the provider
        </label>

        {questions.length > 0 && (
          <ul className="mb-2 space-y-1">
            {questions.map((q, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm bg-background border border-border rounded px-2 py-1.5"
              >
                <span className="text-muted-foreground text-xs mt-0.5">{i + 1}.</span>
                <span className="flex-1 text-foreground">{q}</span>
                <button
                  type="button"
                  onClick={() => removeQuestion(i)}
                  className="text-error hover:underline text-xs shrink-0"
                  aria-label={`Remove question ${i + 1}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={draftQuestion}
            onChange={(e) => setDraftQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addQuestion()
              }
            }}
            placeholder="Add a question…"
            className="flex-1 px-3 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            type="button"
            onClick={addQuestion}
            disabled={!draftQuestion.trim()}
            className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-foreground rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <PlusIcon className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex-1 px-3 py-1.5 text-sm border border-border rounded text-foreground hover:bg-background transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          data-write="true"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary-hover transition-colors disabled:opacity-50 font-medium"
        >
          {saving ? 'Saving…' : 'Save prep'}
        </button>
      </div>
    </div>
  )
}
