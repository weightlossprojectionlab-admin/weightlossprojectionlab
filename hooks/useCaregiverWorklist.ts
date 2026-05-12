'use client'

/**
 * useCaregiverWorklist — the canonical "what's due in my window?" answer
 * for caregivers, across every household they help.
 *
 * Semantic intent: a caregiver's day is a flat stream of things to do
 * (log this vital, prep this med, check on this patient). The stream
 * has to span ALL households the caregiver is invited into — single-
 * account views break the workflow. This hook joins those households
 * and emits a flat list of `WorklistItem`s, each tagged with which
 * owner / patient it belongs to so the consumer (the shift view) can
 * group / filter / route correctly.
 *
 * DRY: one source of truth for "what does this caregiver need to do?"
 * Every consumer that asks the question (shift-view worklist, the
 * dashboard hero, future push notifications) imports from here.
 *
 * P1 (this file): defines the type contract and enumerates one item
 * per (owner, patient) pair the caregiver has access to. Real sources —
 * overdue vitals, due meds, today's appointments, shopping reviews —
 * plug in as additional generators in follow-up phases without changing
 * the consumer surface.
 */

import { useMemo } from 'react'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useOwnerNames } from '@/hooks/useOwnerNames'
import { usePatients } from '@/hooks/usePatients'

export type WorklistUrgency = 'overdue' | 'due_now' | 'soon'

export type WorklistKind =
  | 'check_in'        // generic "look at this patient" — the P1 stub
  | 'vital_log'       // overdue or scheduled vital reading
  | 'medication'      // due med dose
  | 'appointment'     // upcoming appointment
  | 'shopping_review' // family member needs to decide on out-of-stock substitution

export interface WorklistItem {
  /** Stable key for React lists; safe across re-renders for the same logical item. */
  id: string

  kind: WorklistKind
  urgency: WorklistUrgency

  /** Which household / patient this item belongs to. */
  ownerId: string
  ownerName: string
  patientId: string
  /** Patient's display name; "this patient" when the name hasn't loaded yet. */
  patientName: string

  /** Headline copy the UI renders. Concrete and action-shaped. */
  title: string

  /** ISO date — null when the item is "anytime soon" with no specific deadline. */
  dueAt: string | null

  /** Where the consumer should navigate to act on the item. */
  href: string
}

interface UseCaregiverWorklistReturn {
  items: WorklistItem[]
  loading: boolean
}

/**
 * Build a stable id for an item so React reconciliation doesn't churn.
 */
function makeItemId(kind: WorklistKind, ownerId: string, patientId: string, suffix = ''): string {
  return `${kind}:${ownerId}:${patientId}${suffix ? ':' + suffix : ''}`
}

export function useCaregiverWorklist(): UseCaregiverWorklistReturn {
  const { profile, loading: profileLoading } = useUserProfile()
  // usePatients returns everything the caller can see — own family +
  // caregiver-accessed patients. We use it as the canonical name source
  // so every worklist surface renders the same name a patient page does.
  const { patients, loading: patientsLoading } = usePatients()

  const patientNamesById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of patients || []) {
      if (p?.id && p?.name) m.set(p.id, p.name)
    }
    return m
  }, [patients])

  // Pull every (ownerId, patientId) pair the caregiver has access to.
  // caregiverOf entries are the post-S4 merged shape: one entry per
  // owner with a deduplicated patientsAccess array of patient IDs.
  const ownerPatients = useMemo(() => {
    const out: Array<{ ownerId: string; patientId: string }> = []
    const caregiverOf: any[] = (profile as any)?.caregiverOf || []
    for (const ctx of caregiverOf) {
      if (!ctx?.accountOwnerId) continue
      const patients: string[] = Array.isArray(ctx.patientsAccess) ? ctx.patientsAccess : []
      for (const patientId of patients) {
        out.push({ ownerId: ctx.accountOwnerId, patientId })
      }
    }
    return out
  }, [profile])

  // Resolve owner names via the centralized live-name endpoint so the
  // worklist surfaces real names (not the stale denormalized
  // accountOwnerName field).
  const ownerIds = useMemo(
    () => Array.from(new Set(ownerPatients.map((p) => p.ownerId))),
    [ownerPatients],
  )
  const { names: ownerNames, loading: namesLoading } = useOwnerNames(ownerIds)

  // Assemble the worklist. P1 stub: one "check on this patient" item
  // per accessible patient, no real overdue-vital data yet. The shape
  // is what matters here — the UI in P2 binds to it; later phases
  // replace this generator with real sources without touching the
  // consumer.
  const items: WorklistItem[] = useMemo(() => {
    if (!profile) return []
    return ownerPatients.map(({ ownerId, patientId }) => {
      const patientName = patientNamesById.get(patientId) || 'this patient'
      return {
        id: makeItemId('check_in', ownerId, patientId),
        kind: 'check_in' as const,
        urgency: 'soon' as const,
        ownerId,
        ownerName: ownerNames[ownerId] || 'Family',
        patientId,
        patientName,
        title: `Check in on ${patientName}`,
        dueAt: null,
        href: `/patients/${patientId}`,
      }
    })
  }, [profile, ownerPatients, ownerNames, patientNamesById])

  return {
    items,
    loading: profileLoading || namesLoading || patientsLoading,
  }
}
