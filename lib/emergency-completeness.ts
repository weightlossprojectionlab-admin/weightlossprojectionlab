/**
 * emergency-completeness — how much of the emergency-critical record is on file.
 *
 * Powers a "fill it in while you're calm" meter (see plan "PART B — honesty guardrails":
 * a completeness meter is what makes the Emergency button worth pressing). Same honesty
 * rule as the rest of the record: a blank field is surfaced as "not on file", never
 * quietly treated as answered.
 *
 * Scope is deliberately the always-applicable, editable-today must-knows — blood type,
 * drug allergies, code status. (Conditions/meds/contacts are legitimately empty for some
 * people, or not yet editable in-app, so counting them would punish a complete record.)
 * Pure + data-only so it's trivially unit-testable and reusable across surfaces.
 */

export interface EmergencyField {
  key: 'bloodType' | 'drugAllergies' | 'codeStatus'
  label: string
  present: boolean
}

export interface EmergencyCompleteness {
  pct: number // 0–100
  complete: boolean
  fields: EmergencyField[]
  missing: EmergencyField[]
}

export function emergencyCompleteness(patient: {
  bloodType?: string
  drugAllergies?: string[]
  codeStatus?: string
}): EmergencyCompleteness {
  const fields: EmergencyField[] = [
    {
      key: 'bloodType',
      label: 'Blood type',
      present: !!patient.bloodType && patient.bloodType !== 'unknown',
    },
    {
      key: 'drugAllergies',
      label: 'Drug allergies',
      present: Array.isArray(patient.drugAllergies) && patient.drugAllergies.length > 0,
    },
    {
      key: 'codeStatus',
      label: 'Code status',
      present: !!patient.codeStatus && patient.codeStatus !== 'unknown',
    },
  ]
  const presentCount = fields.filter((f) => f.present).length
  const pct = Math.round((presentCount / fields.length) * 100)
  return {
    pct,
    complete: presentCount === fields.length,
    fields,
    missing: fields.filter((f) => !f.present),
  }
}
