/**
 * Server-Side Usage Tracking
 *
 * Tracks per-user feature usage against plan limits using Firestore atomic counters.
 * Counters live at: users/{userId}/usageCounters/{period}
 *
 * Period format:
 *   - Monthly features (e.g. aiMealScans): "YYYY-MM"
 *   - Daily features (e.g. aiChatMessages): "YYYY-MM-DD"
 */

import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'

export type UsageFeature = 'aiMealScans' | 'aiChatMessages'

// Period granularity per feature
const FEATURE_PERIOD: Record<UsageFeature, 'monthly' | 'daily'> = {
  aiMealScans: 'monthly',
  aiChatMessages: 'daily'
}

// Plan limits — mirrors FREE_LIMITS / PREMIUM_LIMITS / FAMILY_LIMITS in monetization-triggers.ts
// Infinity = no enforcement (unlimited)
const PLAN_LIMITS: Record<string, Record<UsageFeature, number>> = {
  free: {
    aiMealScans: 10,
    aiChatMessages: 5
  },
  single: {
    aiMealScans: Infinity,
    aiChatMessages: 50
  },
  single_plus: {
    aiMealScans: Infinity,
    aiChatMessages: 50
  },
  family_basic: {
    aiMealScans: Infinity,
    aiChatMessages: 100
  },
  family_plus: {
    aiMealScans: Infinity,
    aiChatMessages: 100
  },
  family_premium: {
    aiMealScans: Infinity,
    aiChatMessages: Infinity
  }
}

function getPeriodKey(feature: UsageFeature): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  if (FEATURE_PERIOD[feature] === 'daily') {
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return `${year}-${month}`
}

function getLimitForPlan(plan: string, feature: UsageFeature): number {
  return (PLAN_LIMITS[plan] ?? PLAN_LIMITS.free)[feature]
}

/**
 * Check if the user is within their plan limit, then atomically increment if allowed.
 * Returns the check result with usage stats.
 *
 * Use this at the START of a feature call (check + reserve in one transaction).
 */
export async function checkAndIncrementUsage(
  userId: string,
  feature: UsageFeature,
  plan: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limit = getLimitForPlan(plan, feature)

  // Unlimited plans — skip Firestore entirely, just track for analytics
  if (limit === Infinity) {
    void incrementUsageOnly(userId, feature) // fire-and-forget analytics
    return { allowed: true, used: 0, limit: Infinity }
  }

  const periodKey = getPeriodKey(feature)
  const counterRef = adminDb
    .collection('users')
    .doc(userId)
    .collection('usageCounters')
    .doc(periodKey)

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(counterRef)
      const current: number = snap.exists ? (snap.data()?.[feature] ?? 0) : 0

      if (current >= limit) {
        return { allowed: false, used: current }
      }

      const newCount = current + 1
      if (snap.exists) {
        tx.update(counterRef, {
          [feature]: FieldValue.increment(1),
          updatedAt: new Date().toISOString()
        })
      } else {
        tx.set(counterRef, {
          [feature]: 1,
          period: periodKey,
          userId,
          updatedAt: new Date().toISOString()
        })
      }

      return { allowed: true, used: newCount }
    })

    return { ...result, limit }
  } catch (error) {
    // Fail open — don't block the user if Firestore is unavailable
    logger.error('[UsageTracking] Transaction failed, failing open', error as Error, { userId, feature })
    return { allowed: true, used: 0, limit }
  }
}

/**
 * Increment usage counter without checking the limit.
 * Use this for analytics-only tracking on features that are already gated elsewhere.
 */
export async function incrementUsageOnly(
  userId: string,
  feature: UsageFeature
): Promise<void> {
  const periodKey = getPeriodKey(feature)
  const counterRef = adminDb
    .collection('users')
    .doc(userId)
    .collection('usageCounters')
    .doc(periodKey)

  try {
    await counterRef.set(
      {
        [feature]: FieldValue.increment(1),
        period: periodKey,
        userId,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    )
  } catch (error) {
    // Non-critical — analytics failure should never block the user
    logger.warn('[UsageTracking] Failed to increment counter', { userId, feature, error: String(error) })
  }
}

/**
 * Get current usage for a user in the current period.
 * Used by settings/profile pages to display usage stats.
 */
export async function getUsage(
  userId: string,
  feature: UsageFeature
): Promise<{ used: number; limit: number; period: string; plan: string }> {
  const userDoc = await adminDb.collection('users').doc(userId).get()
  const plan: string = userDoc.data()?.subscription?.plan ?? 'free'
  const limit = getLimitForPlan(plan, feature)
  const periodKey = getPeriodKey(feature)

  const counterRef = adminDb
    .collection('users')
    .doc(userId)
    .collection('usageCounters')
    .doc(periodKey)

  const snap = await counterRef.get()
  const used: number = snap.exists ? (snap.data()?.[feature] ?? 0) : 0

  return { used, limit, period: periodKey, plan }
}
