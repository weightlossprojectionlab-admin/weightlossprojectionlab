'use client'

/**
 * DosageFields — the one structured dosage editor.
 *
 * Replaces a single free-text box that was asked to carry how-much / how-often /
 * route / conditions at once. Each control here answers exactly one question, so
 * adherence and (later) reminders can compute instead of regex-guessing prose.
 *
 * The verbatim sig stays visible and editable as PROVENANCE — what the label
 * actually said — but it is no longer the computational source.
 *
 * Shared by the Add form, the Edit form, and the OCR review so the three surfaces
 * can't drift apart again (they previously disagreed on even the field's NAME).
 */

import { describeDosage } from '@/lib/medication-dosage'
import type { ScheduleFrequency } from '@/types/vital-schedules'
import type { MedicationRoute } from '@/types/medical'

export interface DosageValue {
  /** Verbatim label text. */
  sig?: string
  /** Legacy prose field (still the fallback for existing rows). */
  frequency?: string
  dose?: { amount: number; unit: string }
  frequencyCode?: ScheduleFrequency
  route?: MedicationRoute
  timing?: string[]
}

interface DosageFieldsProps {
  value: DosageValue
  onChange: (patch: Partial<DosageValue>) => void
  /** Compact grid for inline edit rows. */
  dense?: boolean
}

/** Human labels for the shared vitals frequency vocabulary. */
const FREQUENCY_OPTIONS: Array<{ code: ScheduleFrequency; label: string }> = [
  { code: '1x', label: 'Once a day' },
  { code: '2x', label: 'Twice a day' },
  { code: '3x', label: '3 times a day' },
  { code: '4x', label: '4 times a day' },
  { code: '6x', label: '6 times a day' },
  { code: 'weekly', label: 'Once a week' },
  { code: 'biweekly', label: 'Every 2 weeks' },
  { code: 'monthly', label: 'Once a month' },
]

const ROUTE_OPTIONS: Array<{ code: MedicationRoute; label: string }> = [
  { code: 'oral', label: 'By mouth' },
  { code: 'topical', label: 'On the skin' },
  { code: 'injection', label: 'Injection' },
  { code: 'other', label: 'Other' },
]

const DOSE_UNITS = ['tablet', 'capsule', 'mg', 'mL', 'drop', 'puff', 'patch', 'unit']

const TIMING_CHIPS = ['with meals', 'before meals', 'on an empty stomach', 'in the morning', 'at bedtime']

export function DosageFields({ value, onChange, dense = false }: DosageFieldsProps) {
  // What the app currently believes about this medication's schedule.
  const parsed = describeDosage(value)
  const sigText = value.sig ?? value.frequency ?? ''

  // Only nag when the structured answer is still missing — once frequencyCode is
  // set, the ambiguity is resolved regardless of what the prose says.
  const showAmbiguity = !value.frequencyCode && parsed.confidence === 'ambiguous'
  const showUnknown = !value.frequencyCode && parsed.confidence === 'none' && sigText.trim() !== ''

  const label = 'block text-xs text-muted-foreground mb-1'
  const field =
    'w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm'

  return (
    <div className="space-y-3">
      {/* Verbatim sig — provenance. */}
      <div>
        <label className={label}>Dosage Instructions (as written on the label)</label>
        <input
          type="text"
          value={sigText}
          onChange={e => onChange({ sig: e.target.value, frequency: e.target.value })}
          placeholder="e.g., Take 1 tablet by mouth twice daily"
          className={field}
        />
      </div>

      {/* A bare number is ambiguous ACROSS DIMENSIONS — ask instead of guessing.
          Picking a side here is what silently turned "2" into 1 dose/day. */}
      {showAmbiguity && parsed.rawValue !== undefined && (
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/10">
          <p className="text-sm text-amber-900 dark:text-amber-200 font-medium">
            Is “{parsed.rawValue}” the amount per dose, or how many times per day?
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
            We won&apos;t guess — adherence stays off until this is set.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() =>
                onChange({ dose: { amount: parsed.rawValue!, unit: value.dose?.unit || 'tablet' } })
              }
              className="px-3 py-1.5 text-xs rounded border border-amber-400 bg-white dark:bg-gray-900 text-amber-900 dark:text-amber-200 font-medium"
            >
              {parsed.rawValue} per dose
            </button>
            <button
              type="button"
              onClick={() => {
                const code = FREQUENCY_OPTIONS.find(f => f.code === `${parsed.rawValue}x`)?.code
                onChange({ frequencyCode: code ?? '1x' })
              }}
              className="px-3 py-1.5 text-xs rounded border border-amber-400 bg-white dark:bg-gray-900 text-amber-900 dark:text-amber-200 font-medium"
            >
              {parsed.rawValue}× per day
            </button>
          </div>
        </div>
      )}

      {showUnknown && (
        <p className="text-xs text-muted-foreground">
          We couldn&apos;t read a schedule from those instructions — set the frequency below to
          enable adherence tracking.
        </p>
      )}

      <div className={dense ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
        {/* How much */}
        <div>
          <label className={label}>Amount per dose</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={value.dose?.amount ?? ''}
              onChange={e => {
                const amount = e.target.value === '' ? undefined : Number(e.target.value)
                onChange(
                  amount === undefined
                    ? { dose: undefined }
                    : { dose: { amount, unit: value.dose?.unit || 'tablet' } }
                )
              }}
              placeholder="1"
              className={`${field} w-20`}
              aria-label="Amount per dose"
            />
            <select
              value={value.dose?.unit || 'tablet'}
              onChange={e => onChange({ dose: { amount: value.dose?.amount ?? 1, unit: e.target.value } })}
              className={field}
              aria-label="Dose unit"
            >
              {DOSE_UNITS.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* How often */}
        <div>
          <label className={label}>How often</label>
          <select
            value={value.frequencyCode || ''}
            onChange={e =>
              onChange({ frequencyCode: (e.target.value || undefined) as ScheduleFrequency | undefined })
            }
            className={field}
            aria-label="How often"
          >
            <option value="">Not set</option>
            {FREQUENCY_OPTIONS.map(f => (
              <option key={f.code} value={f.code}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* How */}
        <div>
          <label className={label}>Route</label>
          <select
            value={value.route || ''}
            onChange={e => onChange({ route: (e.target.value || undefined) as MedicationRoute | undefined })}
            className={field}
            aria-label="Route"
          >
            <option value="">Not set</option>
            {ROUTE_OPTIONS.map(r => (
              <option key={r.code} value={r.code}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* When/conditions */}
        <div>
          <label className={label}>Timing</label>
          <div className="flex flex-wrap gap-1.5">
            {TIMING_CHIPS.map(t => {
              const on = (value.timing || []).includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    const cur = value.timing || []
                    onChange({ timing: on ? cur.filter(x => x !== t) : [...cur, t] })
                  }}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    on
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DosageFields
