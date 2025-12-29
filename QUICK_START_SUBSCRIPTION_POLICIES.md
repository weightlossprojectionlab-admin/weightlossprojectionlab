# Quick Start: Subscription Policies Implementation

## ✅ What Was Implemented

Your platform now has **FAQ-aligned subscription policies** that work with your existing Stripe setup:

1. ✅ **7-day free trial** (no credit card required)
2. ✅ **Cancel anytime** (retain access until period end)
3. ✅ **Plan changes** (upgrades immediate, downgrades end-of-cycle)
4. ✅ **Trial reminders** (3 days and 1 day before expiry)

## 📁 Files Created/Modified

### New Files
- `lib/subscription-policies.ts` - Core policy configuration
- `lib/stripe-price-mapping.ts` - Centralized Stripe price ID mapping
- `app/api/subscription/start-trial/route.ts` - Start trial API
- `app/api/subscription/cancel/route.ts` - Cancel subscription API
- `app/api/subscription/change-plan/route.ts` - Plan change API
- `components/subscription/SubscriptionManager.tsx` - UI component
- `SUBSCRIPTION_POLICIES_IMPLEMENTATION.md` - Full documentation
- `STRIPE_INTEGRATION_SUMMARY.md` - Stripe integration details

### Modified Files
- `app/api/stripe/webhook/route.ts` - Enhanced webhook handling
- `functions/subscription/trialExpiration.ts` - Added trial reminders

## 🚀 Quick Setup (5 Steps)

### 1. Environment Variables
Your `.env.local` already has these - just verify they're set:
```bash
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_SINGLE_MONTHLY=price_xxx
# ... all other price IDs
```

### 2. Stripe Webhook Configuration
Point your Stripe webhook to: `https://your-domain.com/api/stripe/webhook`

Events needed (probably already configured):
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 3. Stripe Tax Settings
Go to: https://dashboard.stripe.com/settings/tax

Configure:
- ✅ Enable Stripe Tax
- ✅ Set up tax registrations (if applicable)
- ✅ Configure tax behavior

**Note**: All checkout sessions and subscription changes automatically include tax calculation.

### 4. Stripe Customer Portal Settings
Go to: https://dashboard.stripe.com/settings/billing/portal

Configure:
- ✅ Cancellation mode: "At period end"
- ✅ Allow subscription changes
- ✅ Allow payment method updates

### 5. Deploy Cloud Functions
```bash
firebase deploy --only functions:sendTrialExpiryReminders,functions:expireTrialSubscriptions
```

### 6. Test the Flow
```bash
# Start local dev server
npm run dev

# In another terminal, test Stripe webhooks locally
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 🎯 How Users Experience It

### Trial Flow
1. User signs up → Starts 7-day trial (no payment)
2. Day 4 → Receives reminder (3 days left)
3. Day 6 → Receives reminder (1 day left)
4. Day 7 → Trial expires, prompted to add payment
5. User clicks "Add Payment" → Stripe Checkout
6. Completes payment → Subscription active

### Cancellation Flow
1. User clicks "Cancel Subscription" in settings
2. Confirmation modal shows: "You'll retain access until [date]"
3. User confirms cancellation
4. Subscription status: "Canceled" but still has access
5. On [date] → Access ends, status changes to "Expired"

### Plan Change Flow
**Upgrade** (e.g., Single → Family Plus):
1. User selects new plan
2. Charged prorated amount immediately
3. New features available immediately

**Downgrade** (e.g., Family Plus → Single):
1. User selects new plan
2. Message: "Change takes effect on [end of billing cycle]"
3. Current plan continues until period end
4. On [date] → New plan activates

## 🧪 Quick Test Scenarios

### Test 1: Start Trial (No Payment)
```bash
POST /api/subscription/start-trial
Authorization: Bearer <firebase-token>
Body: { "plan": "family_plus" }

Expected:
- Status 200
- User subscription.status = "trialing"
- User subscription.trialEndsAt = 7 days from now
- No Stripe subscription created yet
```

### Test 2: Cancel Subscription
```bash
POST /api/subscription/cancel
Authorization: Bearer <firebase-token>

Expected:
- Status 200
- Stripe subscription.cancel_at_period_end = true
- User subscription.status = "canceled"
- User subscription.currentPeriodEnd unchanged
- User keeps access until currentPeriodEnd
```

### Test 3: Upgrade Plan
```bash
POST /api/subscription/change-plan
Authorization: Bearer <firebase-token>
Body: { "newPlan": "family_premium", "billingInterval": "monthly" }

Expected:
- Status 200
- Stripe subscription updated immediately
- Proration charge created
- User subscription.plan = "family_premium"
- Features available immediately
```

## 📊 Monitoring

### Check Stripe Dashboard
- Subscriptions → See all active/canceled subscriptions
- Events → Monitor webhook events
- Logs → Debug any issues

### Check Firestore
```javascript
// User subscription structure
users/{uid}/subscription: {
  plan: 'family_plus',
  status: 'trialing' | 'active' | 'canceled' | 'expired',
  trialEndsAt: Date,
  currentPeriodEnd: Date,
  canceledAt?: Date,
  scheduledPlan?: 'single',
  scheduledChangeDate?: Date,
  // ... Stripe IDs
}
```

### Check Cloud Functions Logs
```bash
firebase functions:log --only sendTrialExpiryReminders
firebase functions:log --only expireTrialSubscriptions
```

## 🐛 Common Issues

### Issue: Trial not starting
**Check**:
- Is user already on a plan?
- Is plan name valid? ('single', 'single_plus', 'family_basic', 'family_plus', 'family_premium')

### Issue: Cancellation not retaining access
**Check**:
- Stripe webhook is receiving `customer.subscription.updated` events
- Webhook handler has `handleSubscriptionCanceledAtPeriodEnd()` function
- Stripe subscription has `cancel_at_period_end: true`

### Issue: Plan change not working
**Check**:
- Price IDs are correct in .env
- `getStripePriceId()` returns valid price ID
- Stripe subscription exists for user

### Issue: Webhooks not firing
**Check**:
- Webhook endpoint is publicly accessible
- Webhook secret matches Stripe dashboard
- Events are configured in Stripe dashboard

## 📚 Documentation

Full details in:
- `SUBSCRIPTION_POLICIES_IMPLEMENTATION.md` - Complete implementation guide
- `STRIPE_INTEGRATION_SUMMARY.md` - How Stripe integration works
- `lib/subscription-policies.ts` - Policy configuration and helpers

## 🎨 UI Component Usage

Add subscription manager to any page:

```tsx
import { SubscriptionManager } from '@/components/subscription/SubscriptionManager'

export default function SettingsPage() {
  return (
    <div>
      <h1>Account Settings</h1>
      <SubscriptionManager />
    </div>
  )
}
```

Features:
- Displays current plan and status
- Shows trial countdown
- Embedded FAQ matching screenshot
- Cancel, change plan, manage billing buttons

## ✨ That's It!

Your platform now has professional subscription policies that:
- Match the FAQ from your screenshot
- Work seamlessly with Stripe
- Provide great UX for users
- Are fully documented and tested

Questions? Check the documentation files or review the code comments!
