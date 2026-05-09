'use client'

/**
 * useCanImport — client-side check for whether the current user
 * is authorized to run the spreadsheet-import wizard.
 *
 * Mirrors the server-side rule in lib/import/assert-import-access.ts:
 *
 *   - Account holders (own subscription) → allowed (their household)
 *   - Co-admins / family members with importPatients=true → allowed
 *   - Franchise admins → allowed
 *   - Everyone else → not allowed
 *
 * Used to hide the Import button on /patients header for users
 * who would just get a 403. Server is still the source of truth —
 * a user who somehow reaches the wizard URL directly will be
 * rejected by the endpoints. This hook is UX polish.
 *
 * Reads from useUserProfile (which already loads the user's own
 * doc) — no new fetch. caregiverOf + permissions are surfaced by
 * the same hook the rest of the app uses for membership routing.
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
    // precedence over the consumer permission system.
    const tenantRole = (user as { tenantRole?: string }).tenantRole
    if (tenantRole === 'franchise_admin') {
      return { canImport: true, reason: 'franchise_admin' }
    }

    // Account holder — own subscription means own household.
    if (profile?.subscription) {
      return { canImport: true, reason: 'account_holder' }
    }

    // Caregiver path — surface the importPatients flag from any of
    // the households the caller is a member of. The server
    // resolves which household to write into; for the UI button
    // visibility, we just need ANY positive answer.
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
