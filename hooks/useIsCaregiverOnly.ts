'use client'

/**
 * useIsCaregiverOnly — React hook for the "is this user caregiver-only?"
 * predicate, used to suppress subscription UI on surfaces where the caller
 * isn't the subscriber.
 *
 * Semantic intent: "should this user see prompts to upgrade THEIR plan?"
 *   - Owner viewing their own household: yes (they ARE the subscriber).
 *   - Caregiver-only user: no (they have no plan for the surface they're on;
 *     the relevant subscription belongs to the household OWNER).
 *
 * DRY: one source of truth for the predicate (lib/user-role.ts) and one
 * hook all UI components import. Server-side feature gates stay
 * authoritative; this just hides UI that would mislead the viewer.
 *
 * Returns `false` while the profile loads (safer to err on "show UI" than
 * to flicker subscription panels in and out).
 */
import { useUserProfile } from '@/hooks/useUserProfile'
import { isCaregiverOnly } from '@/lib/user-role'

export function useIsCaregiverOnly(): boolean {
  const { profile } = useUserProfile()
  if (!profile) return false
  return isCaregiverOnly(profile as any)
}
