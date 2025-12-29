# Subscription Policies Implementation

## Overview

This document outlines the platform-wide subscription policies that align with the FAQ shown in the screenshot. All subscription tiers follow these consistent policies.

## Implemented FAQ Policies

### 1. 7-Day Free Trial (No Credit Card Required)

**Policy**: Users get full access to all features of their selected plan for 7 days without entering a credit card.

**Implementation**:
- **Configuration**: `lib/subscription-policies.ts`
  - `TRIAL_POLICY.DURATION_DAYS = 7`
  - `TRIAL_POLICY.REQUIRES_PAYMENT_METHOD = false`
  - `TRIAL_POLICY.FULL_FEATURE_ACCESS = true`

- **API**: `app/api/subscription/start-trial/route.ts`
  - POST endpoint to start trial
  - No Stripe checkout required
  - Firestore-only subscription creation
  - Sets status to 'trialing'
  - Calculates trialEndsAt date

- **Plan-Specific Configs**: Each plan (free, single, single_plus, family_basic, family_plus, family_premium) has:
  - 7-day trial duration
  - No payment method requirement
  - Full access to plan features

### 2. Cancel Anytime (Retain Access Until Period End)

**Policy**: Users can cancel their subscription at any time from account settings and will retain access until the end of their current billing period.

**Implementation**:
- **Configuration**: `lib/subscription-policies.ts`
  - `CANCELLATION_POLICY.ALLOWED_ANYTIME = true`
  - `CANCELLATION_POLICY.RETAIN_ACCESS_UNTIL_PERIOD_END = true`
  - `CANCELLATION_POLICY.PRORATED_REFUND = false`
  - `CANCELLATION_POLICY.CAN_REACTIVATE_BEFORE_PERIOD_END = true`

- **API**: `app/api/subscription/cancel/route.ts`
  - POST endpoint to cancel subscription
  - Trial cancellations: Immediate effect
  - Paid subscriptions: Sets `cancel_at_period_end = true` in Stripe
  - Updates Firestore status to 'canceled' but retains currentPeriodEnd
  - User keeps access until currentPeriodEnd

- **Webhook Handler**: `app/api/stripe/webhook/route.ts`
  - `handleSubscriptionCanceledAtPeriodEnd()`: Handles cancel_at_period_end event
  - `handleSubscriptionDeleted()`: Only expires when period actually ends

### 3. Plan Changes (Upgrades Immediate, Downgrades End of Cycle)

**Policy**:
- **Upgrades**: Take effect immediately with prorated billing
- **Downgrades**: Take effect at the end of the current billing cycle

**Implementation**:
- **Configuration**: `lib/subscription-policies.ts`
  - `PLAN_CHANGE_POLICY.ALLOWED_ANYTIME = true`
  - `PLAN_CHANGE_POLICY.UPGRADE_TIMING = 'immediate'`
  - `PLAN_CHANGE_POLICY.DOWNGRADE_TIMING = 'end_of_cycle'`
  - `PLAN_CHANGE_POLICY.PRORATION_ENABLED = true`

- **API**: `app/api/subscription/change-plan/route.ts`
  - POST endpoint to change plans
  - Detects upgrade vs downgrade using plan ranking
  - **Upgrades**:
    - Updates Stripe subscription immediately
    - Sets `proration_behavior = 'create_prorations'`
    - Charges prorated amount
    - Updates Firestore immediately
  - **Downgrades**:
    - Schedules change in Stripe for next billing cycle
    - Sets `proration_behavior = 'none'`
    - Stores `scheduledPlan` and `scheduledChangeDate` in Firestore
    - Change applies at currentPeriodEnd

### 4. Trial Expiry Reminders & Payment Requirements

**Policy**: After the 7-day trial ends, users must add payment to continue. Reminders are sent before trial expiry.

**Implementation**:
- **Configuration**: `lib/subscription-policies.ts`
  - `TRIAL_POLICY.REMINDER_DAYS_BEFORE_EXPIRY = [3, 1]`
  - `POST_TRIAL_POLICY.REQUIRE_PAYMENT_TO_CONTINUE = true`
  - `POST_TRIAL_POLICY.SEND_REMINDERS = true`
  - `POST_TRIAL_POLICY.BLOCK_ACCESS_AFTER_EXPIRY = true`
  - `POST_TRIAL_POLICY.GRACE_PERIOD_HOURS = 24`

- **Cloud Functions**: `functions/subscription/trialExpiration.ts`
  - **sendTrialExpiryReminders()**:
    - Runs daily at 9 AM UTC
    - Sends reminders 3 days and 1 day before expiry
    - Creates in-app notifications
  - **expireTrialSubscriptions()**:
    - Runs daily at midnight UTC
    - Expires trials that have ended
    - Sets status to 'expired'
    - Creates expiration notifications

## Plan-Specific Trial Configurations

All plans follow the same trial policy but with plan-specific features:

| Plan | Trial Days | Payment Required | Max Seats | Max Caregivers | Max Households |
|------|-----------|------------------|-----------|----------------|----------------|
| **Free** | 7 | No | 1 | 0 | 1 |
| **Single** | 7 | No | 1 | 0 | 1 |
| **Single Plus** | 7 | No | 1 | 3 | 2 |
| **Family Basic** | 7 | No | 5 | 5 | 3 |
| **Family Plus** | 7 | No | 10 | 10 | 5 |
| **Family Premium** | 7 | No | 999 | 999 | 999 |

## User Interface

**Component**: `components/subscription/SubscriptionManager.tsx`

Features:
- Displays current plan and status
- Shows trial countdown with visual indicators
- Displays cancellation message with access retention info
- Shows plan change messaging (immediate for upgrades, end-of-cycle for downgrades)
- Embedded FAQ section with expandable answers
- Manage billing button (opens Stripe Customer Portal)
- Cancel subscription button with confirmation modal
- Change plan button with plan selection

## Helper Functions

**File**: `lib/subscription-policies.ts`

Key functions:
- `isInTrialPeriod()`: Check if user is currently trialing
- `isTrialExpiringSoon()`: Check if trial ends within reminder window
- `getDaysRemainingInTrial()`: Calculate days left in trial
- `isUpgrade()` / `isDowngrade()`: Determine plan change direction
- `getPlanChangeTiming()`: Get timing for plan change
- `canCancelSubscription()`: Check if subscription can be canceled
- `retainsAccessAfterCancellation()`: Check if user still has access
- `getTrialStatusMessage()`: User-friendly trial status message
- `getCancellationMessage()`: User-friendly cancellation message
- `getPlanChangeMessage()`: User-friendly plan change message

## API Endpoints

### Trial Management
- **POST** `/api/subscription/start-trial`
  - Start 7-day trial (no payment required)
  - Body: `{ plan: SubscriptionPlan }`
  - Response: Trial subscription details

### Subscription Management
- **POST** `/api/subscription/cancel`
  - Cancel subscription (retain access until period end)
  - Auth: Bearer token required
  - Response: Cancellation confirmation with access end date

- **POST** `/api/subscription/change-plan`
  - Change subscription plan
  - Body: `{ newPlan: SubscriptionPlan, newPriceId: string }`
  - Response: Plan change confirmation with timing

### Billing Portal
- **POST** `/api/stripe/create-portal-session`
  - Create Stripe Customer Portal session
  - Body: `{ returnUrl: string }`
  - Response: Portal URL

## Cloud Functions

### Trial Reminders
- **Function**: `sendTrialExpiryReminders`
- **Schedule**: Daily at 9 AM UTC
- **Actions**:
  - Find trials expiring in 3 days
  - Find trials expiring in 1 day
  - Create in-app notifications for users
  - Log reminder activity

### Trial Expiration
- **Function**: `expireTrialSubscriptions`
- **Schedule**: Daily at midnight UTC
- **Actions**:
  - Find expired trials
  - Set status to 'expired'
  - Create expiration notifications
  - Block access to platform

## Stripe Webhook Events

**File**: `app/api/stripe/webhook/route.ts`

Handled events:
- `checkout.session.completed`: New subscription created
- `customer.subscription.created`: Subscription initialized
- `customer.subscription.updated`: Subscription modified (includes cancel_at_period_end)
- `customer.subscription.deleted`: Subscription fully ended (after period)
- `invoice.payment_succeeded`: Payment successful (renew subscription)
- `invoice.payment_failed`: Payment failed (mark past_due)

## Data Model

**Firestore** `users/{uid}/subscription`:
```typescript
{
  plan: SubscriptionPlan
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'
  billingInterval: 'monthly' | 'yearly'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  trialEndsAt?: Date
  canceledAt?: Date
  cancelAtPeriodEnd?: boolean
  scheduledPlan?: SubscriptionPlan
  scheduledPlanPriceId?: string
  scheduledChangeDate?: Date
  maxSeats: number
  currentSeats: number
  maxExternalCaregivers: number
  currentExternalCaregivers: number
  maxHouseholds: number
  currentHouseholds: number
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
}
```

## Testing Checklist

- [ ] Start 7-day trial without payment method
- [ ] Verify full feature access during trial
- [ ] Receive reminder 3 days before trial ends
- [ ] Receive reminder 1 day before trial ends
- [ ] Trial expires after 7 days
- [ ] Access blocked when trial expires
- [ ] Cancel paid subscription (verify access retained)
- [ ] Access ends at currentPeriodEnd after cancellation
- [ ] Upgrade plan (verify immediate effect and proration)
- [ ] Downgrade plan (verify scheduled for end of cycle)
- [ ] Downgrade applies at next billing cycle
- [ ] View subscription in account settings
- [ ] Manage billing via Stripe Portal
- [ ] FAQ displays correct information

## Migration Notes

Existing users may need migration if they:
- Have active trials without trialEndsAt
- Have canceled subscriptions without currentPeriodEnd
- Have scheduled plan changes in old format

Migration script location: `scripts/migrate-subscription-policies.ts` (to be created if needed)

## Environment Variables

Required:
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key
- `NEXT_PUBLIC_APP_URL`: App base URL for redirects

## Deployment

1. Deploy cloud functions: `firebase deploy --only functions:sendTrialExpiryReminders,functions:expireTrialSubscriptions`
2. Configure Stripe webhooks to point to `/api/stripe/webhook`
3. Test webhook events in Stripe dashboard
4. Update Stripe Customer Portal settings for cancellation flow
5. Deploy Next.js app with new API routes

## Support & Documentation

- User-facing FAQ: Displayed in `SubscriptionManager` component
- Admin documentation: This file
- Stripe documentation: https://stripe.com/docs/billing/subscriptions
- Policy reference: `lib/subscription-policies.ts`
