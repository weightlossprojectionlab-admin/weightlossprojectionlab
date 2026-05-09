'use client'

/**
 * useLockedAction — DRY helper for gating write buttons on
 * read-only (terminated) subscriptions.
 *
 * The pattern at every write surface:
 *   1. Check whether the current account can write
 *   2. If read-only, disable the button + show a lock icon +
 *      intercept click to toast + route to /pricing
 *   3. If writable, the original onClick fires
 *
 * Usage:
 *
 *   const { isLocked, onLockedClick } = useLockedAction()
 *   <button
 *     disabled={isLocked}
 *     onClick={isLocked ? onLockedClick : actualHandler}
 *   >
 *     {isLocked && <LockClosedIcon />}
 *     {isLocked ? 'Reactivate to add' : 'Add Patient'}
 *   </button>
 *
 * No feature parameter needed — the gate is the same for every
 * write action. If a per-feature distinction ever becomes useful
 * (e.g., grace-period writes for some specific actions),
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
