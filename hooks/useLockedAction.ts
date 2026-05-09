'use client'

/**
 * useLockedAction — DRY helper for gating write buttons on
 * read-only (terminated) subscriptions.
 *
 * The pattern at every write surface:
 *   1. Check whether the current account can write
 *   2. If read-only, swap the button label for "Paused — <action>"
 *      with a lock icon and intercept the click via
 *      handleWriteLocked (owners → toast + /pricing redirect;
 *      family members → informational toast, stay put).
 *   3. If writable, the original onClick fires unchanged.
 *
 * Label convention: "Paused — <Original Label>". The state word
 * (Paused) matches the banner vocabulary; the original verb stays
 * so the user still recognizes what the button would do. The
 * "Reactivate" word is owned by the toast/banner CTAs because the
 * action varies by role (owners can reactivate, family members
 * can't), but the on-button state copy is role-agnostic.
 *
 * Usage:
 *
 *   const { isLocked, onLockedClick } = useLockedAction()
 *   <button onClick={isLocked ? onLockedClick : actualHandler}>
 *     {isLocked && <LockClosedIcon />}
 *     {isLocked ? 'Paused — Add Patient' : 'Add Patient'}
 *   </button>
 *
 * No feature parameter — the gate is the same for every write
 * action. If a per-feature distinction ever becomes useful (e.g.,
 * grace-period writes for some specific actions),
 * lib/feature-access.ts grows back its FeatureKey shape; until
 * then, simple is the win.
 */

import { useRouter } from 'next/navigation'
import { handleWriteLocked } from '@/lib/access-guards'
import { useCanWrite } from './useFeatureAccess'

export interface LockedActionState {
  /** True when writes are blocked for this user. */
  isLocked: boolean
  /**
   * Click handler to use when isLocked. Routes through the
   * single source of truth in handleWriteLocked() — owners get
   * toast + /pricing redirect, family members (mirrored sub) get
   * an informational toast and stay where they are. Same UX as
   * the ops-layer guard.
   */
  onLockedClick: () => void
}

export function useLockedAction(): LockedActionState {
  const canWrite = useCanWrite()
  // useRouter retained for parity with prior signature in case a
  // future caller wants to route somewhere bespoke; the default
  // path now lives in handleWriteLocked.
  useRouter()
  const isLocked = !canWrite
  return {
    isLocked,
    onLockedClick: handleWriteLocked,
  }
}
