# Stripe Integration Summary

## Overview

✅ **All subscription policies are fully integrated with your existing Stripe setup**

The implementation adds FAQ-aligned policies **on top of** your existing Stripe infrastructure, not as a replacement. Everything works through Stripe subscriptions, Stripe webhooks, and Stripe Customer Portal.

## How Stripe is Used

### 1. **Trial Period (7 Days, No Credit Card)**

**Current Stripe Setup**: You have Stripe configured with price IDs for all plans

**What Changed**:
- ✅ Trial starts **without** creating a Stripe subscription initially
- ✅ Trial stored in Firestore with `status: 'trialing'` and `trialEndsAt`
- ✅ After trial, user clicks "Add Payment" → Goes to Stripe Checkout
- ✅ Stripe Checkout creates subscription and charges user

**Why This Works**:
- Stripe doesn't require payment method for trials
- We track trial in Firestore, then convert to Stripe subscription when user pays
- This is the standard pattern for "no credit card" trials

### 2. **Cancellation (Retain Access Until Period End)**

**Current Stripe Setup**: You have webhooks at `/api/stripe/webhook`

**What Changed**:
- ✅ Uses Stripe's `cancel_at_period_end` flag (standard Stripe feature)
- ✅ Webhook handler updated to handle `cancel_at_period_end` event
- ✅ User keeps access until `currentPeriodEnd` (managed by Stripe)

**Stripe Events Used**:
- `customer.subscription.updated` (when `cancel_at_period_end = true`)
- `customer.subscription.deleted` (when period actually ends)

### 3. **Plan Changes (Upgrades Immediate, Downgrades End of Cycle)**

**Current Stripe Setup**: You have price IDs for all plans/intervals

**What Changed**:
- ✅ **Upgrades**: Uses Stripe's `proration_behavior: 'create_prorations'` (immediate charge)
- ✅ **Downgrades**: Uses Stripe's scheduled subscription changes (applies at period end)
- ✅ All billing logic handled by Stripe automatically

**Stripe Features Used**:
- Subscription updates with proration
- Scheduled subscription changes
- Automatic billing adjustments

### 4. **Payment After Trial**

**Current Stripe Setup**: You have Stripe Checkout configured

**What Changed**:
- ✅ Trial users redirected to Stripe Checkout when they click "Add Payment"
- ✅ Checkout creates new Stripe subscription
- ✅ Webhook syncs subscription status to Firestore

**Flow**:
1. User starts trial (Firestore only)
2. Trial expires → User prompted to add payment
3. User clicks "Add Payment" → Stripe Checkout
4. Stripe creates subscription → Webhook fires
5. Firestore subscription updated to `status: 'active'`

## Stripe Price ID Mapping

**File**: `lib/stripe-price-mapping.ts`

Maps your environment variables to plans:

```typescript
// Environment Variables (from .env.example)
STRIPE_PRICE_SINGLE_MONTHLY=price_xxx
STRIPE_PRICE_SINGLE_YEARLY=price_yyy
STRIPE_PRICE_FAMILY_PLUS_MONTHLY=price_zzz
// ... etc

// Function to get price ID
getStripePriceId('single', 'monthly') → 'price_xxx'
getStripePriceId('family_plus', 'yearly') → 'price_aaa'
```

This centralizes all price ID lookups across the platform.

## API Endpoints That Use Stripe

### `/api/subscription/start-trial` (NEW)
- **Stripe Used**: No (Firestore only)
- **Purpose**: Start 7-day trial without payment
- **Next Step**: User goes to Stripe Checkout after trial

### `/api/subscription/cancel` (NEW)
- **Stripe Used**: Yes - `stripe.subscriptions.update()`
- **Action**: Sets `cancel_at_period_end: true`
- **Result**: User keeps access until period end (Stripe manages this)

### `/api/subscription/change-plan` (NEW)
- **Stripe Used**: Yes - `stripe.subscriptions.update()`
- **Upgrades**: Immediate with proration
- **Downgrades**: Scheduled for period end
- **Billing**: All handled by Stripe

### `/api/stripe/create-checkout-session` (EXISTING)
- **Stripe Used**: Yes - `stripe.checkout.sessions.create()`
- **Purpose**: Convert trial to paid subscription
- **What Changed**: Nothing - works as before

### `/api/stripe/create-portal-session` (EXISTING)
- **Stripe Used**: Yes - `stripe.billingPortal.sessions.create()`
- **Purpose**: Customer self-service (invoices, payment methods, etc.)
- **What Changed**: Nothing - works as before

### `/api/stripe/webhook` (UPDATED)
- **Stripe Used**: Yes - handles all Stripe events
- **New Events Handled**:
  - `customer.subscription.updated` with `cancel_at_period_end`
  - Enhanced handling of subscription lifecycle

## Stripe Tax Configuration

**Automatic Tax Enabled**: ✅ All subscriptions use Stripe automatic tax calculation

### What This Means
- Stripe automatically calculates sales tax based on customer location
- Tax is collected at checkout and on subscription renewals
- Tax rates stay up-to-date with local regulations
- No manual tax configuration needed

### Setup Required
1. Enable Stripe Tax in Dashboard: https://dashboard.stripe.com/settings/tax
2. Configure tax behavior (registration, reporting)
3. Automatic tax will apply to all checkout sessions and subscription changes

### Where It's Used
- ✅ Checkout sessions (`automatic_tax: { enabled: true }`)
- ✅ Subscription upgrades (immediate proration + tax)
- ✅ Subscription downgrades (scheduled with tax)
- ✅ All invoices include tax breakdown

## Stripe Dashboard Setup

You'll need to configure these in Stripe Dashboard:

### 1. **Products & Prices**
Already configured (from .env.example):
- Single Monthly/Yearly
- Single Plus Monthly/Yearly
- Family Basic Monthly/Yearly
- Family Plus Monthly/Yearly
- Family Premium Monthly/Yearly

### 2. **Webhooks**
Point to: `https://your-domain.com/api/stripe/webhook`

Events to listen for:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated` (handles cancel_at_period_end)
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

### 3. **Customer Portal**
Configure at: https://dashboard.stripe.com/settings/billing/portal

Settings:
- ✅ Allow customers to cancel subscriptions
- ✅ Cancellation mode: "At period end" (retains access)
- ✅ Allow customers to update subscriptions
- ✅ Allow customers to update payment methods

## Environment Variables Required

All already in your `.env.example`:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs (Monthly)
STRIPE_PRICE_SINGLE_MONTHLY=price_xxx
STRIPE_PRICE_SINGLE_PLUS_MONTHLY=price_xxx
STRIPE_PRICE_FAMILY_BASIC_MONTHLY=price_xxx
STRIPE_PRICE_FAMILY_PLUS_MONTHLY=price_xxx
STRIPE_PRICE_FAMILY_PREMIUM_MONTHLY=price_xxx

# Price IDs (Yearly)
STRIPE_PRICE_SINGLE_YEARLY=price_xxx
STRIPE_PRICE_SINGLE_PLUS_YEARLY=price_xxx
STRIPE_PRICE_FAMILY_BASIC_YEARLY=price_xxx
STRIPE_PRICE_FAMILY_PLUS_YEARLY=price_xxx
STRIPE_PRICE_FAMILY_PREMIUM_YEARLY=price_xxx
```

## What's Different from Before?

### Before Implementation:
- Trial required credit card
- Cancellation was immediate (no access retention)
- Plan changes timing wasn't specified
- No trial expiry notifications

### After Implementation:
- ✅ Trial is 7 days, NO credit card required
- ✅ Cancellation retains access until period end (via Stripe's `cancel_at_period_end`)
- ✅ Upgrades immediate, downgrades at cycle end (via Stripe proration)
- ✅ Trial reminders 3 days and 1 day before expiry
- ✅ All policies match the FAQ screenshot

## Testing Checklist (Stripe)

### Trial Flow
- [ ] Start trial without entering payment method
- [ ] Verify Firestore has `status: 'trialing'` and `trialEndsAt`
- [ ] Trial expires after 7 days → Status changes to 'expired'
- [ ] Click "Add Payment" → Stripe Checkout loads
- [ ] Complete checkout → Webhook fires → Status changes to 'active'

### Cancellation Flow
- [ ] Cancel subscription from UI
- [ ] Verify Stripe subscription has `cancel_at_period_end: true`
- [ ] Verify access continues until `currentPeriodEnd`
- [ ] Period ends → Webhook fires → Status changes to 'expired'
- [ ] Access blocked after period end

### Upgrade Flow (via Stripe)
- [ ] Upgrade from Single to Family Plus
- [ ] Verify immediate subscription update in Stripe
- [ ] Verify proration charge created
- [ ] Verify Firestore subscription updated immediately
- [ ] Verify new features available immediately

### Downgrade Flow (via Stripe)
- [ ] Downgrade from Family Plus to Single
- [ ] Verify subscription **not** updated immediately in Stripe
- [ ] Verify scheduled change in Stripe metadata
- [ ] Verify Firestore has `scheduledPlan` and `scheduledChangeDate`
- [ ] Period ends → Webhook fires → Subscription updated to new plan

## Stripe Customer Portal

Users can also manage their subscription through Stripe Customer Portal:

**Access**: Click "Manage Billing" button in `SubscriptionManager` component

**Features Available**:
- View invoices
- Update payment method
- Cancel subscription (retains access until period end)
- Update subscription plan (handled by Stripe)

**Portal Settings** (configure in Stripe Dashboard):
- Cancellation: "At period end" ✅
- Subscription updates: Allowed ✅
- Payment method updates: Allowed ✅

## Summary

**Everything uses Stripe** - we're just adding the FAQ policies on top:

1. **Trial**: Starts in Firestore, converts to Stripe when user pays
2. **Cancellation**: Uses Stripe's `cancel_at_period_end` feature
3. **Plan Changes**: Uses Stripe's proration and scheduled updates
4. **Billing**: 100% handled by Stripe
5. **Webhooks**: Sync Stripe events to Firestore

The implementation **enhances** your existing Stripe setup, it doesn't replace it!
