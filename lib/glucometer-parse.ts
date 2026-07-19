/**
 * Pure parsing/normalization for glucometer-OCR readings.
 *
 * Turns the free-text date/time a meter prints into an ISO timestamp and
 * plausibility-checks the glucose value, producing review-ready drafts. Kept
 * pure (no Firebase, no React) so it's unit-tested in isolation — the OCR
 * layer only extracts strings; correctness of the timestamp lives here.
 */

import type { GlucometerReading, GlucometerOCRResponse } from '@/lib/validations/glucometer-ocr'

/** Plausible human glucose ranges — catches OCR garbage (e.g. "3330"). */
const MGDL_MIN = 20
const MGDL_MAX = 600
const MMOL_MIN = 1
const MMOL_MAX = 34

export interface VitalDraft {
  /** ISO 8601 local-time timestamp, or null if the date/time couldn't be parsed. */
  recordedAt: string | null
  /** Glucose value as read. */
  value: number
  /** 'mg/dL' | 'mmol/L' (the two units the vitals route accepts for blood_sugar). */
  unit: 'mg/dL' | 'mmol/L'
  /** Whether this row is selected for import (defaults false when it has an issue). */
  include: boolean
  /** What the meter printed, for display/edit. */
  rawDate: string
  rawTime: string
  /** Non-null when the row needs attention (unparseable time, implausible value). */
  issue?: string
}

/** Normalize a unit string to the two the vitals API accepts; defaults mg/dL. */
export function normalizeUnit(unit?: string): 'mg/dL' | 'mmol/L' {
  if (unit && /mmol/i.test(unit)) return 'mmol/L'
  return 'mg/dL'
}

/** True when a glucose value is within the plausible human range for its unit. */
export function isPlausibleGlucose(value: number, unit: 'mg/dL' | 'mmol/L'): boolean {
  if (!Number.isFinite(value)) return false
  return unit === 'mmol/L'
    ? value >= MMOL_MIN && value <= MMOL_MAX
    : value >= MGDL_MIN && value <= MGDL_MAX
}

/** Parse a printed time ("7:22 AM", "11:31 PM", "19:05") into {hours, minutes} or null. */
function parseTime(time: string): { hours: number; minutes: number } | null {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!m) return null
  let hours = Number(m[1])
  const minutes = Number(m[2])
  const meridiem = m[3]?.toUpperCase()
  if (minutes > 59) return null
  if (meridiem) {
    if (hours < 1 || hours > 12) return null
    if (meridiem === 'PM' && hours !== 12) hours += 12
    if (meridiem === 'AM' && hours === 12) hours = 0
  } else if (hours > 23) {
    return null
  }
  return { hours, minutes }
}

/** Parse a printed date into {year?, month, day} (1-based month) or null. Year optional. */
function parseDateParts(date: string): { year?: number; month: number; day: number } | null {
  const s = date.trim()
  // YYYY-MM-DD or YYYY/MM/DD
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (m) return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
  // MM-DD-YYYY or MM/DD/YYYY
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (m) return { year: Number(m[3]), month: Number(m[1]), day: Number(m[2]) }
  // MM-DD-YY or MM/DD/YY (2-digit year → 2000s)
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/)
  if (m) return { year: 2000 + Number(m[3]), month: Number(m[1]), day: Number(m[2]) }
  // MM-DD or MM/DD (no year — inferred later)
  m = s.match(/^(\d{1,2})[-/](\d{1,2})$/)
  if (m) return { month: Number(m[1]), day: Number(m[2]) }
  return null
}

function validMonthDay(month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= 31
}

/**
 * Combine a printed date + time into an ISO 8601 string in local time.
 * When the year is omitted (common on meters), infer the most recent year
 * that doesn't put the reading in the future — so a "12-11" scanned in July
 * resolves to LAST December, not this coming one. Returns null if unparseable
 * or if the result would be in the future.
 */
export function parseReadingTimestamp(date: string, time: string, now: Date = new Date()): string | null {
  const dp = parseDateParts(date)
  const tp = parseTime(time)
  if (!dp || !tp || !validMonthDay(dp.month, dp.day)) return null

  const build = (year: number): Date => new Date(year, dp.month - 1, dp.day, tp.hours, tp.minutes, 0, 0)

  let d: Date
  if (dp.year != null) {
    d = build(dp.year)
  } else {
    d = build(now.getFullYear())
    // Future (meter can't record ahead) → it must be last year's date.
    if (d.getTime() > now.getTime()) d = build(now.getFullYear() - 1)
  }

  if (isNaN(d.getTime())) return null
  // Guard against a rolled-over day (e.g. month/day 02-30 → Mar 2) and future dates.
  if (d.getMonth() !== dp.month - 1 || d.getDate() !== dp.day) return null
  if (d.getTime() > now.getTime()) return null
  return d.toISOString()
}

/**
 * Turn an OCR response into review-ready drafts. Rows are sorted newest-first
 * (matching how meters display). A row is pre-selected (`include: true`) only
 * when both its timestamp parsed and its value is plausible; otherwise it's
 * surfaced with an `issue` for the user to fix or skip.
 */
export function toVitalDrafts(response: GlucometerOCRResponse, now: Date = new Date()): VitalDraft[] {
  const deviceUnit = normalizeUnit(response.unit)
  const drafts = response.readings.map((r: GlucometerReading): VitalDraft => {
    const unit = normalizeUnit(r.unit) === 'mmol/L' || deviceUnit === 'mmol/L' ? 'mmol/L' : 'mg/dL'
    const recordedAt = parseReadingTimestamp(r.date, r.time, now)
    const plausible = isPlausibleGlucose(r.value, unit)
    let issue: string | undefined
    if (!recordedAt) issue = `Couldn't read the date/time ("${r.date} ${r.time}") — set it manually`
    else if (!plausible) issue = `${r.value} ${unit} looks out of range — check the value`
    return {
      recordedAt,
      value: r.value,
      unit,
      include: !issue,
      rawDate: r.date,
      rawTime: r.time,
      issue,
    }
  })
  // Newest first (drafts with an unparseable time sort last).
  return drafts.sort((a, b) => {
    if (!a.recordedAt) return 1
    if (!b.recordedAt) return -1
    return b.recordedAt.localeCompare(a.recordedAt)
  })
}
