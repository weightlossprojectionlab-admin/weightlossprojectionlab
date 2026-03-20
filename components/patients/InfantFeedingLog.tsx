'use client'

import { useState } from 'react'
import { useInfantFeeding } from '@/hooks/useInfantFeeding'
import { FeedType, FEED_TYPE_LABELS, FEED_TYPE_ICONS, NewFeedingEntry } from '@/types/infant-feeding'
import toast from 'react-hot-toast'

interface InfantFeedingLogProps {
  patientId: string
  accountOwnerId: string
  patientName: string
}

const BREAST_TYPES: FeedType[] = ['breast_left', 'breast_right', 'breast_both']
const isBreast = (feedType: FeedType) => BREAST_TYPES.includes(feedType)

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function InfantFeedingLog({ patientId, accountOwnerId, patientName }: InfantFeedingLogProps) {
  const { entries, loading, error, logFeeding, deleteFeeding } = useInfantFeeding({ patientId, accountOwnerId })
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [feedType, setFeedType] = useState<FeedType>('breast_left')
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [durationMinutes, setDurationMinutes] = useState('')
  const [amountOz, setAmountOz] = useState('')
  const [notes, setNotes] = useState('')

  const resetForm = () => {
    setFeedType('breast_left')
    setStartedAt(new Date().toISOString().slice(0, 16))
    setDurationMinutes('')
    setAmountOz('')
    setNotes('')
  }

  const handleSubmit = async () => {
    const entry: NewFeedingEntry = {
      feedType,
      startedAt: new Date(startedAt).toISOString(),
      durationMinutes: isBreast(feedType) && durationMinutes ? parseInt(durationMinutes, 10) : undefined,
      amountOz: !isBreast(feedType) && amountOz ? parseFloat(amountOz) : undefined,
      notes: notes.trim() || undefined,
    }

    setSaving(true)
    try {
      await logFeeding(entry)
      toast.success('Feeding logged!')
      resetForm()
      setShowModal(false)
    } catch {
      toast.error('Failed to save feeding log')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entryId: string) => {
    try {
      await deleteFeeding(entryId)
      toast.success('Entry removed')
    } catch {
      toast.error('Failed to delete entry')
    }
  }

  // Group entries by date
  const grouped: Record<string, typeof entries> = {}
  for (const entry of entries) {
    const dateKey = new Date(entry.startedAt).toDateString()
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(entry)
  }

  // Daily totals for today
  const todayKey = new Date().toDateString()
  const todayEntries = grouped[todayKey] || []
  const todayFeeds = todayEntries.length
  const todayOz = todayEntries.reduce((sum, e) => sum + (e.amountOz ?? 0), 0)
  const todayMinutes = todayEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0)

  return (
    <div className="bg-card rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Feeding Log</h2>
          <p className="text-sm text-muted-foreground">Track feeds for {patientName}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Log Feed
        </button>
      </div>

      {/* Today's summary */}
      {todayFeeds > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{todayFeeds}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Feeds today</div>
          </div>
          {todayOz > 0 && (
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{todayOz.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">oz today</div>
            </div>
          )}
          {todayMinutes > 0 && (
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{todayMinutes}</div>
              <div className="text-xs text-muted-foreground mt-0.5">min nursing</div>
            </div>
          )}
        </div>
      )}

      {/* Feed history */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive text-center py-8">{error}</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">🍼</p>
          <p className="font-medium">No feeds logged yet</p>
          <p className="text-sm mt-1">Tap &quot;Log Feed&quot; to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateKey, dayEntries]) => (
            <div key={dateKey}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {formatDateHeader(dayEntries[0].startedAt)}
              </h3>
              <div className="space-y-2">
                {dayEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-3">
                    <span className="text-2xl flex-shrink-0">{FEED_TYPE_ICONS[entry.feedType]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{FEED_TYPE_LABELS[entry.feedType]}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(entry.startedAt)}
                        {entry.durationMinutes ? ` · ${entry.durationMinutes} min` : ''}
                        {entry.amountOz ? ` · ${entry.amountOz} oz` : ''}
                        {entry.notes ? ` · ${entry.notes}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors text-lg flex-shrink-0"
                      title="Delete entry"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Feed Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Log Feed</h3>

            <div className="space-y-4">
              {/* Feed type */}
              <div>
                <label className="block text-sm font-medium mb-2">Feed type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(FEED_TYPE_LABELS) as FeedType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFeedType(type)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                        feedType === type
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border text-foreground hover:border-primary/50'
                      }`}
                    >
                      <span>{FEED_TYPE_ICONS[type]}</span>
                      <span>{FEED_TYPE_LABELS[type]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start time */}
              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <input
                  type="datetime-local"
                  value={startedAt}
                  onChange={(e) => setStartedAt(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border-2 border-border bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>

              {/* Duration (breastfeeding) */}
              {isBreast(feedType) && (
                <div>
                  <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full px-4 py-2 rounded-lg border-2 border-border bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              )}

              {/* Amount (formula / pumped) */}
              {!isBreast(feedType) && (
                <div>
                  <label className="block text-sm font-medium mb-2">Amount (oz)</label>
                  <input
                    type="number"
                    min="0.5"
                    max="16"
                    step="0.5"
                    value={amountOz}
                    onChange={(e) => setAmountOz(e.target.value)}
                    placeholder="e.g. 3.0"
                    className="w-full px-4 py-2 rounded-lg border-2 border-border bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. fussy, spat up"
                  className="w-full px-4 py-2 rounded-lg border-2 border-border bg-background text-foreground focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { resetForm(); setShowModal(false) }}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {saving ? 'Saving...' : 'Save Feed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
