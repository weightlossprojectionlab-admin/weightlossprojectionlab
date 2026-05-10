/**
 * Spreadsheet-import config — supports both family-member rows
 * AND weight-log rows in a single CSV via an optional `Type`
 * column ("patient" | "weight"). When Type is missing, every row
 * is a patient (the simple-template path; what every customer
 * does on their first import). When Type is present, the commit
 * endpoint dispatches per row.
 *
 * Why one config rather than two: the user types ONE upload, we
 * surface ONE wizard. Splitting the import flow into two routes
 * with two pickers added friction (per the "the one import was
 * enough" feedback). Keeping both row schemas in this file means
 * the wizard's column-mapping UI lists every importable field,
 * the user maps each column once, and per-row dispatch happens
 * server-side.
 *
 * Three responsibilities live here:
 *   1. Field aliases — every importable field lists the
 *      human-friendly column headers it answers to. The preview
 *      endpoint fuzzy-matches uploaded CSV headers against these
 *      to suggest a mapping.
 *   2. Per-cell transforms — coerce a raw CSV string into the
 *      typed shape: ISO dates, lowercased enums, arrays from
 *      comma-separated text.
 *   3. Per-row Zod validators — one for patient rows, one for
 *      weight-log rows. The dispatcher picks the right validator
 *      based on the row's resolved type.
 */

import { z } from 'zod'

// ============================================================================
// Field universe — patient fields + weight-row fields + the row-type column
// ============================================================================

/**
 * Every column the wizard knows how to import. The `_rowType`
 * field is special: it identifies which row type each row is
 * ('patient' | 'weight'). Skip-or-set just like any other
 * column. When no column maps to `_rowType`, every row is
 * treated as a patient (default for the simple template).
 */
export type ImportableField =
  // Row discriminator (advanced template only)
  | '_rowType'
  // Shared identifiers
  | 'name'
  // Patient-specific fields
  | 'type'
  | 'dateOfBirth'
  | 'relationship'
  | 'gender'
  | 'bloodType'
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
  // Weight-row-specific fields
  | 'measuredWeight'
  | 'measuredUnit'
  | 'loggedAt'
  | 'notes'
  | 'bodyFat'
  | 'tags'
  // Immunization-row-specific fields
  | 'vaccineName'
  | 'administeredAt'
  | 'doseNumber'
  | 'lotNumber'
  | 'administeredBy'
  | 'nextDueAt'
  // Equipment-row-specific fields
  | 'equipmentName'
  | 'equipmentType'
  | 'manufacturer'
  | 'model'
  | 'serialNumber'
  | 'prescribedBy'
  | 'acquiredAt'
  | 'nextMaintenanceAt'
  // Family-history-row-specific fields
  | 'relativeRelationship'
  | 'condition'
  | 'ageOfOnset'
  | 'isLiving'
  | 'causeOfDeath'

export type ColumnMapping = ImportableField | 'skip'

const FIELD_ALIASES: Record<ImportableField, string[]> = {
  // Row discriminator
  _rowType: ['Type', 'Row Type', 'Kind', 'Category', 'Record Type'],
  // Shared
  name: ['Name', 'Full Name', 'Patient Name', 'Family Member', 'Person', 'For'],
  // Patient
  type: ['Patient Type', 'Person or Pet', 'Human or Pet'],
  dateOfBirth: ['Date of Birth', 'DOB', 'Birth Date', 'Birthday', 'Born', 'Birthdate'],
  relationship: ['Relationship', 'Relation', 'Role'],
  gender: ['Gender', 'Sex'],
  bloodType: ['Blood Type', 'ABO Type'],
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
  foodAllergies: ['Food Allergies', 'Allergies', 'Allergens', 'Allergic To'],
  currentWeight: ['Current Weight', 'Latest Weight'],
  weightUnit: ['Current Weight Unit', 'Weight Units'],
  targetWeight: ['Target Weight', 'Goal Weight'],
  height: ['Height'],
  heightUnit: ['Height Unit', 'Height Units'],
  weightCheckInFrequency: [
    'Weight Check-In Frequency',
    'Weigh-In Frequency',
    'Check-In Frequency',
    'Weighing Schedule',
  ],
  // Weight row — distinct from patient.currentWeight so a single
  // CSV row can carry both (rare) and the dispatcher knows which
  // is which without inferring from row position.
  measuredWeight: ['Weight', 'Body Weight', 'Mass', 'Measured Weight'],
  measuredUnit: ['Unit', 'Units', 'Weight Unit'],
  loggedAt: [
    'Date',
    'Logged At',
    'Recorded At',
    'Date/Time',
    'Datetime',
    'When',
    'Measured At',
  ],
  notes: ['Notes', 'Comment', 'Comments', 'Memo'],
  bodyFat: ['Body Fat', 'Body Fat %', 'BF', 'BFP', 'Body Fat Percent'],
  tags: ['Tags', 'Labels', 'Time of Day', 'Context'],
  // Immunization row
  vaccineName: ['Vaccine', 'Vaccine Name', 'Immunization', 'Shot'],
  administeredAt: ['Date Administered', 'Administered At', 'Date Given', 'Vaccine Date', 'Shot Date'],
  doseNumber: ['Dose', 'Dose #', 'Dose Number', 'Shot #'],
  lotNumber: ['Lot', 'Lot #', 'Lot Number', 'Vial Lot'],
  administeredBy: ['Administered By', 'Given By', 'Provider', 'Clinic', 'Pharmacy'],
  nextDueAt: ['Next Due', 'Next Dose Due', 'Booster Due', 'Next Vaccine Date'],
  // Equipment row
  equipmentName: ['Device', 'Equipment', 'Equipment Name', 'Device Name'],
  equipmentType: ['Category', 'Equipment Category', 'Device Category', 'Device Type'],
  manufacturer: ['Manufacturer', 'Brand', 'Maker'],
  model: ['Model', 'Model Number', 'Model Name'],
  serialNumber: ['Serial', 'Serial #', 'Serial Number', 'SN'],
  prescribedBy: ['Prescribed By', 'Rx By', 'Ordered By'],
  acquiredAt: ['Acquired', 'Date Acquired', 'Date Received', 'Purchase Date'],
  nextMaintenanceAt: ['Next Maintenance', 'Maintenance Due', 'Service Due', 'Next Service'],
  // Family-history row
  relativeRelationship: ['Relative', 'Relationship', 'Family Member Relation', 'Relative Type'],
  condition: ['Condition', 'Diagnosis', 'Family Condition', 'Disease'],
  ageOfOnset: ['Age of Onset', 'Onset Age', 'Age Diagnosed', 'Diagnosed At Age'],
  isLiving: ['Living', 'Alive', 'Living Status'],
  causeOfDeath: ['Cause of Death', 'COD', 'Died Of'],
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
// Per-cell transforms — raw CSV string → typed value
// ============================================================================

function splitList(raw: string): string[] {
  return raw.split(/[,;]/).map((s) => s.trim()).filter((s) => s.length > 0)
}

function parseDateOnly(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (m) {
    const [, a, b, c] = m
    let month = parseInt(a, 10)
    let day = parseInt(b, 10)
    if (month > 12 && day <= 12) [month, day] = [day, month]
    let year = parseInt(c, 10)
    if (year < 100) year = year < 30 ? 2000 + year : 1900 + year
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  }
  const parsed = Date.parse(trimmed)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString().slice(0, 10)
}

function parseDateTime(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parsed = Date.parse(trimmed)
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
  }
  const m = trimmed.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m?)?)?$/i,
  )
  if (m) {
    const [, a, b, c, hStr, mStr, sStr, ampm] = m
    let month = parseInt(a, 10)
    let day = parseInt(b, 10)
    if (month > 12 && day <= 12) [month, day] = [day, month]
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
    return new Date(year, month - 1, day, hours, mins, secs).toISOString()
  }
  const parsed = Date.parse(trimmed)
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
}

function normalizeWeightUnit(raw: string): string | undefined {
  const v = raw.trim().toLowerCase()
  if (['lb', 'lbs', 'pound', 'pounds'].includes(v)) return 'lbs'
  if (['kg', 'kilo', 'kilos', 'kilogram', 'kilograms'].includes(v)) return 'kg'
  if (v === 'oz') return 'oz'
  if (v === 'g') return 'g'
  return v || undefined
}

const FIELD_TRANSFORMS: Record<ImportableField, (raw: string) => unknown> = {
  _rowType: (raw) => {
    const v = raw.trim().toLowerCase()
    if (!v) return undefined
    if (['patient', 'family member', 'person', 'human', 'pet'].includes(v)) return 'patient'
    if (['weight', 'weight log', 'weigh-in', 'weigh in'].includes(v)) return 'weight'
    if (['immunization', 'vaccine', 'vaccination', 'shot'].includes(v)) return 'immunization'
    if (['equipment', 'medical equipment', 'device'].includes(v)) return 'equipment'
    if (['family history', 'family_history', 'familyhistory', 'family-history', 'family medical history'].includes(v)) return 'family_history'
    return v // let dispatcher reject
  },
  name: (raw) => raw.trim() || undefined,
  type: (raw) => {
    const v = raw.trim().toLowerCase()
    if (!v) return undefined
    if (['human', 'person', 'people'].includes(v)) return 'human'
    if (['pet', 'animal'].includes(v)) return 'pet'
    return v
  },
  dateOfBirth: (raw) => parseDateOnly(raw) ?? undefined,
  relationship: (raw) => raw.trim().toLowerCase() || undefined,
  gender: (raw) => {
    const v = raw.trim().toLowerCase()
    if (!v) return undefined
    if (v.startsWith('m')) return 'male'
    if (v.startsWith('f')) return 'female'
    return v
  },
  bloodType: (raw) => {
    const v = raw.trim().toUpperCase().replace(/\s+/g, '')
    if (!v) return undefined
    // Accept canonical (A+, O-, AB+) and 'UNKNOWN' literal.
    const valid = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN']
    if (valid.includes(v)) return v === 'UNKNOWN' ? 'unknown' : v
    return v // let validator reject
  },
  species: (raw) => raw.trim().toLowerCase() || undefined,
  breed: (raw) => raw.trim() || undefined,
  nickname: (raw) => raw.trim() || undefined,
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
    return Number.isFinite(n) && n > 0 ? n : undefined
  },
  weightUnit: (raw) => normalizeWeightUnit(raw),
  targetWeight: (raw) => {
    const n = parseFloat(raw.trim())
    return Number.isFinite(n) && n > 0 ? n : undefined
  },
  height: (raw) => {
    const n = parseFloat(raw.trim())
    return Number.isFinite(n) && n > 0 ? n : undefined
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
  // Weight-row fields
  measuredWeight: (raw) => {
    const n = parseFloat(raw.trim())
    return Number.isFinite(n) && n > 0 ? n : undefined
  },
  measuredUnit: (raw) => {
    const v = normalizeWeightUnit(raw)
    if (v === 'lbs' || v === 'kg') return v
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
  // Immunization-row fields
  vaccineName: (raw) => raw.trim() || undefined,
  administeredAt: (raw) => parseDateOnly(raw) ?? undefined,
  doseNumber: (raw) => {
    const n = parseInt(raw.trim(), 10)
    return Number.isFinite(n) && n > 0 ? n : undefined
  },
  lotNumber: (raw) => raw.trim() || undefined,
  administeredBy: (raw) => raw.trim() || undefined,
  nextDueAt: (raw) => parseDateOnly(raw) ?? undefined,
  // Equipment-row fields
  equipmentName: (raw) => raw.trim() || undefined,
  equipmentType: (raw) => raw.trim().toLowerCase() || undefined,
  manufacturer: (raw) => raw.trim() || undefined,
  model: (raw) => raw.trim() || undefined,
  serialNumber: (raw) => raw.trim() || undefined,
  prescribedBy: (raw) => raw.trim() || undefined,
  acquiredAt: (raw) => parseDateOnly(raw) ?? undefined,
  nextMaintenanceAt: (raw) => parseDateOnly(raw) ?? undefined,
  // Family-history-row fields
  relativeRelationship: (raw) => {
    const v = raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
    if (!v) return undefined
    if (['mom', 'mother', 'mum'].includes(v)) return 'mother'
    if (['dad', 'father', 'pa'].includes(v)) return 'father'
    if (['brother', 'sister', 'sibling'].includes(v)) return 'sibling'
    if (['maternal_grandparent', 'maternal_grandma', 'maternal_grandpa', 'mat_grandparent'].includes(v)) return 'maternal_grandparent'
    if (['paternal_grandparent', 'paternal_grandma', 'paternal_grandpa', 'pat_grandparent'].includes(v)) return 'paternal_grandparent'
    if (['aunt', 'uncle', 'aunt_uncle'].includes(v)) return 'aunt_uncle'
    if (['son', 'daughter', 'child'].includes(v)) return 'child'
    return v // let validator reject
  },
  condition: (raw) => raw.trim() || undefined,
  ageOfOnset: (raw) => {
    const n = parseInt(raw.trim(), 10)
    return Number.isFinite(n) && n >= 0 ? n : undefined
  },
  isLiving: (raw) => {
    const v = raw.trim().toLowerCase()
    if (!v) return undefined
    if (['true', 'yes', 'y', 'living', 'alive', '1'].includes(v)) return true
    if (['false', 'no', 'n', 'deceased', 'dead', '0'].includes(v)) return false
    return undefined
  },
  causeOfDeath: (raw) => raw.trim() || undefined,
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
// Row-type dispatch
// ============================================================================

export type ResolvedRowType = 'patient' | 'weight' | 'immunization' | 'equipment' | 'family_history'

/**
 * Decide what kind of row we're looking at. Default is 'patient'
 * — if a CSV has no Type column, every row is a patient (the
 * simple template). When _rowType is set, it overrides.
 */
export function resolveRowType(transformed: Record<string, unknown>): ResolvedRowType | { error: string } {
  const raw = transformed._rowType
  if (raw === undefined) return 'patient'
  if (
    raw === 'patient' ||
    raw === 'weight' ||
    raw === 'immunization' ||
    raw === 'equipment' ||
    raw === 'family_history'
  ) return raw
  return {
    error: `Unknown row type "${String(raw)}". Use "patient", "weight", "immunization", "equipment", or "family_history".`,
  }
}

// ============================================================================
// Patient row schema
// ============================================================================

export const ImportPatientRowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: z.enum(['human', 'pet']),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be a valid date'),
  relationship: z.enum(['self', 'spouse', 'parent', 'child', 'sibling', 'grandparent', 'pet']),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).optional(),
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
  if (data.type === 'pet' && !data.species) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['species'], message: 'Species is required for pets' })
  }
  if (data.type === 'pet' && data.relationship !== 'pet') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['relationship'], message: "Pets should have relationship 'pet'" })
  }
})

export type ImportPatientRow = z.infer<typeof ImportPatientRowSchema>

// ============================================================================
// Weight-log row schema
// ============================================================================

export const ImportWeightRowSchema = z.object({
  // Reuse `name` as the patient identifier — the wizard's column
  // mapping has one Name column that serves both patient rows
  // (creates the patient) and weight rows (matches an existing-or-
  // just-created patient).
  name: z.string().min(1, 'Patient name is required'),
  measuredWeight: z.number().positive('Weight must be positive').max(1500, 'Weight is implausibly high'),
  measuredUnit: z.enum(['lbs', 'kg']),
  loggedAt: z.string().refine(
    (s) => !Number.isNaN(Date.parse(s)),
    'Date is required and must be a valid date',
  ),
  notes: z.string().max(2000).optional(),
  bodyFat: z.number().min(0).max(100, 'Body fat % must be between 0 and 100').optional(),
  tags: z.array(z.string()).optional(),
})

export type ImportWeightRow = z.infer<typeof ImportWeightRowSchema>

// ============================================================================
// Validate helpers — pick by row type
// ============================================================================

export function validatePatientRow(
  row: Record<string, unknown>,
):
  | { ok: true; data: ImportPatientRow }
  | { ok: false; errors: Array<{ field: string; message: string }> } {
  const result = ImportPatientRowSchema.safeParse(row)
  if (result.success) return { ok: true, data: result.data }
  return {
    ok: false,
    errors: result.error.issues.map((i) => ({
      field: i.path.join('.') || '_row',
      message: i.message,
    })),
  }
}

export function validateWeightRow(
  row: Record<string, unknown>,
):
  | { ok: true; data: ImportWeightRow }
  | { ok: false; errors: Array<{ field: string; message: string }> } {
  const result = ImportWeightRowSchema.safeParse(row)
  if (result.success) return { ok: true, data: result.data }
  return {
    ok: false,
    errors: result.error.issues.map((i) => ({
      field: i.path.join('.') || '_row',
      message: i.message,
    })),
  }
}

// ============================================================================
// Immunization-row schema
// ============================================================================

export const ImportImmunizationRowSchema = z.object({
  // Reuse `name` as the patient identifier — same matching strategy
  // as weight rows (existing patient or just-created in pass 1).
  name: z.string().min(1, 'Patient name is required'),
  vaccineName: z.string().min(1, 'Vaccine name is required').max(200),
  administeredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date administered must be a valid date'),
  doseNumber: z.number().int().positive().optional(),
  lotNumber: z.string().max(100).optional(),
  administeredBy: z.string().max(200).optional(),
  nextDueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Next due must be a valid date').optional(),
  notes: z.string().max(2000).optional(),
})

export type ImportImmunizationRow = z.infer<typeof ImportImmunizationRowSchema>

export function validateImmunizationRow(
  row: Record<string, unknown>,
):
  | { ok: true; data: ImportImmunizationRow }
  | { ok: false; errors: Array<{ field: string; message: string }> } {
  const result = ImportImmunizationRowSchema.safeParse(row)
  if (result.success) return { ok: true, data: result.data }
  return {
    ok: false,
    errors: result.error.issues.map((i) => ({
      field: i.path.join('.') || '_row',
      message: i.message,
    })),
  }
}

// ============================================================================
// Equipment-row schema
// ============================================================================

export const ImportEquipmentRowSchema = z.object({
  // Reuse `name` as the patient identifier — same matching strategy.
  name: z.string().min(1, 'Patient name is required'),
  equipmentName: z.string().min(1, 'Equipment name is required').max(200),
  equipmentType: z.string().max(100).optional(),
  manufacturer: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  serialNumber: z.string().max(200).optional(),
  prescribedBy: z.string().max(200).optional(),
  acquiredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Acquired date must be a valid date').optional(),
  nextMaintenanceAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Maintenance date must be a valid date').optional(),
  notes: z.string().max(2000).optional(),
})

export type ImportEquipmentRow = z.infer<typeof ImportEquipmentRowSchema>

export function validateEquipmentRow(
  row: Record<string, unknown>,
):
  | { ok: true; data: ImportEquipmentRow }
  | { ok: false; errors: Array<{ field: string; message: string }> } {
  const result = ImportEquipmentRowSchema.safeParse(row)
  if (result.success) return { ok: true, data: result.data }
  return {
    ok: false,
    errors: result.error.issues.map((i) => ({
      field: i.path.join('.') || '_row',
      message: i.message,
    })),
  }
}

// ============================================================================
// Family-history-row schema
// ============================================================================

export const ImportFamilyHistoryRowSchema = z.object({
  // Reuse `name` as the patient identifier — same matching strategy.
  name: z.string().min(1, 'Patient name is required'),
  relativeRelationship: z.enum([
    'mother',
    'father',
    'sibling',
    'maternal_grandparent',
    'paternal_grandparent',
    'aunt_uncle',
    'child',
    'other',
  ]),
  condition: z.string().min(1, 'Condition is required').max(200),
  ageOfOnset: z.number().int().min(0).max(150).optional(),
  isLiving: z.boolean().optional(),
  causeOfDeath: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
})

export type ImportFamilyHistoryRow = z.infer<typeof ImportFamilyHistoryRowSchema>

export function validateFamilyHistoryRow(
  row: Record<string, unknown>,
):
  | { ok: true; data: ImportFamilyHistoryRow }
  | { ok: false; errors: Array<{ field: string; message: string }> } {
  const result = ImportFamilyHistoryRowSchema.safeParse(row)
  if (result.success) return { ok: true, data: result.data }
  return {
    ok: false,
    errors: result.error.issues.map((i) => ({
      field: i.path.join('.') || '_row',
      message: i.message,
    })),
  }
}
