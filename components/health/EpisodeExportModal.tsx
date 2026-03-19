'use client'

import { useRef } from 'react'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import type {
  HealthEpisode, HealthSymptom, TreatmentAction,
  RecoveryMilestone, ProgressPhoto
} from '@/types/health-episodes'

interface EpisodeExportModalProps {
  episode: HealthEpisode
  symptoms: HealthSymptom[]
  treatments: TreatmentAction[]
  milestones: RecoveryMilestone[]
  photos: ProgressPhoto[]
  patientId: string
  onClose: () => void
  onExported: (exportedAt: string) => void
}

export default function EpisodeExportModal({
  episode,
  symptoms,
  treatments,
  milestones,
  photos,
  patientId,
  onClose,
  onExported,
}: EpisodeExportModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const isLegal = episode.type === 'abuse_concern'
  const generatedAt = new Date().toLocaleString()
  const generatedBy = auth.currentUser?.email || 'Account Owner'

  async function handlePrint() {
    // Record the export
    const now = new Date().toISOString()
    try {
      const token = await auth.currentUser?.getIdToken()
      const csrfToken = getCSRFToken()
      await fetch(`/api/patients/${patientId}/health-episodes/${episode.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({
          exportedAt: now,
          exportedBy: auth.currentUser?.uid,
        }),
      })
      onExported(now)
    } catch (e) {
      console.error('Failed to record export', e)
    }

    window.print()
  }

  const reportTypeLabel = episode.reportableType
    ? episode.reportableType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4 print:hidden" onClick={onClose}>
      <div
        className="bg-card rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header — hidden on print */}
        <div className="p-5 border-b border-border flex items-center justify-between print:hidden">
          <div>
            <h2 className="text-lg font-bold">Export Episode Report</h2>
            <p className="text-sm text-muted-foreground">
              {isLegal
                ? 'Legal/insurance documentation with timestamps'
                : 'Health episode summary for medical or insurance use'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              🖨️ Print / Save PDF
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Printable report preview */}
        <div className="flex-1 overflow-y-auto p-6" ref={printRef}>
          <div id="episode-report" className="max-w-prose mx-auto space-y-6 text-sm">

            {/* Legal header */}
            {isLegal && (
              <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
                <p className="font-bold text-red-800 text-base">⚠️ CONFIDENTIAL — FOR OFFICIAL USE ONLY</p>
                <p className="text-red-700 mt-1">
                  This document was generated for {reportTypeLabel ? `${reportTypeLabel} ` : ''}legal or insurance purposes.
                  All timestamps are system-generated and correspond to when records were created.
                </p>
              </div>
            )}

            {/* Title block */}
            <div className="border-b pb-4">
              <h1 className="text-2xl font-bold">{episode.title}</h1>
              <p className="text-muted-foreground mt-1">
                {episode.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Episode
                {episode.sensitivity === 'sensitive' && ' · Sensitive Record'}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span><strong>Start Date:</strong> {new Date(episode.startDate).toLocaleDateString()}</span>
                <span><strong>End Date:</strong> {episode.endDate ? new Date(episode.endDate).toLocaleDateString() : 'Ongoing'}</span>
                <span><strong>Status:</strong> {episode.status.charAt(0).toUpperCase() + episode.status.slice(1)}</span>
                {episode.diagnosis && <span><strong>Diagnosis:</strong> {episode.diagnosis}</span>}
                {episode.providerName && <span><strong>Provider:</strong> {episode.providerName}</span>}
                {reportTypeLabel && <span><strong>Report Type:</strong> {reportTypeLabel}</span>}
              </div>
            </div>

            {/* Description */}
            {episode.description && (
              <div>
                <h2 className="font-semibold mb-1">Description</h2>
                <p>{episode.description}</p>
              </div>
            )}

            {/* Symptoms */}
            {symptoms.length > 0 && (
              <div>
                <h2 className="font-semibold mb-2">Symptoms Log</h2>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-2 border border-border">Symptom</th>
                      <th className="text-left p-2 border border-border">Severity (1–5)</th>
                      <th className="text-left p-2 border border-border">First Observed</th>
                      <th className="text-left p-2 border border-border">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symptoms.map(s => (
                      <tr key={s.id}>
                        <td className="p-2 border border-border">{s.symptom}</td>
                        <td className="p-2 border border-border">{s.severity}</td>
                        <td className="p-2 border border-border">{new Date(s.firstObserved).toLocaleString()}</td>
                        <td className="p-2 border border-border">{s.resolved ? `Resolved ${s.resolvedAt ? new Date(s.resolvedAt).toLocaleDateString() : ''}` : 'Active'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Treatments */}
            {treatments.length > 0 && (
              <div>
                <h2 className="font-semibold mb-2">Treatments & Actions</h2>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-2 border border-border">Type</th>
                      <th className="text-left p-2 border border-border">Description</th>
                      <th className="text-left p-2 border border-border">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {treatments.map(t => (
                      <tr key={t.id}>
                        <td className="p-2 border border-border">{t.type.replace(/_/g, ' ')}</td>
                        <td className="p-2 border border-border">{t.description}{t.dosage ? ` (${t.dosage}${t.frequency ? ', ' + t.frequency : ''})` : ''}</td>
                        <td className="p-2 border border-border">{new Date(t.startDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Milestones */}
            {milestones.length > 0 && (
              <div>
                <h2 className="font-semibold mb-2">Recovery Milestones</h2>
                <ul className="space-y-1">
                  {milestones.map(m => (
                    <li key={m.id} className="flex gap-3">
                      <span className="text-muted-foreground shrink-0">{new Date(m.achievedDate).toLocaleDateString()}</span>
                      <span>🏆 {m.milestone}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Photo grid */}
            {photos.length > 0 && (
              <div>
                <h2 className="font-semibold mb-2">Photo Documentation ({photos.length} images)</h2>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map(p => (
                    <div key={p.id} className="border border-border rounded overflow-hidden">
                      <img src={p.photoUrl} alt={p.caption || `Day ${p.dayNumber}`} className="w-full aspect-square object-cover" />
                      <div className="p-1.5 bg-muted text-xs">
                        <p className="font-medium">Day {p.dayNumber}</p>
                        <p className="text-muted-foreground">{new Date(p.capturedAt).toLocaleString()}</p>
                        {p.caption && <p className="truncate">{p.caption}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
              <p><strong>Report generated:</strong> {generatedAt}</p>
              <p><strong>Generated by:</strong> {generatedBy}</p>
              {episode.exportedAt && episode.exportedAt !== new Date().toISOString() && (
                <p><strong>Previously exported:</strong> {new Date(episode.exportedAt).toLocaleString()}</p>
              )}
              <p className="mt-2 italic">
                This report is intended for medical, legal, or insurance purposes. All timestamps reflect
                when records were entered into the system. This document is not a substitute for
                professional medical or legal advice.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #episode-report, #episode-report * { visibility: visible; }
          #episode-report { position: fixed; top: 0; left: 0; width: 100%; padding: 20px; }
        }
      `}</style>
    </div>
  )
}
