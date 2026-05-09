'use client'

/**
 * useLockedAction — DRY helper for gating create/edit/delete buttons
 * on terminated subscriptions.
 *
 * The pattern repeats at every action surface:
 *   1. Check feature access
 *   2. If 'locked', disable the button + show a lock icon + intercept
 *      click to route the user to /pricing (with a toast cue)
 *   3. If 'full', the original onClick fires
 *
 * Without this hook, that's 4-5 lines at every call site. With it,
 * usage is:
 *
 *   const { isLocked, onLockedClick } = useLockedAction('add_patient')
 *   <button
 *     disabled={isLocked}
 *     onClick={isLocked ? onLockedClick : handleAdd}
 *   >
 *     {isLocked && <LockClosedIcon className="w-4 h-4" />}
 *     Add Patient
 *   </button>
 *
 * The toast + redirect is consistent across surfaces — one copy of
 * the reactivation message, one source of /pricing routing.
 *
 * Note: this only handles 'locked' state. 'read_only' (editors of
 * existing data) needs different UI treatment (form opens, Save
 * button locks) and should be wired per-surface via useFeatureAccess
 * directly.
 */

import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useFeatureAccess } from './useFeatureAccess'
import type { FeatureKey } from '@/lib/feature-access'

export interface LockedActionState {
  /** True when the feature is 'locked' for this user. */
  isLocked: boolean
  /** Click handler to use when isLocked — toasts + routes to /pricing. */
  onLockedClick: () => void
}

export function useLockedAction(feature: FeatureKey): LockedActionState {
  const access = useFeatureAccess(feature)
  const router = useRouter()
  const isLocked = access === 'locked'
  return {
    isLocked,
    onLockedClick: () => {
      toast(
        'Your subscription has ended. Reactivate to keep building your data.',
        { icon: '🔒', duration: 4000 },
      )
      router.push('/pricing')
    },
  }
}
