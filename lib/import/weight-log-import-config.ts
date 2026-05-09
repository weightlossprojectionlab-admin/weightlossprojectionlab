/**
 * Weight-log spreadsheet-import config — Phase 2 of the import
 * wizard. Mirrors the shape of patient-import-config.ts so the
 * wizard UI can be cloned with config swap. Resist extracting a
 * generic base type until we have a third concrete config to
 * generalize against (vitals, Phase 3) — generalizing on two
 * examples produces worse abstractions than three.
 *
 * Key difference from Phase 1: weight logs are PER-PATIENT, so
 * the importable schema includes a patientName field that the
 * commit endpoint resolves to a patientId by matching against
 * the household's existing patients (lib/import/match-patient.ts).
 * Rows whose patientName doesn't match an existing patient land
 * in the errors bucket — by design. Onboarding flow: import
 * family members first (Phase 1), then their weight history.
 */

import { z } from 'zod'

export type ImportableField =
  | 'patientName'
  | 'weight'
  | 'unit'
  | 'loggedAt'
  | 'notes'
  | 'bodyFat'
  | 'tags'

export type ColumnMapping = ImportableField | 'skip'

const FIELD_ALIASES: Record<ImportableField, string[]> = {
  patientName: ['Patient', 'Patient Name', 'Family Member', 'Name', 'Person', 'For'],
  weight: ['Weight', 'Body Weight', 'Mass'],
  unit: ['Unit', 'Units', 'Weight Unit'],
  loggedAt: ['Date', 'Logged At', 'Recorded At', 'Date/Time', 'Datetime', 'When', 'Measured At'],
  notes: ['Notes', 'Comment', 'Comments', 'Memo'],
  bodyFat: ['Body Fat', 'Body Fat %', 'BF', 'BFP', 'Body Fat Percent'],
  tags: ['Tags', 'Labels', 'Time of Day', 'Context'],
}

const normalize = (s: string): string => s.toLowerCase().replace(/[\s_\-./]+/g, '')

const ALIAS_LOOKUP: Map<string, ImportableField> = (() => {
  const m = new Map<string, ImportableField>()
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<[ImportableField, string[]]>) {
    for (const alias of aliases) m.set(normalize(alias), field)
    m.set(normalize(field), field)
  }
  return m
})()

export function suggestMapping(headers: string[]): Record<string, ColumnMapping> {
  const result: Record<string, ColumnMapping> = {}
  for (const header of headers) {
    const match = ALIAS_LOOKUP.get(normalize(header))
    result[header] = match ?? 'skip'
  }
  return result
}

export function fieldLabel(field: ImportableField): string {
  return FIELD_ALIASES[field][0]
}

export const IMPORTABLE_FIELDS: ImportableField[] = Object.keys(FIELD_ALIASES) as ImportableField[]

// ============================================================================
// Per-cell transforms — raw CSV string → expected type
// ============================================================================

function splitList(raw: string): string[] {
  return raw.split(/[,;]/).map((s) => s.trim()).filter((s) => s.length > 0)
}

/**
 * Parse a date or date-time. Accepts ISO, US (M/D/YYYY), EU
 * (D/M/YYYY assumed when first part > 12), and Date.parse for
 * written forms. Time component is preserved when present;
 * date-only inputs default to local noon to dodge timezone-edge
 * quirks. Returns ISO 8601 string or null if unparseable.
 */
function parseDateTime(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // ISO with optional time
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parsed = Date.parse(trimmed)
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
  }

  // Slash- or dash-separated date, optional space + time
  const dateTimeMatch = trimmed.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m?)?)?$/i,
  )
  if (dateTimeMatch) {
    const [, a, b, c, hStr, mStr, sStr, ampm] = dateTimeMatch
    let month = parseInt(a, 10)
    let day = parseInt(b, 10)
    // Heuristic: if first part > 12, assume D/M (EU). Otherwise M/D (US).
    if (month > 12 && day <= 12) {
      ;[month, day] = [day, month]
    }
    let year = parseInt(c, 10)
    if (year < 100) year = year < 30 ? 2000 + year : 1900 + year
    if (month < 1 || month > 12 || day < 1 || day > 31) return null

    let hours = hStr ? parseInt(hStr, 10) : 12
    const mins = mStr ? parseInt(mStr, 10) : 0
    const secs = sStr ? parseInt(sStr, 10) : 0
    if (ampm) {
      const lower = ampm.toLowerCase()
      if (lower.startsWith('p') && hours < 12) hours += 12
      if (lower.startsWith('a') && hours === 12) hours = 0
    }

    const d = new Date(year, month - 1, day, hours, mins, secs)
    return d.toISOString()
  }

  const parsed = Date.parse(trimmed)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString()
}

const FIELD_TRANSFORMS: Record<ImportableField, (raw: string) => unknown> = {
  patientName: (raw) => raw.trim() || undefined,
  weight: (raw) => {
    const n = parseFloat(raw.trim())
    return Number.isFinite(n) && n > 0 ? n : undefined
  },
  unit: (raw) => {
    const v = raw.trim().toLowerCase()
    if (['lb', 'lbs', 'pound', 'pounds'].includes(v)) return 'lbs'
    if (['kg', 'kilo', 'kilos', 'kilogram', 'kilograms'].includes(v)) return 'kg'
    return v || undefined
  },
  loggedAt: (raw) => parseDateTime(raw) ?? undefined,
  notes: (raw) => raw.trim() || undefined,
  bodyFat: (raw) => {
    const n = parseFloat(raw.trim().replace('%', ''))
    return Number.isFinite(n) ? n : undefined
  },
  tags: (raw) => {
    const list = splitList(raw)
    return list.length ? list : undefined
  },
}

export function transformRow(
  row: Record<string, string>,
  mapping: Record<string, ColumnMapping>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [header, field] of Object.entries(mapping)) {
    if (field === 'skip') continue
    const raw = row[header] ?? ''
    const value = FIELD_TRANSFORMS[field](raw)
    if (value !== undefined) out[field] = value
  }
  return out
}

// ============================================================================
// Per-row Zod validator
// ============================================================================

/**
 * Required: patientName, weight, unit, loggedAt. Body fat,
 * notes, tags are optional. Plausibility bounds catch OCR / typo
 * garbage: weight in (1, 1500), bodyFat in [0, 100].
 */
export const ImportWeightLogRowSchema = z.object({
  patientName: z.string().min(1, 'Patient name is required'),
  weight: z.number().positive('Weight must be a positive number').max(1500, 'Weight is implausibly high'),
  unit: z.enum(['lbs', 'kg']),
  loggedAt: z.string().refine(
    (s) => !Number.isNaN(Date.parse(s)),
    'Date is required and must be a valid date',
  ),
  notes: z.string().max(2000).optional(),
  bodyFat: z.number().min(0).max(100, 'Body fat % must be between 0 and 100').optional(),
  tags: z.array(z.string()).optional(),
})

export type ImportWeightLogRow = z.infer<typeof ImportWeightLogRowSchema>

export function validateRow(
  row: Record<string, unknown>,
):
  | { ok: true; data: ImportWeightLogRow }
  | { ok: false; errors: Array<{ field: string; message: string }> } {
  const result = ImportWeightLogRowSchema.safeParse(row)
  if (result.success) return { ok: true, data: result.data }
  const errors = result.error.issues.map((i) => ({
    field: i.path.join('.') || '_row',
    message: i.message,
  }))
  return { ok: false, errors }
}
