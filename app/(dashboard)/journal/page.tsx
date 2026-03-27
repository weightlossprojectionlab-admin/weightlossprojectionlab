'use client'

import { useState } from 'react'
import AuthGuard from '@/components/auth/AuthGuard'
import { useJournal } from '@/hooks/useJournal'
import { DailyCheckIn } from '@/components/journal/DailyCheckIn'
import { JournalTimeline } from '@/components/journal/JournalTimeline'
import { WellnessTrends } from '@/components/journal/WellnessTrends'

export default function JournalPage() {
  return (
    <AuthGuard>
      <JournalContent />
    </AuthGuard>
  )
}

function JournalContent() {
  const { entries, stats, loading, createEntry, deleteEntry } = useJournal()
  const [saving, setSaving] = useState(false)

  const handleSave = async (entry: Parameters<typeof createEntry>[0]) => {
    setSaving(true)
    try {
      await createEntry(entry)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Journal</h1>
        <p className="text-muted-foreground mt-1">
          A private space to check in on yourself. Your entries are visible only to you.
        </p>
      </div>

      {/* Wellness Trends (if entries exist) */}
      {stats && stats.totalEntries > 0 && (
        <WellnessTrends stats={stats} />
      )}

      {/* Daily Check-in */}
      <DailyCheckIn onSave={handleSave} saving={saving} />

      {/* Timeline */}
      <JournalTimeline entries={entries} onDelete={deleteEntry} />
    </div>
  )
}
