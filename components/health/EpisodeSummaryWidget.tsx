'use client'

import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import type { HealthEpisode, EpisodeType, EpisodeStatus } from '@/types/health-episodes'
import type { PatientProfile } from '@/types/medical'
import { CreateEpisodeModal, CreateEpisodeData } from './CreateEpisodeModal'

interface EpisodeSummaryWidgetProps {
  patientId: string
  patient: PatientProfile
  onViewAll: () => void
}

const TYPE_CONFIG: Record<EpisodeType, { icon: string; label: string }> = {
  illness:       { icon: '🤒', label: 'Illness' },
  injury:        { icon: '🩹', label: 'Injury' },
  chronic_flare: { icon: '🔄', label: 'Flare-up' },
  abuse_concern: { icon: '🔒', label: 'Concern' },
  end_of_life:   { icon: '🕊️', label: 'End of Life' },
}

const STATUS_CONFIG: Record<EpisodeStatus, { label: string; color: string }> = {
  onset:      { label: 'Just Started',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  active:     { label: 'Active',        color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  improving:  { label: 'Improving',     color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  monitoring: { label: 'Monitoring',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  worsened:   { label: 'Worsened',      color: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
  recovered:  { label: 'Recovered',     color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
}

function formatStartDate(startDate: string): string {
  return new Date(startDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function EpisodeSummaryWidget({
  patientId,
  patient,
  onViewAll,
}: EpisodeSummaryWidgetProps) {
  const [episodes, setEpisodes] = useState<HealthEpisode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchEpisodes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        setError('Not authenticated')
        return
      }
      const res = await fetch(`/api/patients/${patientId}/health-episodes`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setEpisodes(data.episodes || [])
      } else {
        setError('Failed to load episodes')
      }
    } catch {
      setError('Failed to load episodes')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchEpisodes()
  }, [fetchEpisodes])

  const handleEpisodeSubmit = async (data: CreateEpisodeData) => {
    const token = await auth.currentUser?.getIdToken()
    if (!token) throw new Error('Not authenticated')
    const csrfToken = getCSRFToken()
    const res = await fetch(`/api/patients/${patientId}/health-episodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      throw new Error('Failed to create episode')
    }
    setShowCreateModal(false)
    await fetchEpisodes()
  }

  // Show 3 most recent episodes (sorted by startDate descending)
  const recentEpisodes = [...episodes]
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 3)

  return (
    <>
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span>🩹</span>
            Health Episodes
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-xs px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              + New Episode
            </button>
            <button
              onClick={onViewAll}
              className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors font-medium"
            >
              View all
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-pulse flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 bg-muted-foreground/20 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
                  <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                </div>
                <div className="h-5 w-16 bg-muted-foreground/20 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-sm text-error mb-2">{error}</p>
            <button
              onClick={fetchEpisodes}
              className="text-xs text-primary hover:text-primary/80 font-medium"
            >
              Try again
            </button>
          </div>
        ) : recentEpisodes.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">No episodes recorded yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Record first episode →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEpisodes.map((episode) => {
              const typeConfig = TYPE_CONFIG[episode.type]
              const statusConfig = STATUS_CONFIG[episode.status]
              return (
                <div
                  key={episode.id}
                  className="flex items-start gap-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  {/* Type icon */}
                  <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
                    {typeConfig.icon}
                  </span>

                  {/* Episode info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {episode.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {typeConfig.label} &middot; Started {formatStartDate(episode.startDate)}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              )
            })}

            {episodes.length > 3 && (
              <button
                onClick={onViewAll}
                className="w-full text-xs text-center text-primary hover:text-primary/80 font-medium pt-1 transition-colors"
              >
                +{episodes.length - 3} more episodes
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Episode Modal */}
      <CreateEpisodeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        patients={[patient]}
        onSubmit={handleEpisodeSubmit}
      />
    </>
  )
}
