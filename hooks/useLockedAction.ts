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
import toast from 'react-hot-toast'
import { useCanWrite } from './useFeatureAccess'

export interface LockedActionState {
  /** True when writes are blocked for this user. */
  isLocked: boolean
  /** Click handler to use when isLocked — toasts + routes to /pricing. */
  onLockedClick: () => void
}

export function useLockedAction(): LockedActionState {
  const canWrite = useCanWrite()
  const router = useRouter()
  const isLocked = !canWrite
  return {
    isLocked,
    onLockedClick: () => {
      toast(
        'Your subscription is read-only. Reactivate to keep building your data.',
        { icon: '🔒', duration: 4000 },
      )
      router.push('/pricing')
    },
  }
}
