/**
 * Medication dosage — the single source of truth for "how many doses per day?".
 *
 * Background: PatientMedication.frequency is NAMED "frequency" but contractually
 * holds the COMPLETE sig ("Take 1 tablet by mouth twice daily"). One field is
 * asked to answer four orthogonal questions — how much / how often / what route /
 * under what conditions — so it is a reliable answer to none of them. Adherence
 * math nevertheless needs a doses-per-day denominator, so it used to regex the
 * prose back apart and **silently default to 1 when it couldn't parse**. That
 * turned "2" into 1 dose/day and reported someone taking half their doses as
 * 100% adherent.
 *
 * This module replaces that with an honest contract:
 *   - a confident parse returns a number
 *   - an UNCERTAIN parse returns null and says why
 *   - nothing is ever fabricated
 *
 * In clinical software an absent metric beats a confident wrong one. Callers must
 * render "not enough info" rather than invent a denominator.
 *
 * Pure (no Firebase, no React) so it is unit-tested in isolation — same pattern as
 * lib/time-of-day.ts and lib/vital-thresholds.ts.
 */

import type { ScheduleFrequency } from '@/types/vital-schedules'
import type { MedicationRoute } from '@/types/medical'

export type DoseConfidence =
  /** Explicit, unambiguous schedule ("twice daily", "BID", "every 8 hours"). */
  | 'high'
  /** Parsed, but from a looser phrasing — usable, worth confirming. */
  | 'low'
  /** A value that could belong to more than one dimension (a bare "2"). NOT usable. */
  | 'ambiguous'
  /** Nothing schedulable found (empty, PRN/as-needed, or unrecognized). NOT usable. */
  | 'none'

export interface DoseFrequencyParse {
  /** Doses per day. Fractional for sub-daily schedules (weekly = 1/7). Null when not trustworthy. */
  dosesPerDay: number | null
  confidence: DoseConfidence
  /** For 'ambiguous': which dimensions the value could be. Lets the UI ask an explicit either/or. */
  ambiguousBetween?: Array<'dose' | 'frequency'>
  /** For 'ambiguous': the bare number found, so the UI can offer it as either choice. */
  rawValue?: number
  /** Short human explanation for UI/debugging. */
  reason?: string
}

/** Only these confidences may drive a clinical denominator. */
export function isUsableForAdherence(c: DoseConfidence): boolean {
  return c === 'high' || c === 'low'
}

const WORD_COUNTS: Record<string, number> = {
  once: 1, one: 1,
  twice: 2, two: 2,
  thrice: 3, three: 3,
  four: 4, five: 5, six: 6,
}

/** Latin sig abbreviations pharmacies actually print. */
const ABBREVIATIONS: Array<{ re: RegExp; perDay: number }> = [
  { re: /\bq\.?\s?i\.?d\b/i, perDay: 4 }, // QID — four times a day
  { re: /\bt\.?\s?i\.?d\b/i, perDay: 3 }, // TID — three times a day
  { re: /\bb\.?\s?i\.?d\b/i, perDay: 2 }, // BID — twice a day
  { re: /\bq\.?\s?d\b|\bq\.?\s?daily\b|\bo\.?\s?d\b/i, perDay: 1 }, // QD — once a day
  { re: /\bq\.?\s?h\.?s\b|\bat bedtime\b|\bnightly\b/i, perDay: 1 }, // QHS — at bedtime
  { re: /\bq\.?\s?a\.?m\b|\bevery morning\b/i, perDay: 1 },
]

/** "as needed" has no fixed schedule — adherence is meaningless, not merely unknown. */
const PRN = /\bp\.?\s?r\.?n\b|\bas needed\b|\bwhen (?:required|necessary)\b/i

/**
 * Derive doses per day from a free-text sig.
 *
 * Never returns 1 as a fallback — that was the original bug. Unrecognized input
 * yields null with a confidence explaining why.
 */
export function parseDoseFrequency(sig?: string | null): DoseFrequencyParse {
  const raw = (sig ?? '').trim()
  if (!raw) return { dosesPerDay: null, confidence: 'none', reason: 'No dosage instructions recorded' }

  const s = raw.toLowerCase()

  // PRN first: "take 1 tablet as needed" has no schedule to measure against.
  if (PRN.test(s)) {
    return { dosesPerDay: null, confidence: 'none', reason: 'Taken as needed — no fixed schedule to measure' }
  }

  // A bare number is AMBIGUOUS ACROSS DIMENSIONS: "2" may be 2 tablets per dose
  // or 2 times per day. Guessing either way silently converts a dose size into a
  // frequency (or vice versa), so refuse and let the caller disambiguate.
  const bare = raw.match(/^(\d+(?:\.\d+)?)$/)
  if (bare) {
    return {
      dosesPerDay: null,
      confidence: 'ambiguous',
      ambiguousBetween: ['dose', 'frequency'],
      rawValue: Number(bare[1]),
      reason: `"${raw}" could mean ${bare[1]} per dose or ${bare[1]} times per day`,
    }
  }

  // Latin abbreviations — explicit and unambiguous.
  for (const { re, perDay } of ABBREVIATIONS) {
    if (re.test(s)) return { dosesPerDay: perDay, confidence: 'high' }
  }

  // "every N hours"
  const hours = s.match(/every\s+(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/)
  if (hours) {
    const h = Number(hours[1])
    if (h > 0 && h <= 24) return { dosesPerDay: 24 / h, confidence: 'high' }
  }

  // "every N days"
  const days = s.match(/every\s+(\d+)\s*days?\b/)
  if (days) {
    const dnum = Number(days[1])
    if (dnum > 0) return { dosesPerDay: 1 / dnum, confidence: 'high' }
  }

  // "N times per day" / "N times a day" / "N times daily"
  const timesNum = s.match(/(\d+)\s*(?:x|times?)\s*(?:per\s+|a\s+|each\s+)?(?:day|daily)\b/)
  if (timesNum) {
    const n = Number(timesNum[1])
    if (n > 0) return { dosesPerDay: n, confidence: 'high' }
  }

  // "twice daily" / "three times a day" / "once per day"
  const word = s.match(/\b(once|twice|thrice|one|two|three|four|five|six)\b\s*(?:times?\s*)?(?:per\s+|a\s+|each\s+)?(?:day|daily)\b/)
  if (word) {
    const n = WORD_COUNTS[word[1]]
    if (n) return { dosesPerDay: n, confidence: 'high' }
  }

  // Sub-daily cadences.
  if (/\bevery other day\b/.test(s)) return { dosesPerDay: 0.5, confidence: 'high' }
  if (/\b(?:once\s+)?(?:a|per|each)\s+week\b|\bweekly\b/.test(s)) return { dosesPerDay: 1 / 7, confidence: 'high' }
  if (/\bevery two weeks\b|\bbiweekly\b|\bevery other week\b/.test(s)) return { dosesPerDay: 1 / 14, confidence: 'high' }
  if (/\b(?:once\s+)?(?:a|per|each)\s+month\b|\bmonthly\b/.test(s)) return { dosesPerDay: 1 / 30, confidence: 'high' }

  // Bare "daily"/"every day" with no count — one a day is the conventional reading,
  // but it's a looser inference than an explicit count, so flag it 'low'.
  if (/\bdaily\b|\bevery day\b|\beach day\b/.test(s)) {
    return { dosesPerDay: 1, confidence: 'low', reason: 'Read "daily" as once per day — confirm if it should be more' }
  }

  return { dosesPerDay: null, confidence: 'none', reason: 'Could not read a schedule from these instructions' }
}

/** Doses per day implied by a structured ScheduleFrequency code (Phase 2 field). */
export function dosesPerDayForCode(code?: ScheduleFrequency | null): number | null {
  switch (code) {
    case '1x':
    case 'daily':
      return 1
    case '2x':
      return 2
    case '3x':
      return 3
    case '4x':
      return 4
    case '6x':
      return 6
    case 'weekly':
      return 1 / 7
    case 'biweekly':
      return 1 / 14
    case 'monthly':
      return 1 / 30
    default:
      return null
  }
}

/** The subset of a medication this module needs — keeps it decoupled from the full type. */
export interface DosageSource {
  /** Phase 2 structured code — authoritative when present. */
  frequencyCode?: ScheduleFrequency | null
  /** Phase 2 verbatim sig. */
  sig?: string | null
  /** Legacy prose field (named "frequency", actually the whole sig). */
  frequency?: string | null
  /** How much per administration. */
  dose?: { amount: number; unit: string } | null
  /** How it's taken. */
  route?: MedicationRoute | null
  /** Conditions, e.g. ['with meals']. */
  timing?: string[] | null
}

// ---- Shared display vocabulary ------------------------------------------
// Single source for BOTH the editor (components/medications/DosageFields.tsx) and
// the read-only surfaces. Keeping two copies is how "Frequency" vs "Dosage
// Instructions" drifted apart in the first place.

export const FREQUENCY_LABELS: Record<string, string> = {
  '1x': 'once a day',
  '2x': 'twice a day',
  '3x': '3 times a day',
  '4x': '4 times a day',
  '6x': '6 times a day',
  daily: 'once a day',
  weekly: 'once a week',
  biweekly: 'every 2 weeks',
  monthly: 'once a month',
}

export const ROUTE_LABELS: Record<MedicationRoute, string> = {
  oral: 'by mouth',
  topical: 'on the skin',
  injection: 'by injection',
  other: '',
}

/** Ordered options for the editor's selects. */
export const FREQUENCY_OPTIONS: Array<{ code: ScheduleFrequency; label: string }> = [
  '1x', '2x', '3x', '4x', '6x', 'weekly', 'biweekly', 'monthly',
].map(c => ({ code: c as ScheduleFrequency, label: FREQUENCY_LABELS[c] }))

export const ROUTE_OPTIONS: Array<{ code: MedicationRoute; label: string }> = [
  { code: 'oral', label: 'By mouth' },
  { code: 'topical', label: 'On the skin' },
  { code: 'injection', label: 'Injection' },
  { code: 'other', label: 'Other' },
]

export const DOSE_UNITS = ['tablet', 'capsule', 'mg', 'mL', 'drop', 'puff', 'patch', 'unit']

export const TIMING_OPTIONS = [
  'with meals', 'before meals', 'on an empty stomach', 'in the morning', 'at bedtime',
]

/** Units that take an 's' when plural (mg/mL never do). */
const COUNTABLE_UNITS = new Set(['tablet', 'capsule', 'drop', 'puff', 'patch', 'unit'])

function formatDose(dose: { amount: number; unit: string }): string {
  const plural = dose.amount !== 1 && COUNTABLE_UNITS.has(dose.unit)
  return `${dose.amount} ${dose.unit}${plural ? 's' : ''}`
}

/**
 * Human-readable dosage for DISPLAY surfaces.
 *
 * Composes the structured fields into a sentence ("1 tablet by mouth, twice a day,
 * with meals"). Falls back to the verbatim sig when nothing is structured yet, so
 * un-migrated rows still render exactly what the label said.
 *
 * Every read-only surface should use this rather than printing `frequency` raw —
 * that's why a medication whose schedule was correctly recorded as 2x/day still
 * displayed the meaningless string "2".
 */
export function formatDosage(med: DosageSource): string {
  const parts: string[] = []

  if (med.dose && Number.isFinite(med.dose.amount)) parts.push(formatDose(med.dose))

  const route = med.route ? ROUTE_LABELS[med.route] : ''
  if (route) parts.push(route)

  const freq = med.frequencyCode ? FREQUENCY_LABELS[med.frequencyCode] : ''
  if (freq) parts.push(freq)

  if (med.timing && med.timing.length > 0) parts.push(med.timing.join(', '))

  if (parts.length === 0) {
    // Nothing structured — show the verbatim instructions.
    return (med.sig ?? med.frequency ?? '').trim()
  }

  const sentence = parts.join(', ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

/**
 * THE authoritative doses-per-day for a medication.
 *
 * Prefers the structured code; falls back to parsing the prose. Returns null when
 * the answer isn't trustworthy — callers must then omit adherence rather than
 * substitute a guess.
 */
export function dosesPerDayFor(med: DosageSource): number | null {
  const fromCode = dosesPerDayForCode(med.frequencyCode)
  if (fromCode !== null) return fromCode

  const parsed = parseDoseFrequency(med.sig ?? med.frequency)
  return isUsableForAdherence(parsed.confidence) ? parsed.dosesPerDay : null
}

/** Full parse detail for UI (which needs the confidence/reason, not just the number). */
export function describeDosage(med: DosageSource): DoseFrequencyParse {
  const fromCode = dosesPerDayForCode(med.frequencyCode)
  if (fromCode !== null) return { dosesPerDay: fromCode, confidence: 'high' }
  return parseDoseFrequency(med.sig ?? med.frequency)
}
