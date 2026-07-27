/**
 * useSubscription Hook
 *
 * Provides access to the user's subscription with admin override and dev simulation support
 * Includes real-time Firestore listener for webhook updates.
 *
 * Family-member trickle-down: when the caller is a household member
 * (caregiver / sub-account) without their own subscription record,
 * the hook falls back to the household OWNER's subscription via
 * users/{uid}.caregiverOf[0].accountOwnerId. This way the locked
 * banner + "Reactivate" buttons render for the family member when
 * the owner's plan ends — matching the server-side gate which
 * always evaluates the owner's subscription on writes.
 *
 * Multi-household caregivers (rare) fall back to the first entry in
 * caregiverOf for client UX. The server-side gate is the source of
 * truth for the actually-active household at write time.
 */

'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './useAuth'
import { useActiveAccount } from '@/contexts/AccountContext'
import { UserSubscription } from '@/types'
import { getUserSubscription, isAdmin, setCachedSubscription } from '@/lib/feature-gates'
import { db } from '@/lib/firebase'
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'

function convertTimestamps(sub: UserSubscription): UserSubscription {
  return {
    ...sub,
    trialEndsAt: sub.trialEndsAt && typeof sub.trialEndsAt === 'object' && 'toDate' in sub.trialEndsAt
      ? (sub.trialEndsAt as any).toDate()
      : sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd && typeof sub.currentPeriodEnd === 'object' && 'toDate' in sub.currentPeriodEnd
      ? (sub.currentPeriodEnd as any).toDate()
      : sub.currentPeriodEnd,
    currentPeriodStart: sub.currentPeriodStart && typeof sub.currentPeriodStart === 'object' && 'toDate' in sub.currentPeriodStart
      ? (sub.currentPeriodStart as any).toDate()
      : sub.currentPeriodStart,
  }
}

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdminUser, setIsAdminUser] = useState(false)

  // The account (workspace) whose plan governs the current view. "One account,
  // many seats": a seat's capabilities derive from the ACTIVE account's plan,
  // never the caller's own. Primary source is AccountContext (published by the
  // patient/caregiver surfaces); we also fall back to the /caregiver/{ownerId}
  // route so surfaces not yet publishing context still mirror the owner.
  const { activeAccountId, isResolvingAccount } = useActiveAccount()
  const pathname = usePathname()
  const routeCaregiverOwnerId = pathname?.match(/^\/caregiver\/([^/]+)/)?.[1] ?? null
  const rawTarget = activeAccountId ?? routeCaregiverOwnerId
  // A target equal to the viewer is just their own personal workspace.
  const targetAccountId = rawTarget && rawTarget !== user?.uid ? rawTarget : null

  useEffect(() => {
    if (!user) {
      setSubscription(null)
      setCachedSubscription(null)
      setLoading(false)
      setIsAdminUser(false)
      return
    }

    setIsAdminUser(isAdmin(user as any))

    // While the active account is still resolving (e.g. /patients/[id] hasn't
    // loaded the patient's owner yet), hold — do NOT seat the viewer's personal
    // plan, which would flash the wrong plan/paywall before the owner's loads.
    if (isResolvingAccount) {
      setLoading(true)
      return
    }

    setLoading(false)
    if (!targetAccountId) {
      // Personal / own workspace: seat the caller's own plan.
      const effectiveSubscription = getUserSubscription(user as any)
      setSubscription(effectiveSubscription)
      setCachedSubscription(effectiveSubscription)
    } else {
      // Acting inside another account: clear the cache SYNCHRONOUSLY before the
      // owner listener attaches, so no stale plan from the prior account bleeds
      // across a switch. The owner listener (below) seats the mirrored plan.
      setCachedSubscription(null, { isMirrored: true })
    }

    // Owner-doc listener for family-member trickle-down. Set up
    // when the caller has no subscription of their own but is a
    // caregiver of another account. Cleared when the caller has
    // their own sub.
    let unsubscribeOwner: Unsubscribe | null = null
    const detachOwner = () => {
      if (unsubscribeOwner) {
        unsubscribeOwner()
        unsubscribeOwner = null
      }
    }

    const attachOwnerListener = (ownerUserId: string) => {
      detachOwner()
      const ownerRef = doc(db, 'users', ownerUserId)
      unsubscribeOwner = onSnapshot(ownerRef, (snap) => {
        if (!snap.exists()) return
        const ownerSub = snap.data()?.subscription as UserSubscription | undefined
        if (!ownerSub) return
        const converted = convertTimestamps(ownerSub)
        setSubscription(converted)
        // isMirrored=true so the write-lock UX knows this caller
        // can't reactivate — they'll get an informational toast
        // instead of a /pricing redirect.
        setCachedSubscription(converted, { isMirrored: true })
      }, (error) => {
        console.error('[useSubscription] Owner listener error:', error)
      })
    }

    // Acting inside another account (caregiver context): mirror THAT owner's
    // plan directly. The caller's own doc doesn't govern here.
    if (targetAccountId) {
      attachOwnerListener(targetAccountId)
    }

    // Real-time listener on the caller's user doc. If they have
    // their own subscription, use it. Otherwise check caregiverOf
    // and fall back to the owner's subscription (DRY trickle-down).
    const userDocRef = doc(db, 'users', user.uid)
    const unsubscribeFirestore = onSnapshot(userDocRef, (docSnapshot) => {
      if (!docSnapshot.exists()) return
      const userData = docSnapshot.data()

      // Acting inside another account → its plan is already mirrored above; the
      // caller's own doc doesn't govern the current view.
      if (targetAccountId) return

      const ownSub = userData?.subscription as UserSubscription | undefined

      if (ownSub) {
        // Caller has their own subscription — use it, drop any
        // owner listener we may have set up earlier. isMirrored=
        // false because this caller IS the owner: they're allowed
        // to reactivate and the lock UX redirects them to /pricing.
        detachOwner()
        const converted = convertTimestamps(ownSub)
        setSubscription(converted)
        setCachedSubscription(converted, { isMirrored: false })
        return
      }

      // No own subscription. If caller is a caregiver of another
      // account, mirror the owner's subscription state.
      const caregiverOf: Array<{ accountOwnerId?: string }> =
        Array.isArray(userData?.caregiverOf) ? userData.caregiverOf : []
      const ownerUserId = caregiverOf[0]?.accountOwnerId
      if (ownerUserId) {
        attachOwnerListener(ownerUserId)
      } else {
        detachOwner()
      }
    }, (error) => {
      console.error('[useSubscription] Firestore listener error:', error)
    })

    // Listen for simulation changes (works in dev mode and for admin users)
    const handleSimulationChange = () => {
      // Simulation changed
      const updated = getUserSubscription(user as any)
      // Updated from simulation
      setSubscription(updated)
      // Don't overwrite the owner's mirrored plan while acting in their account.
      if (!targetAccountId) {
        setCachedSubscription(updated)
      }
    }

    // Listen for dev simulation changes
    window.addEventListener('subscription-simulation-changed', handleSimulationChange)

    return () => {
      // Cleanup
      unsubscribeFirestore()
      detachOwner()
      // Remove simulation listener
      window.removeEventListener('subscription-simulation-changed', handleSimulationChange)
    }
  }, [user, targetAccountId, isResolvingAccount])

  return {
    subscription,
    loading,
    // True while the active account's plan is still resolving. Gate consumers
    // can render a pending state instead of the viewer's personal plan.
    isResolving: loading || isResolvingAccount,
    isAdmin: isAdminUser,
    hasSubscription: subscription !== null,
    plan: subscription?.plan || null,
    status: subscription?.status || null,
    addons: subscription?.addons || { familyFeatures: false }
  }
}
