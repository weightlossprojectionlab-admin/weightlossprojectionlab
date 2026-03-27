'use client'

import { useState } from 'react'
import { SELF_CARE_OPTIONS, JOURNAL_PROMPTS, type SelfCareActivity } from '@/types/journal'
import toast from 'react-hot-toast'

interface DailyCheckInProps {
  onSave: (entry: {
    mood: number
    stress: number
    energy: number
    sleepQuality: number
    selfCare: { did: boolean; activities: SelfCareActivity[] }
    journalText?: string
    prompt?: string
  }) => Promise<void>
  saving?: boolean
}

const SCALE_LABELS: Record<string, string[]> = {
  mood: ['Awful', 'Low', 'Okay', 'Good', 'Great'],
  stress: ['Calm', 'Mild', 'Moderate', 'High', 'Overwhelmed'],
  energy: ['Exhausted', 'Tired', 'Neutral', 'Alert', 'Energized'],
  sleepQuality: ['Terrible', 'Poor', 'Fair', 'Good', 'Restful'],
}

const SCALE_COLORS: Record<string, string[]> = {
  mood: ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-600'],
  stress: ['bg-green-600', 'bg-green-400', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'],
  energy: ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-600'],
  sleepQuality: ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-600'],
}

function ScaleSelector({ label, field, value, onChange }: {
  label: string
  field: string
  value: number
  onChange: (v: number) => void
}) {
  const labels = SCALE_LABELS[field]
  const colors = SCALE_COLORS[field]

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{labels[value - 1]}</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-10 rounded-lg font-bold text-sm transition-all ${
              value === n
                ? `${colors[n - 1]} text-white scale-110 shadow-md`
                : 'bg-muted text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function DailyCheckIn({ onSave, saving }: DailyCheckInProps) {
  const [mood, setMood] = useState(3)
  const [stress, setStress] = useState(3)
  const [energy, setEnergy] = useState(3)
  const [sleepQuality, setSleepQuality] = useState(3)
  const [didSelfCare, setDidSelfCare] = useState(false)
  const [activities, setActivities] = useState<SelfCareActivity[]>([])
  const [journalText, setJournalText] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [showJournal, setShowJournal] = useState(false)

  const toggleActivity = (activity: SelfCareActivity) => {
    setActivities(prev =>
      prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]
    )
  }

  const handleSave = async () => {
    try {
      await onSave({
        mood,
        stress,
        energy,
        sleepQuality,
        selfCare: { did: didSelfCare, activities },
        ...(journalText.trim() ? { journalText: journalText.trim() } : {}),
        ...(selectedPrompt ? { prompt: selectedPrompt } : {}),
      })
      // Reset form
      setMood(3)
      setStress(3)
      setEnergy(3)
      setSleepQuality(3)
      setDidSelfCare(false)
      setActivities([])
      setJournalText('')
      setSelectedPrompt(null)
      setShowJournal(false)
      toast.success('Check-in saved')
    } catch {
      toast.error('Failed to save')
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-5">
      <h2 className="text-lg font-bold text-foreground">How are you today?</h2>

      <ScaleSelector label="Mood" field="mood" value={mood} onChange={setMood} />
      <ScaleSelector label="Stress" field="stress" value={stress} onChange={setStress} />
      <ScaleSelector label="Energy" field="energy" value={energy} onChange={setEnergy} />
      <ScaleSelector label="Sleep Quality" field="sleepQuality" value={sleepQuality} onChange={setSleepQuality} />

      {/* Self-care */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Self-care today?</span>
          <button
            type="button"
            onClick={() => { setDidSelfCare(!didSelfCare); if (didSelfCare) setActivities([]) }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              didSelfCare
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {didSelfCare ? 'Yes' : 'Not yet'}
          </button>
        </div>
        {didSelfCare && (
          <div className="flex flex-wrap gap-2 mt-2">
            {SELF_CARE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleActivity(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activities.includes(opt.value)
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Journal toggle */}
      {!showJournal ? (
        <button
          type="button"
          onClick={() => setShowJournal(true)}
          className="text-sm text-primary hover:underline"
        >
          + Add a journal entry
        </button>
      ) : (
        <div className="space-y-3">
          {/* Prompt suggestions */}
          <div className="flex flex-wrap gap-2">
            {JOURNAL_PROMPTS.slice(0, 4).map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  setSelectedPrompt(prompt)
                  if (!journalText) setJournalText('')
                }}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  selectedPrompt === prompt
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>
          <textarea
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            placeholder={selectedPrompt || 'Write whatever is on your mind...'}
            rows={4}
            className="w-full px-4 py-3 border border-border bg-background text-foreground rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors"
      >
        {saving ? 'Saving...' : 'Save Check-in'}
      </button>
    </div>
  )
}
