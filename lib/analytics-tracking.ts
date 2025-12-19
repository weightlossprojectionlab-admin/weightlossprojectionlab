/**
 * Analytics Tracking for Conversion Funnels
 *
 * Comprehensive event tracking for onboarding flow, subscription conversions,
 * and user behavior analytics. Integrates with Google Analytics, Mixpanel,
 * or any analytics service.
 */

import { User, SubscriptionPlan } from '@/types'

export type OnboardingStep =
  | 'role_selection'
  | 'goals'
  | 'upgrade_prompt_shown'
  | 'upgrade_initiated'
  | 'upgrade_declined'
  | 'food_management'
  | 'logging_preference'
  | 'automation'
  | 'family_setup'
  | 'completed'

export interface AnalyticsEvent {
  eventName: string
  userId?: string
  timestamp: Date
  properties: Record<string, any>
}

export interface OnboardingStartedProperties {
  userId: string
  entryPoint: 'signup' | 'invitation' | 'manual'
  currentPlan: SubscriptionPlan
  hasExistingData: boolean
}

export interface OnboardingStepCompletedProperties {
  userId: string
  step: OnboardingStep
  stepNumber: number
  totalSteps: number
  progressPercentage: number
  answer?: any
  timeSpent?: number // milliseconds
}

export interface UpgradePromptShownProperties {
  userId: string
  currentPlan: SubscriptionPlan
  recommendedPlan: SubscriptionPlan
  blockedFeatures: string[]
  selectedGoals: string[]
  abTestVariant: 'control' | 'test'
}

export interface UpgradeInitiatedProperties {
  userId: string
  fromPlan: SubscriptionPlan
  toPlan: SubscriptionPlan
  billingInterval: 'monthly' | 'yearly'
  source: 'onboarding' | 'profile' | 'feature_gate' | 'banner'
  abTestVariant?: 'control' | 'test'
}

export interface OnboardingCompletedProperties {
  userId: string
  userMode: 'single' | 'household' | 'caregiver'
  selectedGoals: string[]
  finalPlan: SubscriptionPlan
  totalTimeSpent: number // milliseconds
  stepsCompleted: number
  sawUpgradePrompt: boolean
  upgradedDuringOnboarding: boolean
}

/**
 * Track onboarding started
 */
export function trackOnboardingStarted(
  properties: OnboardingStartedProperties
): void {
  track('Onboarding Started', properties)
}

/**
 * Track onboarding step completed
 */
export function trackOnboardingStepCompleted(
  properties: OnboardingStepCompletedProperties
): void {
  track('Onboarding Step Completed', properties)
}

/**
 * Track upgrade prompt shown
 */
export function trackUpgradePromptShown(
  properties: UpgradePromptShownProperties
): void {
  track('Upgrade Prompt Shown', properties)
}

/**
 * Track upgrade initiated
 */
export function trackUpgradeInitiated(
  properties: UpgradeInitiatedProperties
): void {
  track('Upgrade Initiated', properties)
}

/**
 * Track upgrade declined
 */
export function trackUpgradeDeclined(
  userId: string,
  currentPlan: SubscriptionPlan,
  recommendedPlan: SubscriptionPlan,
  reason?: string
): void {
  track('Upgrade Declined', {
    userId,
    currentPlan,
    recommendedPlan,
    reason,
  })
}

/**
 * Track onboarding completed
 */
export function trackOnboardingCompleted(
  properties: OnboardingCompletedProperties
): void {
  track('Onboarding Completed', properties)
}

/**
 * Track feature selection during onboarding
 */
export function trackFeatureSelected(
  userId: string,
  feature: string,
  available: boolean,
  currentPlan: SubscriptionPlan
): void {
  track('Feature Selected', {
    userId,
    feature,
    available,
    currentPlan,
    blocked: !available,
  })
}

/**
 * Track plan change
 */
export function trackPlanChange(
  userId: string,
  fromPlan: SubscriptionPlan,
  toPlan: SubscriptionPlan,
  source: string
): void {
  track('Plan Changed', {
    userId,
    fromPlan,
    toPlan,
    source,
  })
}

/**
 * Core tracking function
 * Sends events to analytics service (Google Analytics, Mixpanel, etc.)
 */
function track(eventName: string, properties: Record<string, any>): void {
  const event: AnalyticsEvent = {
    eventName,
    userId: properties.userId,
    timestamp: new Date(),
    properties,
  }

  // Console logging for development
  console.log('[Analytics]', eventName, properties)

  // Client-side only
  if (typeof window === 'undefined') return

  // Google Analytics (gtag.js)
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, properties)
  }

  // Mixpanel
  if (typeof window.mixpanel !== 'undefined') {
    window.mixpanel.track(eventName, properties)
  }

  // Custom analytics endpoint (optional)
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    sendToAnalyticsEndpoint(event)
  }
}

/**
 * Send event to custom analytics endpoint
 */
async function sendToAnalyticsEndpoint(event: AnalyticsEvent): Promise<void> {
  try {
    await fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })
  } catch (error) {
    console.error('Error sending analytics event:', error)
  }
}

/**
 * Identify user for analytics
 */
export function identifyUser(user: User): void {
  if (typeof window === 'undefined') return

  const userProperties = {
    userId: user.uid,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  }

  console.log('[Analytics] Identify User', userProperties)

  // Google Analytics
  if (typeof window.gtag === 'function') {
    window.gtag('set', 'user_properties', {
      user_id: user.uid,
    })
  }

  // Mixpanel
  if (typeof window.mixpanel !== 'undefined') {
    window.mixpanel.identify(user.uid)
    window.mixpanel.people.set(userProperties)
  }
}

/**
 * Track page view
 */
export function trackPageView(
  page: string,
  properties?: Record<string, any>
): void {
  if (typeof window === 'undefined') return

  console.log('[Analytics] Page View', page, properties)

  // Google Analytics
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: page,
      ...properties,
    })
  }

  // Mixpanel
  if (typeof window.mixpanel !== 'undefined') {
    window.mixpanel.track('Page View', {
      page,
      ...properties,
    })
  }
}

/**
 * Track conversion funnel step
 */
export function trackFunnelStep(
  funnelName: string,
  stepName: string,
  stepNumber: number,
  properties?: Record<string, any>
): void {
  track('Funnel Step', {
    funnel: funnelName,
    step: stepName,
    stepNumber,
    ...properties,
  })
}

/**
 * Track time spent on step
 */
export function trackTimeOnStep(
  step: string,
  duration: number,
  userId?: string
): void {
  track('Time On Step', {
    step,
    duration,
    userId,
  })
}

/**
 * Track error
 */
export function trackError(
  errorName: string,
  errorMessage: string,
  context?: Record<string, any>
): void {
  track('Error', {
    errorName,
    errorMessage,
    ...context,
  })
}

/**
 * Conversion funnel helper
 * Tracks user progress through a multi-step funnel
 */
export class ConversionFunnel {
  private funnelName: string
  private steps: string[]
  private userId?: string
  private startTime?: number
  private stepStartTime?: number
  private currentStepIndex: number = 0

  constructor(funnelName: string, steps: string[], userId?: string) {
    this.funnelName = funnelName
    this.steps = steps
    this.userId = userId
  }

  /**
   * Start the funnel
   */
  start(): void {
    this.startTime = Date.now()
    this.stepStartTime = Date.now()
    trackFunnelStep(this.funnelName, this.steps[0], 0, {
      userId: this.userId,
      action: 'started',
    })
  }

  /**
   * Complete current step and move to next
   */
  nextStep(properties?: Record<string, any>): void {
    if (this.stepStartTime) {
      const timeSpent = Date.now() - this.stepStartTime
      trackTimeOnStep(this.steps[this.currentStepIndex], timeSpent, this.userId)
    }

    this.currentStepIndex++
    if (this.currentStepIndex >= this.steps.length) {
      this.complete(properties)
      return
    }

    this.stepStartTime = Date.now()
    trackFunnelStep(
      this.funnelName,
      this.steps[this.currentStepIndex],
      this.currentStepIndex,
      {
        userId: this.userId,
        action: 'entered',
        ...properties,
      }
    )
  }

  /**
   * Complete the entire funnel
   */
  complete(properties?: Record<string, any>): void {
    const totalTime = this.startTime ? Date.now() - this.startTime : 0
    track('Funnel Completed', {
      funnel: this.funnelName,
      userId: this.userId,
      totalTime,
      stepsCompleted: this.currentStepIndex + 1,
      ...properties,
    })
  }

  /**
   * Abandon the funnel
   */
  abandon(reason?: string): void {
    const totalTime = this.startTime ? Date.now() - this.startTime : 0
    track('Funnel Abandoned', {
      funnel: this.funnelName,
      userId: this.userId,
      abandonedAt: this.steps[this.currentStepIndex],
      stepNumber: this.currentStepIndex,
      totalTime,
      reason,
    })
  }
}

/**
 * Type augmentation for global window object
 */
declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    mixpanel?: any
  }
}
