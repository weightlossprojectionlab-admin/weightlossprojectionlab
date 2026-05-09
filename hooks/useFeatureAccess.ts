'use client'

/**
 * useFeatureAccess — resolve the access state for a specific
 * action feature, given the current user's subscription.
 *
 * Usage in a component:
 *
 *   const access = useFeatureAccess('add_patient')
 *   if (access === 'locked') return <ReactivatePrompt />
 *   return <button disabled={access === 'read_only'}>...</button>
 *
 * Or: useFeatureAccess() with no arg returns a getter so a
 * single component checking many features doesn't subscribe
 * multiple times:
 *
 *   const access = useFeatureAccess()
 *   if (access('add_patient') === 'locked') ...
 *   if (access('log_meal') === 'locked') ...
 *
 * Why a hook on top of the predicate: components shouldn't
 * have to thread `subscription` everywhere or call
 * `useSubscription()` + import the predicate. The hook bundles
 * both into the contract a UI consumer cares about.
 */

import { useSubscription } from './useSubscription'
import { getFeatureAccess, type FeatureAccess, type FeatureKey } from '@/lib/feature-access'

/** Overload: no arg returns a getter for many features in one render. */
export function useFeatureAccess(): (feature: FeatureKey) => FeatureAccess
/** Overload: with a key returns the resolved access for that feature. */
export function useFeatureAccess(feature: FeatureKey): FeatureAccess
export function useFeatureAccess(
  feature?: FeatureKey,
): FeatureAccess | ((feature: FeatureKey) => FeatureAccess) {
  const { subscription } = useSubscription()
  if (feature === undefined) {
    return (f: FeatureKey) => getFeatureAccess(subscription, f)
  }
  return getFeatureAccess(subscription, feature)
}
