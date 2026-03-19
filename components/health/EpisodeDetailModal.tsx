'use client'

import { useState, useEffect, useRef } from 'react'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import { uploadBase64Image } from '@/lib/storage-upload'
import type {
  HealthEpisode, HealthSymptom, TreatmentAction,
  RecoveryMilestone, ProgressPhoto, EpisodeStatus, TreatmentType
} from '@/types/health-episodes'
import { ProgressPhotoGallery } from './ProgressPhotoGallery'
import EpisodeExportModal from './EpisodeExportModal'
import toast from 'react-hot-toast'

interface EpisodeDetailModalProps {
  episode: HealthEpisode
  patientId: string
  onClose: () => void
  onUpdated: (episode: HealthEpisode) => void
}

type Tab = 'overview' | 'symptoms' | 'timeline' | 'photos'

const STATUS_OPTIONS: { value: EpisodeStatus; label: string }[] = [
  { value: 'onset',      label: '🔴 Just Started' },
  { value: 'active',     label: '🟠 Active' },
  { value: 'improving',  label: '🟡 Improving' },
  { value: 'monitoring', label: '🔵 Monitoring' },
  { value: 'worsened',   label: '🔴 Worsened' },
  { value: 'recovered',  label: '🟢 Recovered' },
]

const TREATMENT_TYPE_LABELS: Record<TreatmentType, string> = {
  medication:      '💊 Medication',
  therapy:         '🏃 Therapy',
  rest:            '🛌 Rest',
  diet_change:     '🥗 Diet Change',
  doctor_visit:    '🩺 Doctor Visit',
  vet_visit:       '🐾 Vet Visit',
  emergency_visit: '🚨 Emergency Visit',
  hospice:         '🕊️ Hospice/Palliative',
  legal_report:    '📋 Legal Report Filed',
}

async function getToken() {
  return auth.currentUser?.getIdToken() ?? ''
}

export default function EpisodeDetailModal({
  episode: initialEpisode,
  patientId,
  onClose,
  onUpdated,
}: EpisodeDetailModalProps) {
  const [episode, setEpisode] = useState(initialEpisode)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [symptoms, setSymptoms] = useState<HealthSymptom[]>([])
  const [treatments, setTreatments] = useState<TreatmentAction[]>([])
  const [milestones, setMilestones] = useState<RecoveryMilestone[]>([])
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [showExport, setShowExport] = useState(false)

  // Add forms
  const [newSymptom, setNewSymptom] = useState('')
  const [newSymptomSeverity, setNewSymptomSeverity] = useState<1|2|3|4|5>(3)
  const [newTreatmentType, setNewTreatmentType] = useState<TreatmentType>('medication')
  const [newTreatmentDesc, setNewTreatmentDesc] = useState('')
  const [newMilestone, setNewMilestone] = useState('')
  const [showAddSymptom, setShowAddSymptom] = useState(false)
  const [showAddTreatment, setShowAddTreatment] = useState(false)
  const [showAddMilestone, setShowAddMilestone] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isSensitive = episode.sensitivity === 'sensitive'
  const baseUrl = `/api/patients/${patientId}/health-episodes/${episode.id}`

  useEffect(() => {
    fetchDetail()
  }, [episode.id])

  async function fetchDetail() {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(baseUrl, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setEpisode(data.episode)
        setSymptoms(data.symptoms || [])
        setTreatments(data.treatments || [])
        setMilestones(data.milestones || [])
        setPhotos(data.photos || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(status: EpisodeStatus) {
    const token = await getToken()
    const csrfToken = getCSRFToken()
    const endDate = status === 'recovered' ? new Date().toISOString().split('T')[0] : undefined
    const res = await fetch(baseUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrfToken || '' },
      body: JSON.stringify({ status, ...(endDate ? { endDate } : {}) }),
    })
    if (res.ok) {
      const updated = { ...episode, status, ...(endDate ? { endDate } : {}) }
      setEpisode(updated)
      onUpdated(updated)
      toast.success('Status updated')
    }
  }

  async function addSymptom() {
    if (!newSymptom.trim()) return
    const token = await getToken()
    const csrfToken = getCSRFToken()
    const now = new Date().toISOString()
    const body = {
      episodeId: episode.id, patientId,
      symptom: newSymptom.trim(), severity: newSymptomSeverity,
      firstObserved: now, resolved: false,
      loggedBy: auth.currentUser?.uid, createdAt: now, lastUpdatedAt: now,
    }
    const res = await fetch(`${baseUrl}/symptoms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrfToken || '' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      setSymptoms(prev => [...prev, data.symptom || body])
      setNewSymptom('')
      setShowAddSymptom(false)
      toast.success('Symptom added')
    }
  }

  async function toggleSymptomResolved(symptom: HealthSymptom) {
    const token = await getToken()
    const csrfToken = getCSRFToken()
    const now = new Date().toISOString()
    const updated = { ...symptom, resolved: !symptom.resolved, resolvedAt: !symptom.resolved ? now : undefined, lastUpdatedAt: now }
    await fetch(`${baseUrl}/symptoms/${symptom.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrfToken || '' },
      body: JSON.stringify({ resolved: updated.resolved, resolvedAt: updated.resolvedAt }),
    })
    setSymptoms(prev => prev.map(s => s.id === symptom.id ? updated : s))
  }

  async function addTreatment() {
    if (!newTreatmentDesc.trim()) return
    const token = await getToken()
    const csrfToken = getCSRFToken()
    const now = new Date().toISOString()
    const body = {
      episodeId: episode.id, patientId,
      type: newTreatmentType, description: newTreatmentDesc.trim(),
      startDate: now.split('T')[0],
      loggedBy: auth.currentUser?.uid, createdAt: now, lastUpdatedAt: now,
    }
    const res = await fetch(`${baseUrl}/treatments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrfToken || '' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      setTreatments(prev => [...prev, data.treatment || body])
      setNewTreatmentDesc('')
      setShowAddTreatment(false)
      toast.success('Treatment logged')
    }
  }

  async function addMilestone() {
    if (!newMilestone.trim()) return
    const token = await getToken()
    const csrfToken = getCSRFToken()
    const now = new Date().toISOString()
    const body = {
      episodeId: episode.id, patientId,
      milestone: newMilestone.trim(), achievedDate: now.split('T')[0],
      loggedBy: auth.currentUser?.uid, createdAt: now,
    }
    const res = await fetch(`${baseUrl}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrfToken || '' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      setMilestones(prev => [...prev, data.milestone || body])
      setNewMilestone('')
      setShowAddMilestone(false)
      toast.success('Milestone recorded')
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      const storagePath = `health-episodes/${auth.currentUser?.uid}/${patientId}/${episode.id}/${Date.now()}.jpg`
      const url = await uploadBase64Image(base64, storagePath)
      const token = await getToken()
      const csrfToken = getCSRFToken()
      const now = new Date().toISOString()
      await fetch(`${baseUrl}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': csrfToken || '' },
        body: JSON.stringify({ photoUrl: url, capturedAt: now, fileSize: file.size, mimeType: file.type }),
      })
      await fetchDetail()
      toast.success('Photo added')
    }
    reader.readAsDataURL(file)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'symptoms', label: `Symptoms${symptoms.length > 0 ? ` (${symptoms.filter(s => !s.resolved).length})` : ''}` },
    { id: 'timeline', label: `Timeline${treatments.length + milestones.length > 0 ? ` (${treatments.length + milestones.length})` : ''}` },
    { id: 'photos',   label: `Photos${photos.length > 0 ? ` (${photos.length})` : ''}` },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-5 border-b border-border ${isSensitive ? 'bg-amber-50' : ''}`}>
          {isSensitive && (
            <div className="mb-3 flex items-center gap-2 text-amber-700 bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 text-sm">
              🔒 <span className="font-medium">Sensitive record</span> — visible to account owner only
            </div>
          )}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">{episode.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {new Date(episode.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                {episode.endDate && ` – ${new Date(episode.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowExport(true)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted"
                title="Export report"
              >
                📄 Export
              </button>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Status selector */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <select
              value={episode.status}
              onChange={e => updateStatus(e.target.value as EpisodeStatus)}
              className="text-sm border border-border rounded-lg px-2 py-1 bg-background"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border overflow-x-auto shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  {episode.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{episode.description}</p>
                    </div>
                  )}
                  {episode.diagnosis && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Diagnosis</p>
                      <p className="text-sm font-medium">{episode.diagnosis}</p>
                    </div>
                  )}
                  {episode.providerName && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Healthcare Provider</p>
                      <p className="text-sm">{episode.providerName}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">{symptoms.filter(s => !s.resolved).length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Active symptoms</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">{treatments.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Treatments</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">{photos.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Photos</p>
                    </div>
                  </div>
                  {episode.reportableType && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-amber-800">
                        📋 Report type: {episode.reportableType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      {episode.exportedAt && (
                        <p className="text-xs text-amber-700 mt-1">
                          Last exported: {new Date(episode.exportedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SYMPTOMS TAB */}
              {activeTab === 'symptoms' && (
                <div className="space-y-3">
                  {symptoms.length === 0 && !showAddSymptom && (
                    <p className="text-sm text-muted-foreground">No symptoms logged yet.</p>
                  )}
                  {symptoms.map(s => (
                    <div key={s.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${s.resolved ? 'bg-muted/50 border-border opacity-60' : 'bg-background border-border'}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${s.resolved ? 'line-through text-muted-foreground' : ''}`}>{s.symptom}</span>
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {'⬛'.repeat(s.severity)}{'⬜'.repeat(5 - s.severity)}
                          </span>
                        </div>
                        {s.resolvedAt && <p className="text-xs text-muted-foreground">Resolved {new Date(s.resolvedAt).toLocaleDateString()}</p>}
                      </div>
                      <button
                        onClick={() => toggleSymptomResolved(s)}
                        className={`text-xs px-2 py-1 rounded shrink-0 ${s.resolved ? 'bg-muted text-muted-foreground' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                      >
                        {s.resolved ? 'Reopen' : 'Resolved ✓'}
                      </button>
                    </div>
                  ))}

                  {showAddSymptom ? (
                    <div className="border border-border rounded-lg p-3 space-y-2">
                      <input
                        type="text"
                        placeholder="Symptom name (e.g. Fever, Cough)"
                        value={newSymptom}
                        onChange={e => setNewSymptom(e.target.value)}
                        className="w-full text-sm border border-border rounded px-3 py-2 bg-background"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Severity:</span>
                        {([1,2,3,4,5] as const).map(n => (
                          <button
                            key={n}
                            onClick={() => setNewSymptomSeverity(n)}
                            className={`w-8 h-8 rounded text-sm font-medium ${newSymptomSeverity === n ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/80'}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={addSymptom} className="px-3 py-1.5 bg-primary text-white rounded text-sm">Add</button>
                        <button onClick={() => setShowAddSymptom(false)} className="px-3 py-1.5 bg-muted rounded text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddSymptom(true)} className="text-sm text-primary hover:underline">+ Add symptom</button>
                  )}
                </div>
              )}

              {/* TIMELINE TAB */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  {/* Treatments */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Treatments & Actions</h3>
                    {treatments.length === 0 && <p className="text-sm text-muted-foreground">No treatments logged.</p>}
                    {treatments.map(t => (
                      <div key={t.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                        <span className="text-lg shrink-0">{TREATMENT_TYPE_LABELS[t.type]?.split(' ')[0] ?? '💊'}</span>
                        <div>
                          <p className="text-sm font-medium">{t.description}</p>
                          <p className="text-xs text-muted-foreground">{TREATMENT_TYPE_LABELS[t.type]} · {new Date(t.startDate).toLocaleDateString()}</p>
                          {t.dosage && <p className="text-xs text-muted-foreground">{t.dosage}{t.frequency ? ` · ${t.frequency}` : ''}</p>}
                        </div>
                      </div>
                    ))}
                    {showAddTreatment ? (
                      <div className="border border-border rounded-lg p-3 space-y-2 mt-2">
                        <select
                          value={newTreatmentType}
                          onChange={e => setNewTreatmentType(e.target.value as TreatmentType)}
                          className="w-full text-sm border border-border rounded px-3 py-2 bg-background"
                        >
                          {Object.entries(TREATMENT_TYPE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder="Description"
                          value={newTreatmentDesc}
                          onChange={e => setNewTreatmentDesc(e.target.value)}
                          className="w-full text-sm border border-border rounded px-3 py-2 bg-background"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={addTreatment} className="px-3 py-1.5 bg-primary text-white rounded text-sm">Log</button>
                          <button onClick={() => setShowAddTreatment(false)} className="px-3 py-1.5 bg-muted rounded text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddTreatment(true)} className="text-sm text-primary hover:underline mt-2">+ Log treatment</button>
                    )}
                  </div>

                  {/* Milestones */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Recovery Milestones</h3>
                    {milestones.length === 0 && <p className="text-sm text-muted-foreground">No milestones yet.</p>}
                    {milestones.map(m => (
                      <div key={m.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                        <span className="text-lg">🏆</span>
                        <div>
                          <p className="text-sm font-medium">{m.milestone}</p>
                          <p className="text-xs text-muted-foreground">{new Date(m.achievedDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                    {showAddMilestone ? (
                      <div className="border border-border rounded-lg p-3 space-y-2 mt-2">
                        <input
                          type="text"
                          placeholder="Milestone (e.g. First full night's sleep)"
                          value={newMilestone}
                          onChange={e => setNewMilestone(e.target.value)}
                          className="w-full text-sm border border-border rounded px-3 py-2 bg-background"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={addMilestone} className="px-3 py-1.5 bg-primary text-white rounded text-sm">Record</button>
                          <button onClick={() => setShowAddMilestone(false)} className="px-3 py-1.5 bg-muted rounded text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddMilestone(true)} className="text-sm text-primary hover:underline mt-2">+ Add milestone</button>
                    )}
                  </div>
                </div>
              )}

              {/* PHOTOS TAB */}
              {activeTab === 'photos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{photos.length} photo{photos.length !== 1 ? 's' : ''} · timestamped progress documentation</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                    >
                      + Add Photo
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </div>
                  {photos.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="text-sm text-muted-foreground">No photos yet. Add photos to track visual progress.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {photos.map(p => (
                        <div key={p.id} className="relative rounded-lg overflow-hidden border border-border group">
                          <img src={p.photoUrl} alt={p.caption || `Day ${p.dayNumber}`} className="w-full aspect-square object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1.5">
                            <p className="font-medium">Day {p.dayNumber}</p>
                            <p className="opacity-80">{new Date(p.capturedAt).toLocaleDateString()}</p>
                            {p.caption && <p className="opacity-80 truncate">{p.caption}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showExport && (
        <EpisodeExportModal
          episode={episode}
          symptoms={symptoms}
          treatments={treatments}
          milestones={milestones}
          photos={photos}
          patientId={patientId}
          onClose={() => setShowExport(false)}
          onExported={(exportedAt) => setEpisode(e => ({ ...e, exportedAt }))}
        />
      )}
    </div>
  )
}
