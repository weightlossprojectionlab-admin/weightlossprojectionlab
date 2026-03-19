'use client'

import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import type { HealthEpisode, EpisodeType, EpisodeStatus } from '@/types/health-episodes'
import { CreateEpisodeModal, CreateEpisodeData } from './CreateEpisodeModal'
import EpisodeDetailModal from './EpisodeDetailModal'
import type { PatientProfile } from '@/types/medical'

interface EpisodeListProps {
  patientId: string
  patient: PatientProfile
}

const TYPE_CONFIG: Record<EpisodeType, { icon: string; label: string; color: string }> = {
  illness:       { icon: '🤒', label: 'Illness',       color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  injury:        { icon: '🩹', label: 'Injury',        color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  chronic_flare: { icon: '🔄', label: 'Flare-up',      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  abuse_concern: { icon: '🔒', label: 'Concern',       color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  end_of_life:   { icon: '🕊️', label: 'End of Life',  color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
}

const STATUS_CONFIG: Record<EpisodeStatus, { label: string; color: string }> = {
  onset:      { label: 'Just Started',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  active:     { label: 'Active',        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  improving:  { label: 'Improving',     color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  monitoring: { label: 'Monitoring',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  worsened:   { label: 'Worsened',      color: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
  recovered:  { label: 'Recovered',     color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
}

const ACTIVE_STATUSES: EpisodeStatus[] = ['onset', 'active', 'improving', 'worsened']
const MONITORING_STATUSES: EpisodeStatus[] = ['monitoring']
const CLOSED_STATUSES: EpisodeStatus[] = ['recovered']

function formatDateRange(start: string, end?: string) {
  const startD = new Date(start).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  if (!end) return `Started ${startD}`
  const endD = new Date(end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startD} – ${endD}`
}

function daysSince(startDate: string) {
  return Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000)
}

export default function EpisodeList({ patientId, patient }: EpisodeListProps) {
  const [episodes, setEpisodes] = useState<HealthEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<HealthEpisode | null>(null)

  const fetchEpisodes = useCallback(async () => {
    setLoading(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return
      const res = await fetch(`/api/patients/${patientId}/health-episodes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setEpisodes(data.episodes || [])
      }
    } catch (e) {
      console.error('Failed to load episodes', e)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { fetchEpisodes() }, [fetchEpisodes])

  const handleEpisodeSubmit = async (data: CreateEpisodeData) => {
    const token = await auth.currentUser?.getIdToken()
    const csrfToken = getCSRFToken()
    const res = await fetch(`/api/patients/${patientId}/health-episodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-CSRF-Token': csrfToken || '',
      },
      body: JSON.stringify({ ...data, patientType: patient.type }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create episode' }))
      throw new Error(err.error)
    }
    const result = await res.json()
    setEpisodes(prev => [result.episode, ...prev])
    setShowCreateModal(false)
  }

  const handleEpisodeUpdated = (updated: HealthEpisode) => {
    setEpisodes(prev => prev.map(e => e.id === updated.id ? updated : e))
    setSelectedEpisode(updated)
  }

  const active = episodes.filter(e => ACTIVE_STATUSES.includes(e.status as EpisodeStatus))
  const monitoring = episodes.filter(e => MONITORING_STATUSES.includes(e.status as EpisodeStatus))
  const closed = episodes.filter(e => CLOSED_STATUSES.includes(e.status as EpisodeStatus))

  const renderEpisode = (episode: HealthEpisode) => {
    const type = TYPE_CONFIG[episode.type] ?? TYPE_CONFIG.illness
    const status = STATUS_CONFIG[episode.status as EpisodeStatus] ?? STATUS_CONFIG.active
    const isSensitive = episode.sensitivity === 'sensitive'
    const days = daysSince(episode.startDate)

    return (
      <button
        key={episode.id}
        onClick={() => setSelectedEpisode(episode)}
        className="w-full text-left border border-border rounded-lg p-4 hover:border-primary hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-2xl shrink-0">{type.icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground truncate">{episode.title}</span>
                {isSensitive && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                    🔒 Private
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${type.color}`}>
                  {type.label}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {formatDateRange(episode.startDate, episode.endDate)}
                {!episode.endDate && ` · ${days}d`}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 text-xs text-muted-foreground">
            {(episode.photoCount ?? 0) > 0 && (
              <span>📷 {episode.photoCount}</span>
            )}
            {(episode.activeSymptomCount ?? 0) > 0 && (
              <span>⚠️ {episode.activeSymptomCount} symptoms</span>
            )}
          </div>
        </div>
        {episode.diagnosis && (
          <p className="text-xs text-muted-foreground mt-2 pl-9">
            Dx: {episode.diagnosis}
          </p>
        )}
      </button>
    )
  }

  const renderGroup = (title: string, items: HealthEpisode[], emptyMsg?: string) => {
    if (items.length === 0 && !emptyMsg) return null
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
          {title} {items.length > 0 && `(${items.length})`}
        </h3>
        {items.length === 0
          ? <p className="text-sm text-muted-foreground px-1">{emptyMsg}</p>
          : items.map(renderEpisode)
        }
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Health Episodes</h2>
          <p className="text-sm text-muted-foreground">Track illnesses, injuries, and health events with photo documentation</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          + New Episode
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : episodes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
          <div className="text-4xl mb-3">🩺</div>
          <p className="font-medium text-foreground">No episodes recorded yet</p>
          <p className="text-sm text-muted-foreground mt-1">Track illnesses, injuries, and health concerns with photo timelines</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
          >
            Record First Episode
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {renderGroup('Active', active, undefined)}
          {renderGroup('Monitoring', monitoring, undefined)}
          {renderGroup('Recovered', closed, undefined)}
        </div>
      )}

      <CreateEpisodeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        patients={[patient]}
        onSubmit={handleEpisodeSubmit}
      />

      {selectedEpisode && (
        <EpisodeDetailModal
          episode={selectedEpisode}
          patientId={patientId}
          onClose={() => setSelectedEpisode(null)}
          onUpdated={handleEpisodeUpdated}
        />
      )}
    </div>
  )
}
