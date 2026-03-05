# Stripe Mode Switching Guide

## Quick Start

### Check Current Mode
```bash
npm run stripe:status
```

### Switch to Test Mode (Development)
```bash
npm run stripe:test
```

### Switch to Live Mode (Production)
```bash
npm run stripe:live
```

## Setup Instructions

### 1. Add Your Test Keys

Your `.env.local` currently only has **live keys**. To use test mode, you need to add your test keys:

1. **Go to Stripe Dashboard Test Mode:**
   - https://dashboard.stripe.com/test/apikeys

2. **Copy Your Test Keys:**
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`)

3. **Add to `.env.local`** (before the live keys section):

```env
# ============================================
# STRIPE TEST MODE KEYS (Development)
# ============================================
# Uncomment these for development (npm run stripe:test will do this automatically)

#STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY_HERE
#NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY_HERE
#STRIPE_WEBHOOK_SECRET=whsec_YOUR_TEST_WEBHOOK_SECRET_HERE

# Test Mode Price IDs (create in test dashboard)
#NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_MONTHLY=price_test_single_monthly
#NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_YEARLY=price_test_single_yearly
#NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_PLUS_MONTHLY=price_test_single_plus_monthly
#NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_PLUS_YEARLY=price_test_single_plus_yearly
#NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_MONTHLY=price_test_family_basic_monthly
#NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_YEARLY=price_test_family_basic_yearly
#NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_MONTHLY=price_test_family_plus_monthly
#NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_YEARLY=price_test_family_plus_yearly
#NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_MONTHLY=price_test_family_premium_monthly
#NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_YEARLY=price_test_family_premium_yearly

# ============================================
# STRIPE LIVE MODE KEYS (Production)
# ============================================
# Comment these out for development

STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
...
```

### 2. Create Test Products in Stripe

You need to create the same products in **test mode** as you have in live mode:

1. Go to https://dashboard.stripe.com/test/products
2. Create 5 products:
   - Single User ($9.99/month, $99/year)
   - Single User Plus ($14.99/month, $149/year)
   - Family Basic ($19.99/month, $199/year)
   - Family Plus ($29.99/month, $299/year)
   - Family Premium ($49.99/month, $499/year)
3. Copy the price IDs and add them to your test key section

### 3. Set Up Webhook for Local Development

For local webhook testing:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli#install

# Login to your test account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook secret (starts with whsec_) to your test keys
```

## How It Works

The `switch-stripe-mode.mjs` script:

1. **Test Mode:**
   - Comments out all live keys (`#STRIPE_SECRET_KEY=sk_live...`)
   - Uncomments all test keys (`STRIPE_SECRET_KEY=sk_test...`)
   - Switches price IDs to test versions

2. **Live Mode:**
   - Comments out all test keys
   - Uncomments all live keys
   - **Requires `--confirm` flag** to prevent accidents

## Important Notes

⚠️ **Always use TEST mode for development!**
- Test mode uses fake cards: https://stripe.com/docs/testing
- No real charges occur
- Use test card: `4242 4242 4242 4242`, any future expiry, any CVC

⚠️ **Live mode is for production only!**
- Real charges occur
- Real customer data
- Real money movement

⚠️ **After switching modes:**
- You MUST restart your dev server
- Old environment variables remain in memory

## Troubleshooting

### "No test keys found"
- You haven't added test keys to `.env.local` yet
- Follow Setup Instructions above

### "Webhook signature verification failed"
- Your webhook secret doesn't match the mode
- Make sure you're using the test webhook secret in test mode

### "Invalid API key"
- Keys are commented/uncommented incorrectly
- Run `npm run stripe:status` to check current mode

### Changes not taking effect
- Restart your dev server after switching modes
- Clear Next.js cache: `rm -rf .next`

## Testing Subscription Flow

### Test Cards (Test Mode Only)

**Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

**Payment Requires Authentication:**
- Card: `4000 0025 0000 3155`

**Declined Card:**
- Card: `4000 0000 0000 9995`

**More test cards:** https://stripe.com/docs/testing#cards

### Test Subscription Lifecycle

1. Create subscription → Use test card
2. View subscription in Stripe test dashboard
3. Test upgrade/downgrade flows
4. Test cancellation
5. Test renewal with webhook events

## Support

If you encounter issues:
1. Check your `.env.local` has test keys added
2. Verify you restarted dev server after switching
3. Check Stripe test dashboard logs
4. Review webhook events in Stripe CLI output
