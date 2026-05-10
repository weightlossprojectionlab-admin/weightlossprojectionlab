'use client'

/**
 * VisitSummarySheet — modal that captures the post-visit summary
 * AND flips the appointment to status='completed' in one save.
 *
 * Phase E of the medical-binder gap close. Doctors hand the
 * patient/caregiver discharge instructions; this captures them
 * structurally so they're searchable later — diagnoses given,
 * tests ordered, treatment plan, follow-up timing.
 *
 * Triggered by a "Mark complete" button on an upcoming
 * appointment in AppointmentList. Saves through the existing
 * /api/appointments/[id] PUT endpoint via useAppointments.
 * updateAppointment — no new endpoints.
 */

import { useState } from 'react'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import type { Appointment, AppointmentStatus } from '@/types/medical'

interface VisitSummarySheetProps {
  appointment: Appointment
  onSave: (
    id: string,
    updates: {
      status: AppointmentStatus
      visitSummary?: string
      diagnosisGiven?: string
      testsOrdered?: string[]
      treatmentPlan?: string
      followUpNeeded?: boolean
      nextAppointmentDate?: string
      completedAt?: string
    },
  ) => Promise<void>
  onClose: () => void
}

export default function VisitSummarySheet({ appointment, onSave, onClose }: VisitSummarySheetProps) {
  const [visitSummary, setVisitSummary] = useState(appointment.visitSummary ?? '')
  const [diagnosisGiven, setDiagnosisGiven] = useState(appointment.diagnosisGiven ?? '')
  const [testsOrdered, setTestsOrdered] = useState<string[]>(appointment.testsOrdered ?? [])
  const [draftTest, setDraftTest] = useState('')
  const [treatmentPlan, setTreatmentPlan] = useState(appointment.treatmentPlan ?? '')
  const [followUpNeeded, setFollowUpNeeded] = useState(appointment.followUpNeeded ?? false)
  const [nextAppointmentDate, setNextAppointmentDate] = useState(
    appointment.nextAppointmentDate ? appointment.nextAppointmentDate.slice(0, 10) : '',
  )
  const [saving, setSaving] = useState(false)

  const addTest = () => {
    const trimmed = draftTest.trim()
    if (!trimmed) return
    if (testsOrdered.length >= 20) {
      toast.error('Maximum 20 tests per appointment')
      return
    }
    setTestsOrdered([...testsOrdered, trimmed])
    setDraftTest('')
  }

  const removeTest = (index: number) => {
    setTestsOrdered(testsOrdered.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Convert the date-input value to ISO datetime for storage
      // (zod schema expects a full datetime). Local-noon avoids
      // timezone-rollback to the previous day.
      const nextIso = nextAppointmentDate
        ? new Date(`${nextAppointmentDate}T12:00:00`).toISOString()
        : undefined

      await onSave(appointment.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        visitSummary: visitSummary.trim() || undefined,
        diagnosisGiven: diagnosisGiven.trim() || undefined,
        testsOrdered: testsOrdered.length > 0 ? testsOrdered : undefined,
        treatmentPlan: treatmentPlan.trim() || undefined,
        followUpNeeded,
        nextAppointmentDate: nextIso,
      })
      // useAppointments.updateAppointment already toasts on success.
      onClose()
    } catch (error) {
      console.error('[VisitSummarySheet] Save failed', error)
      toast.error('Could not save — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Visit Summary</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {appointment.providerName ?? 'Appointment'}
              {appointment.specialty ? ` — ${appointment.specialty}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="diagnosisGiven" className="block text-sm font-medium text-foreground mb-2">
              Diagnosis given <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="diagnosisGiven"
              type="text"
              value={diagnosisGiven}
              onChange={(e) => setDiagnosisGiven(e.target.value)}
              placeholder="What did the provider diagnose?"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tests ordered <span className="text-muted-foreground font-normal">(optional)</span>
            </label>

            {testsOrdered.length > 0 && (
              <ul className="mb-2 space-y-1">
                {testsOrdered.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm bg-background border border-border rounded px-2 py-1.5"
                  >
                    <span className="text-muted-foreground text-xs mt-0.5">{i + 1}.</span>
                    <span className="flex-1 text-foreground">{t}</span>
                    <button
                      type="button"
                      onClick={() => removeTest(i)}
                      className="text-error hover:underline text-xs shrink-0"
                      aria-label={`Remove test ${i + 1}`}
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
                value={draftTest}
                onChange={(e) => setDraftTest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTest()
                  }
                }}
                placeholder="e.g. CBC, lipid panel, MRI"
                className="flex-1 px-3 py-1.5 text-sm border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                type="button"
                onClick={addTest}
                disabled={!draftTest.trim()}
                className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 text-foreground rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <PlusIcon className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="treatmentPlan" className="block text-sm font-medium text-foreground mb-2">
              Treatment plan <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="treatmentPlan"
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              rows={3}
              placeholder="Medications, lifestyle changes, referrals"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label htmlFor="visitSummary" className="block text-sm font-medium text-foreground mb-2">
              Visit summary <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="visitSummary"
              value={visitSummary}
              onChange={(e) => setVisitSummary(e.target.value)}
              rows={3}
              placeholder="Anything else worth remembering"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="followUpNeeded"
              type="checkbox"
              checked={followUpNeeded}
              onChange={(e) => setFollowUpNeeded(e.target.checked)}
              className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
            />
            <label htmlFor="followUpNeeded" className="text-sm text-foreground">
              Follow-up needed
            </label>
          </div>

          <div>
            <label htmlFor="nextAppointmentDate" className="block text-sm font-medium text-foreground mb-2">
              Next appointment date <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="nextAppointmentDate"
              type="date"
              value={nextAppointmentDate}
              onChange={(e) => setNextAppointmentDate(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground mt-1">
              We'll surface this on the dashboard so you remember to schedule it.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-background transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              data-write="true"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving…' : 'Mark Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
