/**
 * Infant feeding log types
 * Used for tracking breastfeeding and formula feeds for newborns and infants (0–12 months)
 */

export type FeedType = 'breast_left' | 'breast_right' | 'breast_both' | 'formula' | 'pumped'

export const FEED_TYPE_LABELS: Record<FeedType, string> = {
  breast_left: 'Breast (Left)',
  breast_right: 'Breast (Right)',
  breast_both: 'Breast (Both)',
  formula: 'Formula',
  pumped: 'Pumped Milk',
}

export const FEED_TYPE_ICONS: Record<FeedType, string> = {
  breast_left: '🤱',
  breast_right: '🤱',
  breast_both: '🤱',
  formula: '🍼',
  pumped: '🍼',
}

export interface FeedingEntry {
  id: string
  patientId: string
  feedType: FeedType
  startedAt: string        // ISO timestamp
  durationMinutes?: number // for breastfeeding (duration of session)
  amountOz?: number        // for formula / pumped milk
  notes?: string
  loggedBy: string         // userId of the person who logged the entry
  createdAt: string
}

export interface NewFeedingEntry {
  feedType: FeedType
  startedAt: string
  durationMinutes?: number
  amountOz?: number
  notes?: string
}
