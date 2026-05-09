'use client'

/**
 * useCanWrite — boolean predicate. True when the user can perform
 * write actions; false when their subscription is read-only
 * (terminated). Wraps lib/feature-access.canWrite and the
 * useSubscription hook.
 *
 *   const canWrite = useCanWrite()
 *   <button disabled={!canWrite} onClick={...}>Save</button>
 *
 * For lock-icon affordance + toast + redirect, prefer
 * useLockedAction — this hook is for places where you only need
 * the boolean (e.g., to disable a form field, hide a section).
 *
 * useFeatureAccess is kept as a deprecated alias of useCanWrite for
 * any straggler imports during the simplification — remove the alias
 * in a follow-up cleanup.
 */

import { useSubscription } from './useSubscription'
import { canWrite, isReadOnly } from '@/lib/feature-access'

export function useCanWrite(): boolean {
  const { subscription } = useSubscription()
  return canWrite(subscription)
}

export function useIsReadOnly(): boolean {
  const { subscription } = useSubscription()
  return isReadOnly(subscription)
}

/**
 * @deprecated Use useCanWrite or useLockedAction. The FeatureKey
 * parameter is ignored — every write follows the same policy
 * (read-only when terminated). Kept temporarily to avoid breaking
 * any stragglers from the FeatureKey-era; clean up in a follow-up.
 */
export function useFeatureAccess(_feature?: string): 'full' | 'locked' {
  const isWritable = useCanWrite()
  return isWritable ? 'full' : 'locked'
}
