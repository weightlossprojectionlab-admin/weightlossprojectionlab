/**
 * Caregiver Mental Health Journal Types
 *
 * Private journaling for caregiver wellbeing — mood, stress,
 * energy, sleep, self-care tracking + free-form entries.
 */

export interface JournalCheckIn {
  mood: number        // 1-5 (awful → great)
  stress: number      // 1-5 (calm → overwhelmed)
  energy: number      // 1-5 (exhausted → energized)
  sleepQuality: number // 1-5 (terrible → restful)
  selfCare: {
    did: boolean
    activities: SelfCareActivity[]
  }
}

export type SelfCareActivity =
  | 'exercise'
  | 'meditation'
  | 'social'
  | 'rest'
  | 'hobby'
  | 'therapy'
  | 'nature'
  | 'reading'
  | 'music'
  | 'other'

export const SELF_CARE_OPTIONS: { value: SelfCareActivity; label: string; emoji: string }[] = [
  { value: 'exercise', label: 'Exercise', emoji: '🏃' },
  { value: 'meditation', label: 'Meditation', emoji: '🧘' },
  { value: 'social', label: 'Social Time', emoji: '👥' },
  { value: 'rest', label: 'Rest', emoji: '😴' },
  { value: 'hobby', label: 'Hobby', emoji: '🎨' },
  { value: 'therapy', label: 'Therapy', emoji: '💬' },
  { value: 'nature', label: 'Nature', emoji: '🌿' },
  { value: 'reading', label: 'Reading', emoji: '📚' },
  { value: 'music', label: 'Music', emoji: '🎵' },
  { value: 'other', label: 'Other', emoji: '✨' },
]

export const JOURNAL_PROMPTS = [
  'What drained you today?',
  'What gave you joy?',
  'What do you need right now?',
  'What are you grateful for today?',
  'How did you show up for yourself?',
  'What would make tomorrow better?',
  'What boundary do you need to set?',
  'What small win happened today?',
]

export interface JournalEntry {
  id: string
  // Check-in data
  mood: number
  stress: number
  energy: number
  sleepQuality: number
  selfCare: {
    did: boolean
    activities: SelfCareActivity[]
  }
  // Journal text
  journalText?: string
  prompt?: string
  tags?: string[]
  // Metadata
  createdAt: string // ISO
  updatedAt?: string
}

export interface JournalStats {
  totalEntries: number
  currentStreak: number // consecutive days
  averageMood: number
  averageStress: number
  averageEnergy: number
  averageSleep: number
  selfCareRate: number // % of entries with self-care
  burnoutRisk: 'low' | 'moderate' | 'high' // based on stress vs energy
  dailyData: DailyJournalData[]
}

export interface DailyJournalData {
  date: string // YYYY-MM-DD
  mood: number
  stress: number
  energy: number
  sleepQuality: number
  didSelfCare: boolean
}
