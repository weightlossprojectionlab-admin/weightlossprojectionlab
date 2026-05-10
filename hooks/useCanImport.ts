'use client'

/**
 * useCanImport — client-side check for whether the current user
 * is authorized to run the spreadsheet-import wizard.
 *
 * Mirrors the server-side rule in lib/import/assert-import-access.ts:
 *
 *   - Account holders on a multi-member plan → allowed
 *   - Co-admins / family members with importPatients=true on a
 *     multi-member household → allowed
 *   - Franchise admins → allowed (white-label tier is multi-member
 *     by definition)
 *   - Single User Plan customers → not allowed (the feature has no
 *     value when the cap is 1; gating it removes friction)
 *   - Everyone else → not allowed
 *
 * Plan-tier gate: the server-side helper checks the owner's
 * subscription `maxPatients ?? maxSeats ?? 1` and rejects when
 * <= 1. We mirror the same rule here so the Import button hides
 * on Single User Plan rather than appearing and 403-ing on click.
 *
 * Server is still the source of truth — a user who reaches the
 * wizard URL directly will be rejected by the endpoints. This
 * hook is UX polish.
 */

import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { useUserProfile } from './useUserProfile'

interface UseCanImportResult {
  canImport: boolean
  /** Why the user can or can't — useful for debugging and future
   *  surfaces that want to explain the state. */
  reason:
    | 'loading'
    | 'not_signed_in'
    | 'account_holder'
    | 'franchise_admin'
    | 'caregiver_with_grant'
    | 'caregiver_no_grant'
    | 'no_household'
    | 'plan_too_small'
}

interface SubscriptionShape {
  maxPatients?: number
  maxSeats?: number
}

function planSupportsMultiMember(sub: SubscriptionShape | undefined | null): boolean {
  if (!sub) return false
  const max = sub.maxPatients ?? sub.maxSeats ?? 1
  return max > 1
}

export function useCanImport(): UseCanImportResult {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile()

  return useMemo<UseCanImportResult>(() => {
    if (authLoading || profileLoading) {
      return { canImport: false, reason: 'loading' }
    }
    if (!user) {
      return { canImport: false, reason: 'not_signed_in' }
    }

    // Franchise admin (white-label tier) — token claim takes
    // precedence; bypasses the plan-tier check.
    const tenantRole = (user as { tenantRole?: string }).tenantRole
    if (tenantRole === 'franchise_admin') {
      return { canImport: true, reason: 'franchise_admin' }
    }

    // Account holder — must be on a multi-member plan.
    if (profile?.subscription) {
      if (!planSupportsMultiMember(profile.subscription as SubscriptionShape)) {
        return { canImport: false, reason: 'plan_too_small' }
      }
      return { canImport: true, reason: 'account_holder' }
    }

    // Caregiver path — must have importPatients permission. The
    // server-side helper additionally checks the OWNER'S plan; we
    // can't see that from the caregiver's user doc. The Import
    // button shows; if the owner is on a small plan, the server
    // will return 403 with a clear message. Acceptable trade-off
    // because most caregivers operate within multi-member
    // households by definition.
    const caregiverOf: Array<{ permissions?: { importPatients?: boolean } }> =
      Array.isArray((profile as Record<string, unknown>)?.caregiverOf)
        ? (profile as Record<string, unknown>).caregiverOf as Array<{ permissions?: { importPatients?: boolean } }>
        : []
    if (caregiverOf.length === 0) {
      return { canImport: false, reason: 'no_household' }
    }
    const granted = caregiverOf.some((ctx) => ctx?.permissions?.importPatients === true)
    if (granted) return { canImport: true, reason: 'caregiver_with_grant' }
    return { canImport: false, reason: 'caregiver_no_grant' }
  }, [user, authLoading, profile, profileLoading])
}
