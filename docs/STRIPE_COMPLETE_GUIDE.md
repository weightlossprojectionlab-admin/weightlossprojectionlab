# Stripe Complete Guide

> **Consolidated guide combining setup, integration, and API reference**
>
> - Quick Setup Guide
> - Complete Integration Guide
> - API Reference
> - Testing & Troubleshooting

---

## Table of Contents

1. [Quick Setup](#quick-setup)
2. [Environment Configuration](#environment-configuration)
3. [Stripe Products & Features](#stripe-products--features)
4. [Integration Architecture](#integration-architecture)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Quick Setup

### Prerequisites
- Stripe account (https://dashboard.stripe.com/register)
- Node.js 18+ environment
- Firebase project configured

### 1. Get Stripe API Keys

**Test Mode** (Development):
1. Visit https://dashboard.stripe.com/test/apikeys
2. Copy **Publishable key** (starts with `pk_test_`)
3. Reveal and copy **Secret key** (starts with `sk_test_`)

**Live Mode** (Production):
1. Visit https://dashboard.stripe.com/apikeys
2. Copy **Publishable key** (starts with `pk_live_`)
3. Reveal and copy **Secret key** (starts with `sk_live_`)

### 2. Configure Environment Variables

Add to `.env.local`:

```bash
# Stripe API Keys (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE

# Stripe Webhook Secret (created in step 3)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Optional: Stripe Connect (for multi-vendor features)
STRIPE_CONNECT_CLIENT_ID=ca_YOUR_CLIENT_ID

# Optional: Price IDs for subscription plans
STRIPE_PRICE_ID_SINGLE=price_YOUR_SINGLE_PLAN_ID
STRIPE_PRICE_ID_FAMILY_BASIC=price_YOUR_FAMILY_BASIC_ID
STRIPE_PRICE_ID_FAMILY_PLUS=price_YOUR_FAMILY_PLUS_ID
```

### 3. Set Up Webhooks

Stripe uses webhooks to notify your app about payment events.

**Local Development:**
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward events: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Copy the webhook secret (starts with `whsec_`)

**Production:**
1. Visit https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. Enter URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the webhook signing secret

### 4. Install Dependencies

```bash
npm install stripe @stripe/stripe-js
```

### 5. Verify Installation

```bash
npm run dev
```

Visit http://localhost:3000/pricing to test the checkout flow.

---

## Environment Configuration

### Required Environment Variables

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public API key for client-side | Dashboard → API keys |
| `STRIPE_SECRET_KEY` | Secret API key for server-side | Dashboard → API keys (reveal) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Dashboard → Webhooks → endpoint |

### Optional Environment Variables

| Variable | Description | When Needed |
|----------|-------------|-------------|
| `STRIPE_CONNECT_CLIENT_ID` | Connect platform ID | Multi-vendor marketplace |
| `STRIPE_PRICE_ID_*` | Product price IDs | Subscription products |
| `STRIPE_TAX_RATE_ID` | Tax rate ID | Automatic tax calculation |

---

## Stripe Products & Features

### Enabled Features

✅ **Stripe Checkout** - Hosted payment pages
✅ **Stripe Subscriptions** - Recurring billing
✅ **Stripe Customer Portal** - Self-service account management
✅ **Stripe Webhooks** - Event notifications

### Optional Features

⬜ **Stripe Connect** - Multi-vendor marketplace
⬜ **Stripe Issuing** - Virtual payment cards
⬜ **Stripe Terminal** - In-person payments
⬜ **Stripe Tax** - Automated tax calculation

---

## Integration Architecture

### Payment Flow

```
User → Pricing Page → Create Checkout Session → Stripe Hosted Checkout
  ↓
Stripe redirects back with session_id
  ↓
Webhook: checkout.session.completed
  ↓
Update user subscription in Firebase
  ↓
User sees success page with subscription details
```

### Key Files

| File | Purpose |
|------|---------|
| `/app/api/stripe/create-checkout-session/route.ts` | Creates Stripe Checkout sessions |
| `/app/api/stripe/webhook/route.ts` | Handles Stripe webhook events |
| `/app/api/stripe/create-portal-session/route.ts` | Customer portal access |
| `/lib/stripe.ts` | Stripe client initialization |
| `/hooks/useSubscription.ts` | React hook for subscription state |

---

## API Endpoints Reference

### POST `/api/stripe/create-checkout-session`

Creates a Stripe Checkout session for subscription purchase.

**Request Body:**
```json
{
  "priceId": "price_1234567890",
  "successUrl": "https://yourdomain.com/success",
  "cancelUrl": "https://yourdomain.com/pricing"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_1234567890",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**Usage:**
```typescript
const response = await fetch('/api/stripe/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    priceId: 'price_family_basic',
    successUrl: window.location.origin + '/success',
    cancelUrl: window.location.origin + '/pricing'
  })
})
const { url } = await response.json()
window.location.href = url  // Redirect to Stripe Checkout
```

---

### POST `/api/stripe/create-portal-session`

Creates a Stripe Customer Portal session for subscription management.

**Request Body:**
```json
{
  "returnUrl": "https://yourdomain.com/account"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

**Usage:**
```typescript
const response = await fetch('/api/stripe/create-portal-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    returnUrl: window.location.origin + '/account'
  })
})
const { url } = await response.json()
window.location.href = url  // Redirect to Customer Portal
```

---

### POST `/api/stripe/webhook`

Handles Stripe webhook events.

**Security:**
- Validates webhook signature using `STRIPE_WEBHOOK_SECRET`
- Rejects unsigned or tampered webhooks

**Handled Events:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create/update subscription in Firestore |
| `customer.subscription.updated` | Update subscription status |
| `customer.subscription.deleted` | Cancel subscription |
| `invoice.paid` | Record payment |
| `invoice.payment_failed` | Handle failed payment |

**Webhook Payload Example:**
```json
{
  "id": "evt_1234567890",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_1234567890",
      "customer": "cus_1234567890",
      "subscription": "sub_1234567890",
      "metadata": {
        "userId": "firebase_user_id"
      }
    }
  }
}
```

---

## Testing

### Test Mode Credit Cards

Use these test cards in Stripe Checkout:

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0002` | Declined (card declined) |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

**Expiry:** Any future date
**CVC:** Any 3 digits
**ZIP:** Any 5 digits

### Testing Webhooks Locally

1. Start Stripe CLI listener:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

2. Trigger test events:
   ```bash
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.created
   stripe trigger invoice.paid
   ```

3. View webhook logs in terminal

### Testing Subscription Flow

1. Visit `/pricing`
2. Click "Subscribe" on any plan
3. Use test card `4242 4242 4242 4242`
4. Complete checkout
5. Verify:
   - Redirected to success page
   - Webhook received in Stripe CLI
   - Subscription created in Firestore
   - User has access to premium features

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Switch to **Live Mode** API keys
- [ ] Configure production webhook endpoint
- [ ] Test all payment flows with real cards
- [ ] Set up Stripe Tax (if applicable)
- [ ] Configure email notifications in Stripe Dashboard
- [ ] Review and update pricing
- [ ] Enable fraud detection (Stripe Radar)
- [ ] Set up PCI compliance (automatic with Stripe Checkout)

### Live Mode Configuration

1. **Switch API Keys:**
   ```bash
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
   STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET
   ```

2. **Create Production Webhook:**
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events: Same as test mode
   - Copy new webhook secret

3. **Update Environment:**
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_PRODUCTION_SECRET
   ```

4. **Verify Deployment:**
   - Make a $1 test purchase with real card
   - Refund immediately in Stripe Dashboard
   - Confirm webhook received and processed

---

## Troubleshooting

### Common Issues

**1. Webhook Signature Verification Failed**

```
Error: No signatures found matching the expected signature for payload
```

**Fix:** Ensure `STRIPE_WEBHOOK_SECRET` matches your webhook endpoint secret.

---

**2. API Key Mismatch**

```
Error: No such customer: 'cus_...'
```

**Fix:** You're mixing test and live API keys. Ensure all keys are from the same mode.

---

**3. Webhook Not Receiving Events**

**Fix:**
- Check webhook endpoint is publicly accessible
- Verify correct URL in Stripe Dashboard
- Check webhook logs in Stripe Dashboard → Webhooks
- Ensure firewall allows Stripe IPs

---

**4. Subscription Not Created in Firestore**

**Debug:**
```typescript
console.log('Webhook received:', event.type)
console.log('Session ID:', session.id)
console.log('User ID from metadata:', session.metadata?.userId)
```

**Fix:**
- Verify `userId` is passed in checkout session metadata
- Check Firestore security rules allow writes
- Review server logs for errors

---

**5. Customer Portal Shows Wrong Subscription**

**Fix:**
- Ensure `customerId` is stored correctly in Firestore
- Verify customer has active subscription in Stripe
- Check user authentication token

---

### Debugging Tools

**Stripe Dashboard Logs:**
- API requests: https://dashboard.stripe.com/logs
- Webhook events: https://dashboard.stripe.com/webhooks
- Failed payments: https://dashboard.stripe.com/payments?status=failed

**Stripe CLI:**
```bash
# View real-time API logs
stripe logs tail

# Inspect specific event
stripe events retrieve evt_1234567890

# List recent events
stripe events list --limit 10
```

---

## Additional Resources

- **Stripe Docs:** https://stripe.com/docs
- **Stripe API Reference:** https://stripe.com/docs/api
- **Stripe Testing:** https://stripe.com/docs/testing
- **Webhook Best Practices:** https://stripe.com/docs/webhooks/best-practices
- **Security Guide:** https://stripe.com/docs/security/guide

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-24 | Consolidated from 4 separate guides |
| 2025-11-xx | Added subscription features |
| 2025-10-xx | Initial Stripe integration |
