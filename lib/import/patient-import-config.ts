/**
 * Patient spreadsheet-import config — Phase 1 of the import wizard.
 *
 * Three responsibilities live here:
 *   1. Field aliases — every PatientProfile field that's importable
 *      lists the human-friendly column headers it answers to. The
 *      preview endpoint fuzzy-matches uploaded CSV headers against
 *      these to suggest a mapping.
 *   2. Per-cell transforms — coerce a raw CSV string into the
 *      shape `createPatient()` expects: ISO dates, lowercased enums,
 *      arrays from comma-separated text, etc.
 *   3. Per-row Zod validator — the same rules that protect the
 *      live form, applied to imported rows so we never write a
 *      shape `medicalOperations.patients.createPatient()` couldn't
 *      take.
 *
 * Phase 2 (weight logs / vitals) will copy this file's shape under
 * a new name. The wizard UI is generic; only the config differs
 * per entity type. Resist the urge to extract a base type until
 * Phase 3 — premature generalization on two examples is a worse
 * outcome than a third concrete config.
 */

import { z } from 'zod'

/** Schema fields the wizard knows how to import. Subset of
 *  PatientProfile — only the fields a human realistically maintains
 *  in a spreadsheet. Computed fields (age, lifeStage), runtime
 *  fields (id, userId, createdAt), and complex nested objects
 *  (caregiverStatus, preparationNeeds) are deliberately out of
 *  scope for v1. */
export type ImportableField =
  | 'name'
  | 'type'
  | 'dateOfBirth'
  | 'relationship'
  | 'gender'
  | 'species'
  | 'breed'
  | 'nickname'
  | 'healthConditions'
  | 'foodAllergies'
  | 'currentWeight'
  | 'weightUnit'
  | 'targetWeight'
  | 'height'
  | 'heightUnit'
  | 'weightCheckInFrequency'

/** A column from the user's spreadsheet either maps to an
 *  ImportableField or is intentionally skipped. */
export type ColumnMapping = ImportableField | 'skip'

/** Header aliases the auto-detector recognizes (case- and
 *  whitespace-insensitive comparison). The first entry of each
 *  list is the canonical label shown in the mapping UI when the
 *  field is selected manually. */
const FIELD_ALIASES: Record<ImportableField, string[]> = {
  name: ['Name', 'Full Name', 'Patient Name', 'Family Member', 'First Name'],
  type: ['Type', 'Human or Pet', 'Person or Pet'],
  dateOfBirth: ['Date of Birth', 'DOB', 'Birth Date', 'Birthday', 'Born', 'Birthdate'],
  relationship: ['Relationship', 'Relation', 'Role'],
  gender: ['Gender', 'Sex'],
  species: ['Species', 'Animal Type', 'Pet Type'],
  breed: ['Breed'],
  nickname: ['Nickname', 'Preferred Name', 'Goes By', 'Called'],
  healthConditions: [
    'Health Conditions',
    'Conditions',
    'Diagnoses',
    'Medical Conditions',
    'Health Issues',
  ],
  foodAllergies: [
    'Food Allergies',
    'Allergies',
    'Allergens',
    'Allergic To',
  ],
  currentWeight: ['Current Weight', 'Weight', 'Latest Weight'],
  weightUnit: ['Weight Unit', 'Weight Units'],
  targetWeight: ['Target Weight', 'Goal Weight'],
  height: ['Height'],
  heightUnit: ['Height Unit', 'Height Units'],
  weightCheckInFrequency: [
    'Weight Check-In Frequency',
    'Weigh-In Frequency',
    'Check-In Frequency',
    'Weighing Schedule',
  ],
}

const normalize = (s: string): string =>
  s.toLowerCase().replace(/[\s_\-./]+/g, '')

/** Build a flat lookup from normalized alias → ImportableField at
 *  module load time so suggestMapping is O(headers × 1). */
const ALIAS_LOOKUP: Map<string, ImportableField> = (() => {
  const m = new Map<string, ImportableField>()
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<[ImportableField, string[]]>) {
    for (const alias of aliases) {
      m.set(normalize(alias), field)
    }
    // Self-name: 'name' header maps to name field even without alias entry
    m.set(normalize(field), field)
  }
  return m
})()

/**
 * Fuzzy-match each CSV header to an ImportableField. Returns
 * 'skip' for headers we can't recognize — the UI will let the user
 * map them manually or leave them out.
 */
export function suggestMapping(headers: string[]): Record<string, ColumnMapping> {
  const result: Record<string, ColumnMapping> = {}
  for (const header of headers) {
    const match = ALIAS_LOOKUP.get(normalize(header))
    result[header] = match ?? 'skip'
  }
  return result
}

/** Canonical label shown in the mapping dropdown. */
export function fieldLabel(field: ImportableField): string {
  return FIELD_ALIASES[field][0]
}

/** All importable fields, in display order, for the manual mapping
 *  dropdown. */
export const IMPORTABLE_FIELDS: ImportableField[] = Object.keys(
  FIELD_ALIASES,
) as ImportableField[]

// ============================================================================
// Per-cell transforms — raw CSV string → the shape createPatient wants
// ============================================================================

/** Split comma- or semicolon-separated cell into a clean array. */
function splitList(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** Best-effort date normalization. Accepts ISO, US (M/D/YYYY), EU
 *  (D/M/YYYY), and a few common written forms. Returns ISO 8601
 *  date-only string or null if unparseable.
 *
 *  Ambiguous M/D vs D/M dates default to M/D (US locale). Future
 *  enhancement: detect locale from the spread of values. */
function parseDate(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // ISO date already?
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)

  // Slash- or dash-separated, US default
  const m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (m) {
    const [, a, b, c] = m
    const month = parseInt(a, 10)
    const day = parseInt(b, 10)
    let year = parseInt(c, 10)
    if (year < 100) year = year < 30 ? 2000 + year : 1900 + year
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  }

  // Fall back to Date.parse for "March 5, 2020" etc.
  const parsed = Date.parse(trimmed)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString().slice(0, 10)
}

/** Per-field transform from raw CSV string to the right type.
 *  Returns undefined for empty cells (so optional fields stay
 *  undefined rather than empty strings). */
const FIELD_TRANSFORMS: Record<
  ImportableField,
  (raw: string) => unknown
> = {
  name: (raw) => raw.trim() || undefined,
  nickname: (raw) => raw.trim() || undefined,
  type: (raw) => {
    const v = raw.trim().toLowerCase()
    if (!v) return undefined
    if (['human', 'person', 'people'].includes(v)) return 'human'
    if (['pet', 'animal'].includes(v)) return 'pet'
    return v // let validator reject
  },
  dateOfBirth: (raw) => parseDate(raw) ?? undefined,
  relationship: (raw) => raw.trim().toLowerCase() || undefined,
  gender: (raw) => {
    const v = raw.trim().toLowerCase()
    if (!v) return undefined
    if (v.startsWith('m')) return 'male'
    if (v.startsWith('f')) return 'female'
    return v
  },
  species: (raw) => raw.trim().toLowerCase() || undefined,
  breed: (raw) => raw.trim() || undefined,
  healthConditions: (raw) => {
    const list = splitList(raw)
    return list.length ? list : undefined
  },
  foodAllergies: (raw) => {
    const list = splitList(raw)
    return list.length ? list : undefined
  },
  currentWeight: (raw) => {
    const n = parseFloat(raw.trim())
    return Number.isFinite(n) ? n : undefined
  },
  weightUnit: (raw) => {
    const v = raw.trim().toLowerCase()
    if (['lb', 'lbs', 'pound', 'pounds'].includes(v)) return 'lbs'
    if (['kg', 'kilo', 'kilos', 'kilogram', 'kilograms'].includes(v)) return 'kg'
    if (v === 'oz') return 'oz'
    if (v === 'g') return 'g'
    return v || undefined
  },
  targetWeight: (raw) => {
    const n = parseFloat(raw.trim())
    return Number.isFinite(n) ? n : undefined
  },
  height: (raw) => {
    const n = parseFloat(raw.trim())
    return Number.isFinite(n) ? n : undefined
  },
  heightUnit: (raw) => {
    const v = raw.trim().toLowerCase()
    if (['imperial', 'in', 'inches', 'ft', 'feet'].includes(v)) return 'imperial'
    if (['metric', 'cm', 'centimeter', 'centimeters', 'm', 'meter', 'meters'].includes(v)) return 'metric'
    return v || undefined
  },
  weightCheckInFrequency: (raw) => {
    const v = raw.trim().toLowerCase()
    if (['daily', 'every day', 'every-day'].includes(v)) return 'daily'
    if (['weekly', 'every week', 'once a week'].includes(v)) return 'weekly'
    if (['biweekly', 'bi-weekly', 'every two weeks', 'every other week'].includes(v)) return 'biweekly'
    if (['monthly', 'every month', 'once a month'].includes(v)) return 'monthly'
    return v || undefined
  },
}

/**
 * Apply a column mapping to one raw row from the CSV. Each
 * mapped column's value is run through its field transform; the
 * resulting object is what the row-level Zod validator sees.
 */
export function transformRow(
  row: Record<string, string>,
  mapping: Record<string, ColumnMapping>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [header, field] of Object.entries(mapping)) {
    if (field === 'skip') continue
    const raw = row[header] ?? ''
    const transform = FIELD_TRANSFORMS[field]
    const value = transform(raw)
    if (value !== undefined) out[field] = value
  }
  return out
}

// ============================================================================
// Per-row Zod validator
// ============================================================================

/**
 * Row-level schema. Mirrors the live patient form's required
 * fields. Optional fields are accepted when present and
 * transform-coerced upstream — Zod only re-asserts shape here.
 *
 * Required: name, type, dateOfBirth, relationship.
 * Pet rows additionally require species (human-only fields like
 * gender stay optional).
 */
export const ImportPatientRowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: z.enum(['human', 'pet']),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be a valid date'),
  relationship: z.enum(['self', 'spouse', 'parent', 'child', 'sibling', 'grandparent', 'pet']),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional(),
  species: z.string().optional(),
  breed: z.string().optional(),
  nickname: z.string().max(100).optional(),
  healthConditions: z.array(z.string()).optional(),
  foodAllergies: z.array(z.string()).optional(),
  currentWeight: z.number().positive().optional(),
  weightUnit: z.enum(['lbs', 'kg', 'oz', 'g']).optional(),
  targetWeight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  heightUnit: z.enum(['imperial', 'metric']).optional(),
  weightCheckInFrequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
}).superRefine((data, ctx) => {
  // Pet rows must have species — without it the recipe / nutrition
  // engine can't reason about the patient.
  if (data.type === 'pet' && !data.species) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['species'],
      message: 'Species is required for pets',
    })
  }
  // type=pet should have relationship=pet for the live UI to
  // route the patient to the pet-specific surfaces.
  if (data.type === 'pet' && data.relationship !== 'pet') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['relationship'],
      message: "Pets should have relationship 'pet'",
    })
  }
})

export type ImportPatientRow = z.infer<typeof ImportPatientRowSchema>

/**
 * Validate a transformed row. Returns either a typed row ready
 * for `createPatient()` or a list of human-readable errors keyed
 * by field path so the preview UI can highlight the offending
 * cells.
 */
export function validateRow(
  row: Record<string, unknown>,
):
  | { ok: true; data: ImportPatientRow }
  | { ok: false; errors: Array<{ field: string; message: string }> } {
  const result = ImportPatientRowSchema.safeParse(row)
  if (result.success) return { ok: true, data: result.data }
  const errors = result.error.issues.map((i) => ({
    field: i.path.join('.') || '_row',
    message: i.message,
  }))
  return { ok: false, errors }
}
