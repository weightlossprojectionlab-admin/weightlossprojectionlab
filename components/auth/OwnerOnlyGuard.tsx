'use client'

/**
 * OwnerOnlyGuard — block caregiver-only users from owner surfaces.
 *
 * Semantic intent: pages like /patients, /patients/[id], and other
 * family-admin (owner) surfaces only make sense for users who run their
 * own household. A caregiver-only user has no plan to display, no
 * upgrade CTA to take, and the patient APIs return 403 because their
 * access goes through household membership, not direct ownership.
 *
 * What it does:
 *   - Reads the user profile.
 *   - If caregiver-only, redirects to /caregiver/{firstOwner} and renders
 *     a small "Redirecting…" placeholder. Children NEVER mount, so any
 *     data-fetch hooks inside them never fire — no 403 wall.
 *   - If owner, renders children normally.
 *   - While the profile loads, renders a loading placeholder.
 *
 * Predicate is centralized in lib/user-role.ts so this guard, the
 * auth router, and any other consumer stay in lockstep.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserProfile } from '@/hooks/useUserProfile'
import { isCaregiverOnly } from '@/lib/user-role'
import { logger } from '@/lib/logger'

interface OwnerOnlyGuardProps {
  children: React.ReactNode
}

export default function OwnerOnlyGuard({ children }: OwnerOnlyGuardProps) {
  const router = useRouter()
  const { profile: userProfile, loading } = useUserProfile()

  const caregiverOnly = !!userProfile && isCaregiverOnly(userProfile as any)
  const firstOwner = caregiverOnly
    ? (userProfile as any)?.caregiverOf?.[0]?.accountOwnerId
    : null

  useEffect(() => {
    if (!caregiverOnly || !firstOwner) return
    logger.info('[OwnerOnlyGuard] Caregiver-only user — redirecting to caregiver dashboard', { firstOwner })
    router.replace(`/caregiver/${firstOwner}`)
  }, [caregiverOnly, firstOwner, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (caregiverOnly) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to caregiver dashboard…</p>
      </div>
    )
  }

  return <>{children}</>
}
