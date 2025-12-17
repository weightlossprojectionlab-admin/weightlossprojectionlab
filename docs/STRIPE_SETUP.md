# Stripe Integration Setup Guide

This guide will walk you through setting up Stripe for subscription payments in your Weight Loss Project Lab application.

## Prerequisites

- Stripe account (sign up at https://stripe.com)
- Test API keys already added to `.env.local`

## Setup Steps

### 1. Create Products in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Click "Add Product" for each subscription tier

#### Product 1: Single User
- **Name**: Single User
- **Description**: 1 family member seat, 2 external caregivers
- **Pricing Model**: Recurring
- **Prices**: Create two prices:
  - **Monthly**: $9.99/month
    - Copy Price ID → `NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_MONTHLY`
  - **Yearly**: $99.00/year (17% savings shown in UI)
    - Copy Price ID → `NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_YEARLY`

#### Product 2: Family Basic
- **Name**: Family Basic
- **Description**: 5 family member seats, 5 external caregivers
- **Pricing Model**: Recurring
- **Prices**: Create two prices:
  - **Monthly**: $19.99/month
    - Copy Price ID → `NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_MONTHLY`
  - **Yearly**: $199.00/year (17% savings shown in UI)
    - Copy Price ID → `NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_YEARLY`

#### Product 3: Family Plus (Most Popular)
- **Name**: Family Plus
- **Description**: 10 family member seats, 10 external caregivers, advanced analytics
- **Pricing Model**: Recurring
- **Prices**: Create two prices:
  - **Monthly**: $29.99/month
    - Copy Price ID → `NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_MONTHLY`
  - **Yearly**: $299.00/year (17% savings shown in UI)
    - Copy Price ID → `NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_YEARLY`

#### Product 4: Family Premium (Best Value)
- **Name**: Family Premium
- **Description**: Unlimited seats, unlimited caregivers, all premium features
- **Pricing Model**: Recurring
- **Prices**: Create two prices:
  - **Monthly**: $39.99/month
    - Copy Price ID → `NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_MONTHLY`
  - **Yearly**: $399.00/year (17% savings shown in UI)
    - Copy Price ID → `NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_YEARLY`

### 2. Set Up Webhooks

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. **Endpoint URL**: `https://your-domain.com/api/webhooks/stripe` (replace with your actual domain)
   - For local development: Use Stripe CLI (see below)
4. **Events to listen to**:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. **Copy the Signing Secret** (starts with `whsec_`) and add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### 3. Local Development with Stripe CLI

For testing webhooks locally:

```bash
# Install Stripe CLI
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe
# Or download from https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret displayed and add to .env.local
```

### 4. Update Environment Variables

Your `.env.local` should now have all these filled in:

```env
# Stripe Keys (already added)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_...

# Product Price IDs (8 total - 4 products x 2 billing intervals)
# Single User Plan
NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_YEARLY=price_...

# Family Basic Plan
NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_YEARLY=price_...

# Family Plus Plan
NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_YEARLY=price_...

# Family Premium Plan
NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_YEARLY=price_...
```

### 5. Enable Stripe Customer Portal

1. Go to https://dashboard.stripe.com/test/settings/billing/portal
2. Click "Activate test link"
3. Configure the portal settings:
   - **Allow customers to**:
     - Update payment methods ✓
     - Update billing info ✓
     - Cancel subscriptions ✓
     - View invoices ✓
   - **Cancellation behavior**: Cancel immediately or at period end (your choice)
4. Click "Save changes"

### 6. Test the Integration

1. Restart your development server after updating `.env.local`
2. Go to `/profile` in your app
3. Click "Upgrade" or "Manage Subscription"
4. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Use any future expiry date and any CVC

### 7. Monitor Stripe Events

View all events in real-time:
- https://dashboard.stripe.com/test/events
- https://dashboard.stripe.com/test/logs

## Production Deployment

When ready for production:

1. Switch to live mode in Stripe Dashboard
2. Create the same products in live mode
3. Update `.env.local` (or production environment variables) with live keys:
   - Replace `STRIPE_SECRET_KEY` with live secret key (starts with `sk_live_`)
   - Replace `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` with live publishable key (starts with `pk_live_`)
   - Update all price IDs with live mode price IDs
   - Add production webhook endpoint with live mode webhook secret

## Troubleshooting

### Webhooks not receiving events
- Check webhook endpoint URL is correct
- Verify webhook signing secret in `.env.local`
- For local dev, ensure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Check logs at https://dashboard.stripe.com/test/logs

### Checkout session not creating
- Verify API keys are correct in `.env.local`
- Check browser console for errors
- Verify user is authenticated (Firebase ID token)
- Check server logs for detailed error messages

### Subscription not syncing to Firebase
- Verify webhook is receiving events (check Stripe Dashboard > Developers > Webhooks)
- Check `firebaseUid` is in subscription metadata
- Verify Firebase Admin SDK is configured correctly
- Check server logs for webhook processing errors

## API Routes

- **Create Checkout Session**: `POST /api/stripe/create-checkout-session`
- **Create Portal Session**: `POST /api/stripe/create-portal-session`
- **Webhook Handler**: `POST /api/webhooks/stripe`

## Next Steps

1. Complete the product price ID setup in `.env.local`
2. Test the complete checkout flow
3. Set up webhook endpoint for production
4. Add subscription status checks to protected routes
5. Consider adding:
   - Email receipts (Stripe automatically sends them)
   - Custom cancellation surveys
   - Usage-based billing for additional family members
   - Promotional discount codes

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- Stripe CLI: https://stripe.com/docs/stripe-cli
- Stripe Testing: https://stripe.com/docs/testing
