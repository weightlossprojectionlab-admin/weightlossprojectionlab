'use client'

import { useState } from 'react'
import { TrashIcon } from '@heroicons/react/24/outline'
import type { JournalEntry } from '@/types/journal'

interface JournalTimelineProps {
  entries: JournalEntry[]
  onDelete?: (id: string) => void
}

const MOOD_EMOJI = ['', '😞', '😕', '😐', '🙂', '😄']
const STRESS_EMOJI = ['', '😌', '😊', '😐', '😰', '🤯']

export function JournalTimeline({ entries, onDelete }: JournalTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (entries.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8 text-center">
        <p className="text-4xl mb-3">📝</p>
        <h3 className="text-lg font-bold text-foreground mb-1">No entries yet</h3>
        <p className="text-sm text-muted-foreground">
          Start your first check-in above to begin tracking your wellbeing.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">Recent Entries</h2>
      {entries.map(entry => {
        const date = new Date(entry.createdAt)
        const isExpanded = expandedId === entry.id
        const isToday = new Date().toDateString() === date.toDateString()

        return (
          <div
            key={entry.id}
            className="bg-card rounded-lg border border-border overflow-hidden"
          >
            {/* Summary row */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{MOOD_EMOJI[entry.mood]}</span>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Mood {entry.mood}/5</span>
                    <span>Stress {entry.stress}/5</span>
                    <span>Energy {entry.energy}/5</span>
                    {entry.selfCare?.did && <span className="text-green-600">Self-care</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {entry.journalText && (
                  <span className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded">Journal</span>
                )}
                <span className="text-muted-foreground text-xs">
                  {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
                {/* Scales */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mood</span>
                    <span className="font-medium">{MOOD_EMOJI[entry.mood]} {entry.mood}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stress</span>
                    <span className="font-medium">{STRESS_EMOJI[entry.stress]} {entry.stress}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Energy</span>
                    <span className="font-medium">{entry.energy}/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sleep</span>
                    <span className="font-medium">{entry.sleepQuality}/5</span>
                  </div>
                </div>

                {/* Self-care activities */}
                {entry.selfCare?.did && entry.selfCare.activities.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Self-care:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.selfCare.activities.map(a => (
                        <span key={a} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full capitalize">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Journal text */}
                {entry.journalText && (
                  <div className="bg-background rounded-lg p-3">
                    {entry.prompt && (
                      <p className="text-xs text-primary font-medium mb-1">{entry.prompt}</p>
                    )}
                    <p className="text-sm text-foreground whitespace-pre-wrap">{entry.journalText}</p>
                  </div>
                )}

                {/* Delete */}
                {onDelete && (
                  <button
                    onClick={() => onDelete(entry.id)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    Delete entry
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
