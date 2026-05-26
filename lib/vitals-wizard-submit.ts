/**
 * Shared submit pipeline for the SupervisedVitalsWizard.
 *
 * Both wizard entry points (the patient detail page and the patients
 * list page) had the same batch-save loop inlined: transform wizard
 * data → save each non-weight vital with per-item try/catch (so a
 * duplicate on one type doesn't black-hole the rest) → save weight
 * via the canonical weight-logs API → compose a toast describing
 * what saved vs what was skipped. Duplication invited drift (mood
 * notes were enhanced on one path but not the other). One helper
 * now owns the rule per feedback_dry + feedback_one_question_one_answer.
 *
 * Callers retain page-specific bookkeeping (summary modal hydration,
 * schedule creation, etc.) — only the cross-cutting save + toast is
 * centralized here.
 */

import toast from 'react-hot-toast'
import { medicalOperations } from '@/lib/medical-operations'
import {
  transformWizardDataToVitals,
  hasAnyVitalMeasurement,
  type WizardVitalData,
} from '@/lib/vitals-wizard-transform'
import type { VitalSign, VitalUnit } from '@/types/medical'

export interface SubmitWizardResult {
  /** Number of measurements (vitals + weight) actually written. */
  savedCount: number
  /** Saved non-weight VitalSign rows returned by the API (for summary modal). */
  savedVitals: VitalSign[]
  /** True iff the weight write succeeded (not a duplicate, not an error). */
  weightSaved: boolean
  /** Human-readable types that were soft-skipped as same-day duplicates. */
  skipped: string[]
}

/**
 * Build a notes string for a wizard submission, prefixing the mood
 * tag when present so the timeline shows the mood inline with each
 * vital. Both wizard entry points should embed mood the same way.
 */
export function buildVitalsNotes(vitals: WizardVitalData): string {
  const base = vitals.notes?.trim() || ''
  if (!vitals.mood) return base
  const moodEmoji =
    vitals.mood === 'happy' ? '😊'
    : vitals.mood === 'calm' ? '😌'
    : vitals.mood === 'okay' ? '😐'
    : vitals.mood === 'worried' ? '😟'
    : vitals.mood === 'sad' ? '😢'
    : vitals.mood === 'pain' ? '😫'
    : '😐'
  const moodSection = `[MOOD: ${moodEmoji} ${vitals.mood}]${
    vitals.moodNotes ? `\n${vitals.moodNotes}` : ''
  }`
  return base ? `${moodSection}\n\n${base}` : moodSection
}

/**
 * True when the error message indicates a same-day duplicate. The
 * vitals API returns a 409 with "A <type> entry already exists for
 * <date>" — we soft-skip these and continue the batch instead of
 * aborting the rest of the wizard's submit.
 */
function isDuplicateErr(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err)
  return m.toLowerCase().includes('already exists')
}

/**
 * Save every measurement collected by the wizard. Each save is its
 * own try/catch — a duplicate on one type is logged as a soft skip;
 * any other error propagates so the caller's outer try/catch shows
 * the toast.
 *
 * Throws on the first non-duplicate failure. Callers should still
 * wrap this in their own try/catch for page-specific cleanup.
 */
export async function submitWizardMeasurements(
  patientId: string,
  vitals: WizardVitalData,
): Promise<SubmitWizardResult> {
  if (!hasAnyVitalMeasurement(vitals)) {
    toast.error('Please record at least one vital sign measurement.')
    return { savedCount: 0, savedVitals: [], weightSaved: false, skipped: [] }
  }

  const notes = buildVitalsNotes(vitals)
  // transformWizardDataToVitals does NOT emit weight — weight has
  // its own canonical writer; see lib/vitals-wizard-transform.ts.
  const vitalInputs = transformWizardDataToVitals(vitals).map(input => ({
    ...input,
    notes,
  }))

  const savedVitals: VitalSign[] = []
  const skipped: string[] = []

  for (const vitalInput of vitalInputs) {
    try {
      const saved = await medicalOperations.vitals.logVital(patientId, {
        ...vitalInput,
        unit: vitalInput.unit as VitalUnit,
      })
      savedVitals.push(saved)
    } catch (err) {
      if (isDuplicateErr(err)) {
        skipped.push(vitalInput.type.replace('_', ' '))
        continue
      }
      throw err
    }
  }

  let weightSaved = false
  if (vitals.weight) {
    try {
      await medicalOperations.weightLogs.logWeight(patientId, {
        weight: vitals.weight,
        unit: 'lbs',
        loggedAt: vitals.timestamp.toISOString(),
        source: 'manual',
        tags: [],
        ...(notes ? { notes } : {}),
      })
      weightSaved = true
    } catch (err) {
      if (isDuplicateErr(err)) {
        skipped.push('weight')
      } else {
        throw err
      }
    }
  }

  return {
    savedCount: savedVitals.length + (weightSaved ? 1 : 0),
    savedVitals,
    weightSaved,
    skipped,
  }
}

/**
 * Render the standard wizard-submit success toast. Three shapes:
 *   - nothing saved + some skipped → info toast "Already logged today: …"
 *   - some saved + some skipped    → success "N logged · skipped duplicates: …"
 *   - all saved                    → success "N vital sign(s) logged successfully!"
 */
export function toastWizardResult(result: SubmitWizardResult): void {
  const { savedCount, skipped } = result
  if (savedCount === 0 && skipped.length > 0) {
    toast(`Already logged today: ${skipped.join(', ')}`, { icon: 'ℹ️' })
    return
  }
  if (skipped.length > 0) {
    toast.success(
      `${savedCount} logged · skipped duplicates: ${skipped.join(', ')}`,
      { duration: 5000 },
    )
    return
  }
  toast.success(
    `${savedCount} vital sign${savedCount !== 1 ? 's' : ''} logged successfully!`,
  )
}
