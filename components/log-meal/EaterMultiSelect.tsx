/**
 * EaterMultiSelect
 *
 * Family-meal PRD Commit B — picks which family member(s) ate a
 * meal at log time. Surfaces per-eater allergen conflicts inline
 * (using the per-ingredient classifier output from Commit D) and
 * provides an explicit "Confirm allergen exposure" toggle for the
 * clinical-event recording path.
 *
 * Distinction from RecipeModal's allergen panel:
 *   - RecipeModal gates ACTION (planning to cook). Override is
 *     disabled when active eater has the allergy.
 *   - EaterMultiSelect gates LOGGING (recording reality). Override
 *     IS available because allergen exposure happens in real life
 *     and needs to be recorded for clinical timeline review.
 *
 * Filters pets (`species !== 'human'`) — they don't appear in the
 * meal-eater list. Includes children regardless of age (caregivers
 * log meals on behalf of minors per the family-care model).
 *
 * The "self" entry (the logged-in user) appears at the top of the
 * list and is selected by default unless ?patientId narrows the
 * context to a specific family member.
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PatientProfile } from '@/types/medical'
import type { AllergyTag } from '@/lib/meal-suggestions'
import { findAllergenOverlap } from '@/lib/allergen-cross-check'
import { medicalOperations } from '@/lib/medical-operations'

export interface EaterSelection {
  /** Stable id — patient.id for family members, 'self' for the
      logged-in user. */
  id: string
  /** Patient document id when this is a family member; undefined
      for 'self'. The meal-log save fan-out routes by this:
      defined → POST /api/patients/{patientId}/meal-logs;
      undefined → POST /api/meal-logs. */
  patientId?: string
  /** Display name. */
  name: string
  /** Per-eater allergen-exposure flag — populated only when the
      eater has a conflict with the recipe AND the user explicitly
      confirmed exposure via the toggle. Carried through to the
      MealLog.allergenExposure field on save. */
  allergenExposure?: {
    tags: AllergyTag[]
    confirmed: true
    confirmedAt: string
  }
}

interface EaterMultiSelectProps {
  /** Per-ingredient allergen tags from the classifier. Used to
      compute per-eater conflicts. Pass undefined when the meal
      isn't recipe-derived (no allergen check fires). */
  ingredientAllergens?: AllergyTag[][]
  /** When the page is in patient-context (?patientId=...), default
      to selecting that patient and skip 'self'. */
  scopedToPatientId?: string
  /** Callback fired when the selection changes. */
  onChange: (selection: EaterSelection[]) => void
}

export function EaterMultiSelect({
  ingredientAllergens,
  scopedToPatientId,
  onChange,
}: EaterMultiSelectProps) {
  const [patients, setPatients] = useState<PatientProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exposureConfirmed, setExposureConfirmed] = useState<Set<string>>(
    new Set(),
  )

  // Load family roster on mount. Non-human members (pets) are
  // excluded — pet nutrition is a separate domain.
  useEffect(() => {
    let cancelled = false
    medicalOperations.patients
      .getPatients()
      .then((all) => {
        if (cancelled) return
        const humans = (all || []).filter((p) => {
          const species = (p as { species?: string }).species
          return !species || species === 'human'
        })
        setPatients(humans)
        // Default selection: scoped patient if provided, else self.
        if (scopedToPatientId) {
          setSelectedIds(new Set([scopedToPatientId]))
        } else {
          setSelectedIds(new Set(['self']))
        }
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        // Fail open — if the roster fails to load, default to self
        // so the page is still usable.
        setSelectedIds(new Set(['self']))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scopedToPatientId])

  // Build the rendered roster. 'self' goes first when not scoped.
  const roster = useMemo(() => {
    const rows: Array<{
      id: string
      patientId?: string
      name: string
      foodAllergies?: string[]
      relationship?: string
    }> = []
    if (!scopedToPatientId) {
      rows.push({ id: 'self', name: 'You' })
    }
    for (const p of patients) {
      rows.push({
        id: p.id,
        patientId: p.id,
        name: p.name,
        foodAllergies: p.foodAllergies,
        relationship: p.relationship,
      })
    }
    return rows
  }, [patients, scopedToPatientId])

  // Per-eater allergen conflict map. 'self' has no allergy profile
  // here (the logged-in user's allergies aren't loaded — that's a
  // future Phase 4 polish). For now, conflict detection only fires
  // for family-member rows where foodAllergies is populated.
  const conflictByEaterId = useMemo(() => {
    const out = new Map<string, AllergyTag[]>()
    if (!ingredientAllergens?.length) return out
    // Flatten all per-ingredient tags into one set for the recipe
    // — the per-eater question is "does ANY ingredient conflict?"
    const recipeTagSet = new Set<AllergyTag>()
    for (const tags of ingredientAllergens) {
      for (const t of tags) recipeTagSet.add(t)
    }
    if (recipeTagSet.size === 0) return out
    const recipeTags = Array.from(recipeTagSet)
    for (const row of roster) {
      if (!row.foodAllergies?.length) continue
      const overlaps = findAllergenOverlap(recipeTags, row.foodAllergies)
      if (overlaps.length > 0) {
        out.set(
          row.id,
          // Dedup against AllergyTag values (recipe-side) so the
          // exposure record matches the canonical tag set.
          Array.from(new Set(overlaps.map((m) => m.recipeTag))),
        )
      }
    }
    return out
  }, [ingredientAllergens, roster])

  // Emit the parent-facing selection whenever inputs change. Skip
  // until roster is loaded so the parent doesn't see an empty
  // intermediate state.
  useEffect(() => {
    if (loading) return
    const out: EaterSelection[] = []
    for (const row of roster) {
      if (!selectedIds.has(row.id)) continue
      const conflictTags = conflictByEaterId.get(row.id)
      if (conflictTags && !exposureConfirmed.has(row.id)) {
        // Conflicting eater without exposure confirmation is HARD-
        // skipped — they don't get a log. Caregiver sees inline
        // explanation in the row.
        continue
      }
      out.push({
        id: row.id,
        patientId: row.patientId,
        name: row.name,
        allergenExposure:
          conflictTags && exposureConfirmed.has(row.id)
            ? {
                tags: conflictTags,
                confirmed: true,
                confirmedAt: new Date().toISOString(),
              }
            : undefined,
      })
    }
    onChange(out)
  }, [
    loading,
    roster,
    selectedIds,
    exposureConfirmed,
    conflictByEaterId,
    onChange,
  ])

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        // De-selecting clears the exposure-confirmed state too —
        // a future re-selection should require a fresh confirm.
        setExposureConfirmed((p) => {
          const n = new Set(p)
          n.delete(id)
          return n
        })
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleExposureConfirmed = (id: string) => {
    setExposureConfirmed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading family members…
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Who ate this meal?</p>
      {roster.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No family members found.
        </p>
      ) : (
        <ul className="space-y-2">
          {roster.map((row) => {
            const isSelected = selectedIds.has(row.id)
            const conflictTags = conflictByEaterId.get(row.id)
            const hasConflict = !!conflictTags
            const confirmed = exposureConfirmed.has(row.id)
            const blocked = isSelected && hasConflict && !confirmed
            return (
              <li
                key={row.id}
                className={`rounded-lg border p-3 ${
                  blocked
                    ? 'bg-error/5 border-error'
                    : isSelected
                      ? 'bg-primary-light/30 border-primary'
                      : 'bg-muted/40 border-border'
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelected(row.id)}
                    className="w-5 h-5 mt-0.5 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">
                      {row.name}
                      {row.relationship && (
                        <span className="ml-2 text-xs text-muted-foreground capitalize">
                          {row.relationship}
                        </span>
                      )}
                    </div>
                    {hasConflict && (
                      <p className="text-xs text-error font-medium mt-1 flex items-start gap-1">
                        <span>⚠</span>
                        <span>
                          Recipe contains{' '}
                          <strong>{conflictTags!.join(', ')}</strong> —
                          flagged in {row.name}&apos;s allergy profile.
                        </span>
                      </p>
                    )}
                  </div>
                </label>
                {/* Per-eater "Confirm allergen exposure" toggle.
                    Only rendered when the eater has a conflict AND
                    is selected. Distinct semantic from the recipe-
                    context override we removed: this records that
                    the eater actually consumed the allergen
                    (intentional or accidental); meal log gets a
                    flag visible to caregiver / clinician review. */}
                {isSelected && hasConflict && (
                  <div className="mt-3 ml-8 border-t border-error/30 pt-2">
                    <label className="flex items-start gap-2 text-xs cursor-pointer text-foreground">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={() => toggleExposureConfirmed(row.id)}
                        className="w-4 h-4 mt-0.5 rounded"
                      />
                      <span>
                        <strong>Confirm allergen exposure</strong> —
                        recording that {row.name} actually ate the
                        flagged ingredient (intentional or accidental).
                        The log will be flagged for clinician review.
                      </span>
                    </label>
                  </div>
                )}
                {blocked && (
                  <p className="mt-2 ml-8 text-xs text-error">
                    Won&apos;t log for {row.name} — confirm exposure above
                    or de-select.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
