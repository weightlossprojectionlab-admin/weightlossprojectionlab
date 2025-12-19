/**
 * Subscription Analytics Tracking
 *
 * Tracks subscription-related events and metrics for business intelligence.
 * Captures feature access patterns, seat utilization, upgrade prompts, and conversion events.
 *
 * IMPORTANT: All analytics tracking is asynchronous and non-blocking.
 * Analytics failures should never impact user experience.
 */

import { SubscriptionPlan, User } from '@/types'

/**
 * Feature access event - tracks when users attempt to access features
 */
export interface FeatureAccessEvent {
  /** User ID attempting access */
  userId: string

  /** Technical feature name being accessed */
  feature: string

  /** User's current subscription plan */
  plan: SubscriptionPlan

  /** Whether access was granted or denied */
  accessGranted: boolean

  /** Timestamp of the access attempt */
  timestamp: Date

  /** Optional context about where/how feature was accessed */
  context?: {
    /** Source of the access attempt (e.g., 'dashboard', 'settings', 'onboarding') */
    source?: string

    /** User agent string */
    userAgent?: string

    /** Platform (web, ios, android) */
    platform?: string
  }

  /** Optional upgrade prompt shown if access denied */
  upgradePromptShown?: boolean
}

/**
 * Seat utilization event - tracks when seats are added/removed
 */
export interface SeatUtilizationEvent {
  /** User ID (account owner) */
  userId: string

  /** Current subscription plan */
  plan: SubscriptionPlan

  /** Event type */
  action: 'seat-added' | 'seat-removed'

  /** Number of seats after this action */
  currentSeats: number

  /** Maximum seats allowed by plan */
  maxSeats: number

  /** Utilization percentage (0-100) */
  utilizationPercentage: number

  /** Timestamp of the event */
  timestamp: Date

  /** Additional context */
  context?: {
    /** Person/patient name (anonymized if needed) */
    patientName?: string

    /** Relationship (self, family, pet, etc.) */
    relationship?: string

    /** Whether this action triggered a limit warning */
    limitWarningTriggered?: boolean
  }
}

/**
 * Caregiver utilization event - tracks when caregivers are added/removed
 */
export interface CaregiverUtilizationEvent {
  /** User ID (account owner) */
  userId: string

  /** Current subscription plan */
  plan: SubscriptionPlan

  /** Event type */
  action: 'caregiver-added' | 'caregiver-removed'

  /** Number of external caregivers after this action */
  currentCaregivers: number

  /** Maximum caregivers allowed by plan */
  maxCaregivers: number

  /** Utilization percentage (0-100) */
  utilizationPercentage: number

  /** Timestamp of the event */
  timestamp: Date

  /** Additional context */
  context?: {
    /** Caregiver role/type */
    caregiverRole?: string

    /** Whether this action triggered a limit warning */
    limitWarningTriggered?: boolean

    /** Invitation method (email, link, qr-code) */
    invitationMethod?: string
  }
}

/**
 * Upgrade prompt event - tracks when upgrade prompts are shown
 */
export interface UpgradePromptEvent {
  /** User ID */
  userId: string

  /** Current plan */
  currentPlan: SubscriptionPlan

  /** Recommended plan to upgrade to */
  recommendedPlan: SubscriptionPlan

  /** Reason for the upgrade prompt */
  reason:
    | 'feature-locked'
    | 'seat-limit'
    | 'caregiver-limit'
    | 'approaching-limit'
    | 'promotional'

  /** Specific feature that triggered the prompt (if applicable) */
  blockedFeature?: string

  /** Timestamp of the prompt */
  timestamp: Date

  /** Where the prompt was shown */
  promptLocation: string

  /** User's response to the prompt */
  userResponse?: 'dismissed' | 'clicked-upgrade' | 'clicked-learn-more' | 'no-interaction'

  /** Time spent viewing the prompt (milliseconds) */
  viewDuration?: number
}

/**
 * Subscription change event - tracks plan upgrades/downgrades
 */
export interface SubscriptionChangeEvent {
  /** User ID */
  userId: string

  /** Previous plan */
  fromPlan: SubscriptionPlan

  /** New plan */
  toPlan: SubscriptionPlan

  /** Change type */
  changeType: 'upgrade' | 'downgrade' | 'trial-conversion'

  /** Billing interval */
  billingInterval: 'monthly' | 'yearly'

  /** Revenue impact (in cents) */
  revenueImpact: number

  /** Timestamp of the change */
  timestamp: Date

  /** Attribution data */
  attribution?: {
    /** Last upgrade prompt shown */
    lastPromptReason?: string

    /** Time since last prompt (milliseconds) */
    timeSincePrompt?: number

    /** Source of conversion */
    source?: string
  }
}

/**
 * Plan limit event - tracks when users hit plan limits
 */
export interface PlanLimitEvent {
  /** User ID */
  userId: string

  /** Current plan */
  plan: SubscriptionPlan

  /** Type of limit hit */
  limitType: 'seats' | 'caregivers' | 'feature'

  /** Timestamp of the event */
  timestamp: Date

  /** Current usage vs limit */
  usage: {
    current: number
    max: number
  }

  /** Whether user was shown upgrade prompt */
  upgradePromptShown: boolean

  /** User action after hitting limit */
  userAction?: 'upgraded' | 'dismissed' | 'removed-resource' | 'pending'
}

/**
 * Track feature access event
 * Non-blocking - failures are logged but don't throw
 *
 * @param event - Feature access event data
 *
 * @example
 * trackFeatureAccess({
 *   userId: user.id,
 *   feature: 'enhanced-ai-coaching',
 *   plan: 'family_basic',
 *   accessGranted: false,
 *   timestamp: new Date(),
 *   upgradePromptShown: true
 * })
 */
export function trackFeatureAccess(event: FeatureAccessEvent): void {
  try {
    // Send to analytics backend (placeholder)
    console.log('[Analytics] Feature Access:', event)

    // In production, this would send to:
    // - Firebase Analytics
    // - Mixpanel
    // - Amplitude
    // - Custom analytics pipeline

    // Example implementation:
    // if (typeof window !== 'undefined' && window.analytics) {
    //   window.analytics.track('Feature Access', {
    //     feature: event.feature,
    //     plan: event.plan,
    //     access_granted: event.accessGranted,
    //     upgrade_prompt_shown: event.upgradePromptShown,
    //     ...event.context
    //   })
    // }
  } catch (error) {
    console.error('[Analytics] Failed to track feature access:', error)
    // Swallow error - analytics should never break functionality
  }
}

/**
 * Track seat utilization event
 * Non-blocking - failures are logged but don't throw
 *
 * @param event - Seat utilization event data
 *
 * @example
 * trackSeatUtilization({
 *   userId: user.id,
 *   plan: 'family_plus',
 *   action: 'seat-added',
 *   currentSeats: 8,
 *   maxSeats: 10,
 *   utilizationPercentage: 80,
 *   timestamp: new Date()
 * })
 */
export function trackSeatUtilization(event: SeatUtilizationEvent): void {
  try {
    console.log('[Analytics] Seat Utilization:', event)

    // Track high utilization for proactive upgrade recommendations
    if (event.utilizationPercentage >= 80) {
      console.log(
        `[Analytics] High seat utilization detected: ${event.utilizationPercentage}%`
      )
    }

    // In production, send to analytics backend
  } catch (error) {
    console.error('[Analytics] Failed to track seat utilization:', error)
  }
}

/**
 * Track caregiver utilization event
 * Non-blocking - failures are logged but don't throw
 *
 * @param event - Caregiver utilization event data
 */
export function trackCaregiverUtilization(event: CaregiverUtilizationEvent): void {
  try {
    console.log('[Analytics] Caregiver Utilization:', event)

    // Track high utilization for proactive upgrade recommendations
    if (event.utilizationPercentage >= 80) {
      console.log(
        `[Analytics] High caregiver utilization detected: ${event.utilizationPercentage}%`
      )
    }

    // In production, send to analytics backend
  } catch (error) {
    console.error('[Analytics] Failed to track caregiver utilization:', error)
  }
}

/**
 * Track upgrade prompt event
 * Non-blocking - failures are logged but don't throw
 *
 * @param event - Upgrade prompt event data
 *
 * @example
 * trackUpgradePrompt({
 *   userId: user.id,
 *   currentPlan: 'family_basic',
 *   recommendedPlan: 'family_plus',
 *   reason: 'seat-limit',
 *   timestamp: new Date(),
 *   promptLocation: 'add-family-member-modal'
 * })
 */
export function trackUpgradePrompt(event: UpgradePromptEvent): void {
  try {
    console.log('[Analytics] Upgrade Prompt:', event)

    // In production, send to analytics backend
    // Track conversion funnel: prompt shown -> clicked -> upgraded
  } catch (error) {
    console.error('[Analytics] Failed to track upgrade prompt:', error)
  }
}

/**
 * Track subscription change event
 * Non-blocking - failures are logged but don't throw
 *
 * @param event - Subscription change event data
 *
 * @example
 * trackSubscriptionChange({
 *   userId: user.id,
 *   fromPlan: 'family_basic',
 *   toPlan: 'family_plus',
 *   changeType: 'upgrade',
 *   billingInterval: 'monthly',
 *   revenueImpact: 1000,
 *   timestamp: new Date()
 * })
 */
export function trackSubscriptionChange(event: SubscriptionChangeEvent): void {
  try {
    console.log('[Analytics] Subscription Change:', event)

    // Critical event - send to multiple analytics services
    // Also trigger revenue tracking, customer success notifications, etc.

    // In production:
    // - Update revenue metrics
    // - Trigger customer success workflows
    // - Send to data warehouse
    // - Update cohort analysis
  } catch (error) {
    console.error('[Analytics] Failed to track subscription change:', error)
  }
}

/**
 * Track plan limit event
 * Non-blocking - failures are logged but don't throw
 *
 * @param event - Plan limit event data
 */
export function trackPlanLimit(event: PlanLimitEvent): void {
  try {
    console.log('[Analytics] Plan Limit Hit:', event)

    // Critical conversion point - user hitting limits is high-intent for upgrade
    // In production, trigger real-time upgrade recommendations

  } catch (error) {
    console.error('[Analytics] Failed to track plan limit:', error)
  }
}

/**
 * Aggregate analytics helper - calculate metrics over time periods
 */
export interface AnalyticsMetrics {
  /** Time period for these metrics */
  period: {
    start: Date
    end: Date
  }

  /** Feature access metrics */
  featureAccess: {
    totalAttempts: number
    successfulAccesses: number
    deniedAccesses: number
    topFeatures: Array<{ feature: string; count: number }>
    conversionRate: number // % of denied accesses that led to upgrades
  }

  /** Seat utilization metrics */
  seatUtilization: {
    averageUtilization: number // across all users
    highUtilizationUsers: number // users >= 80%
    seatsAdded: number
    seatsRemoved: number
  }

  /** Upgrade metrics */
  upgrades: {
    totalUpgrades: number
    totalDowngrades: number
    trialConversions: number
    revenueImpact: number
    topUpgradeReasons: Array<{ reason: string; count: number }>
  }
}

/**
 * Calculate analytics metrics for a time period
 * (Placeholder - actual implementation would query analytics database)
 *
 * @param startDate - Start of time period
 * @param endDate - End of time period
 * @returns Aggregated metrics
 */
export async function calculateMetrics(
  startDate: Date,
  endDate: Date
): Promise<AnalyticsMetrics> {
  console.warn('[Analytics] calculateMetrics is a placeholder')

  // In production, this would:
  // 1. Query analytics database
  // 2. Aggregate events by type
  // 3. Calculate derived metrics
  // 4. Return structured data for dashboards

  return {
    period: { start: startDate, end: endDate },
    featureAccess: {
      totalAttempts: 0,
      successfulAccesses: 0,
      deniedAccesses: 0,
      topFeatures: [],
      conversionRate: 0,
    },
    seatUtilization: {
      averageUtilization: 0,
      highUtilizationUsers: 0,
      seatsAdded: 0,
      seatsRemoved: 0,
    },
    upgrades: {
      totalUpgrades: 0,
      totalDowngrades: 0,
      trialConversions: 0,
      revenueImpact: 0,
      topUpgradeReasons: [],
    },
  }
}

/**
 * Get user-specific analytics
 * Returns analytics data for a specific user (for admin/support use)
 *
 * @param userId - User ID
 * @returns User analytics data
 */
export async function getUserAnalytics(userId: string): Promise<{
  featureAccessHistory: FeatureAccessEvent[]
  seatUtilizationHistory: SeatUtilizationEvent[]
  upgradePromptHistory: UpgradePromptEvent[]
  subscriptionHistory: SubscriptionChangeEvent[]
}> {
  console.warn('[Analytics] getUserAnalytics is a placeholder')

  // In production, query analytics database for user-specific events
  return {
    featureAccessHistory: [],
    seatUtilizationHistory: [],
    upgradePromptHistory: [],
    subscriptionHistory: [],
  }
}

/**
 * Helper: Create feature access event from user action
 *
 * @param user - Current user
 * @param feature - Feature being accessed
 * @param accessGranted - Whether access was granted
 * @param context - Additional context
 */
export function createFeatureAccessEvent(
  user: User,
  feature: string,
  accessGranted: boolean,
  context?: FeatureAccessEvent['context']
): FeatureAccessEvent {
  return {
    userId: user.id,
    feature,
    plan: user.subscription?.plan || 'free',
    accessGranted,
    timestamp: new Date(),
    context,
  }
}

/**
 * Helper: Create seat utilization event
 *
 * @param user - Current user
 * @param action - Seat action
 * @param currentSeats - Current seat count
 * @param maxSeats - Max seats allowed
 * @param context - Additional context
 */
export function createSeatUtilizationEvent(
  user: User,
  action: SeatUtilizationEvent['action'],
  currentSeats: number,
  maxSeats: number,
  context?: SeatUtilizationEvent['context']
): SeatUtilizationEvent {
  const utilizationPercentage = maxSeats > 0 ? Math.round((currentSeats / maxSeats) * 100) : 0

  return {
    userId: user.id,
    plan: user.subscription?.plan || 'free',
    action,
    currentSeats,
    maxSeats,
    utilizationPercentage,
    timestamp: new Date(),
    context,
  }
}

/**
 * Helper: Create upgrade prompt event
 *
 * @param user - Current user
 * @param recommendedPlan - Plan to upgrade to
 * @param reason - Reason for upgrade prompt
 * @param promptLocation - Where prompt is shown
 */
export function createUpgradePromptEvent(
  user: User,
  recommendedPlan: SubscriptionPlan,
  reason: UpgradePromptEvent['reason'],
  promptLocation: string,
  blockedFeature?: string
): UpgradePromptEvent {
  return {
    userId: user.id,
    currentPlan: user.subscription?.plan || 'free',
    recommendedPlan,
    reason,
    blockedFeature,
    timestamp: new Date(),
    promptLocation,
  }
}
