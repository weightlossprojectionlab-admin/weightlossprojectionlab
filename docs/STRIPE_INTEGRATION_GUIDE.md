# Stripe Integration Guide

## Overview
This guide shows how to integrate the Stripe payment infrastructure into your shop-and-deliver grocery service.

---

## Quick Start

### 1. Environment Setup

Copy `.env.local.example` to `.env.local` and fill in your Stripe keys:

```bash
cp .env.local.example .env.local
```

Get your keys from:
- **API Keys**: https://dashboard.stripe.com/apikeys
- **Webhook Secret**: https://dashboard.stripe.com/webhooks (after creating endpoint)

Use test keys for development:
- `sk_test_...` for STRIPE_SECRET_KEY
- `pk_test_...` for NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

### 2. Enable Stripe Products

In your Stripe Dashboard, enable:
1. **Stripe Connect** - For shopper accounts
2. **Stripe Issuing** - For virtual cards (requires approval)
3. **Payment Intents** - Enabled by default

---

## Implementation Examples

### Example 1: Create Order with Payment Hold

```typescript
// app/api/orders/create/route.ts
import { createPaymentIntent } from '@/lib/stripe-operations';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { orderId, customerId, amount, paymentMethodId, metadata } = await req.json();

    // Create payment intent (holds funds, doesn't charge yet)
    const paymentIntent = await createPaymentIntent(
      orderId,
      customerId,
      amount, // in cents
      paymentMethodId,
      {
        deliveryFee: 700, // $7.00
        taxEstimate: 680,  // $6.80
        lateAddFees: 20,   // $0.20
      }
    );

    return NextResponse.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status, // 'requires_capture'
      amountHeld: paymentIntent.amount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

### Example 2: Onboard Shopper and Create Virtual Card

```typescript
// app/api/shoppers/onboard/route.ts
import {
  createShopperConnectAccount,
  createAccountOnboardingLink,
  createCardholder,
  createIssuingCard,
} from '@/lib/stripe-operations';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { shopperId, email, name, phone, address } = await req.json();

    // Step 1: Create Connect account for shopper
    const connectAccount = await createShopperConnectAccount(shopperId, email);

    // Step 2: Create onboarding link
    const onboardingLink = await createAccountOnboardingLink(
      connectAccount.id,
      `${process.env.NEXT_PUBLIC_APP_URL}/shopper/onboarding-refresh`,
      `${process.env.NEXT_PUBLIC_APP_URL}/shopper/dashboard`
    );

    // Step 3: Create cardholder (for issuing cards)
    const cardholder = await createCardholder(
      shopperId,
      name,
      email,
      phone,
      address
    );

    return NextResponse.json({
      success: true,
      connectAccountId: connectAccount.id,
      onboardingUrl: onboardingLink.url,
      cardholderId: cardholder.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

### Example 3: Assign Shopper and Issue Card

```typescript
// app/api/orders/assign-shopper/route.ts
import { createIssuingCard } from '@/lib/stripe-operations';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { orderId, shopperId, cardholderId, estimatedTotal } = await req.json();

    // Create virtual card with spending limit
    const card = await createIssuingCard(
      shopperId,
      cardholderId,
      estimatedTotal + Math.round(estimatedTotal * 0.15), // +15% buffer
      orderId
    );

    return NextResponse.json({
      success: true,
      cardId: card.id,
      last4: card.last4,
      spendingLimit: card.spending_controls.spending_limits[0].amount,
      // IMPORTANT: Only send card details securely to shopper's device
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

### Example 4: Complete Order - Capture Payment and Pay Shopper

```typescript
// app/api/orders/complete/route.ts
import {
  capturePaymentIntent,
  transferShopperPayment,
  cancelIssuingCard,
} from '@/lib/stripe-operations';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const {
      orderId,
      paymentIntentId,
      actualTotal,
      shopperId,
      connectAccountId,
      cardId,
    } = await req.json();

    // Step 1: Capture actual amount charged to customer
    const paymentIntent = await capturePaymentIntent(
      paymentIntentId,
      actualTotal // Only charge what was actually spent
    );

    // Step 2: Calculate shopper payment
    const baseFee = 1000; // $10.00 flat fee
    const percentageFee = Math.round(actualTotal * 0.05); // 5% of order
    const shopperTotal = baseFee + percentageFee;

    // Step 3: Transfer payment to shopper
    const transfer = await transferShopperPayment(
      shopperId,
      connectAccountId,
      shopperTotal,
      orderId,
      {
        baseFee,
        percentageFee,
        tips: 0,
        bonuses: 0,
      }
    );

    // Step 4: Cancel the virtual card (no longer needed)
    await cancelIssuingCard(cardId);

    return NextResponse.json({
      success: true,
      amountCharged: paymentIntent.amount_received,
      shopperPayment: shopperTotal,
      transferId: transfer.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

### Example 5: Process Refund

```typescript
// app/api/refunds/create/route.ts
import { processRefund } from '@/lib/stripe-operations';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { orderId, paymentIntentId, amount, reason, itemIds } = await req.json();

    // Issue refund to customer
    const refund = await processRefund(
      orderId,
      paymentIntentId,
      amount,
      reason,
      {
        itemIds: JSON.stringify(itemIds),
      }
    );

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
```

### Example 6: Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
import { verifyWebhookSignature } from '@/lib/stripe-config';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment captured:', paymentIntent.id);
        // Update order status in database
        break;

      case 'issuing_authorization.request':
        const authorization = event.data.object as Stripe.Issuing.Authorization;
        console.log('Card authorization:', authorization.id);
        // Log shopper's purchase for fraud detection
        break;

      case 'account.updated':
        const account = event.data.object as Stripe.Account;
        console.log('Connect account updated:', account.id);
        // Update shopper status if charges_enabled changed
        break;

      case 'transfer.created':
        const transfer = event.data.object as Stripe.Transfer;
        console.log('Transfer created:', transfer.id);
        // Mark shopper as paid
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
```

---

## Payment Flow Diagram

```
1. ORDER CREATION
   Customer submits order
   ↓
   createPaymentIntent() → Holds funds on customer's card
   Status: 'requires_capture'

2. SHOPPER ASSIGNMENT
   Assign shopper to order
   ↓
   createIssuingCard() → Generate virtual card for shopper
   Card Status: 'active'

3. SHOPPING
   Shopper uses virtual card at store
   ↓
   Stripe processes authorization
   Webhook: 'issuing_authorization.request'

4. COMPLETION
   Shopping complete
   ↓
   capturePaymentIntent(actualTotal) → Charge customer
   ↓
   transferShopperPayment() → Pay shopper
   ↓
   cancelIssuingCard() → Deactivate card

5. POST-DELIVERY (if needed)
   Customer reports issue
   ↓
   processRefund() → Issue partial refund
```

---

## Security Best Practices

### 1. Environment Variables
- Never commit `.env.local` to version control
- Use test keys in development
- Rotate keys if compromised

### 2. Webhook Security
- Always verify webhook signatures
- Use webhook secret from Stripe Dashboard
- Return 200 status quickly to avoid retries

### 3. API Routes
- Only use Stripe operations server-side
- Never expose secret key to client
- Validate all inputs before Stripe calls

### 4. Card Security
- Never log full card numbers
- Only show last 4 digits to shopper
- Cancel cards immediately after use

### 5. Amount Validation
```typescript
// Always validate amounts before creating payment intents
if (amount < STRIPE_CONFIG.LIMITS.MIN_ORDER_AMOUNT) {
  throw new Error('Order below minimum');
}
if (amount > STRIPE_CONFIG.LIMITS.MAX_ORDER_AMOUNT) {
  throw new Error('Order exceeds maximum');
}
```

---

## Testing

### Test Cards
Use these test cards in development:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Insufficient funds**: 4000 0000 0000 9995

### Test Webhooks Locally
Use Stripe CLI to forward webhooks to localhost:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Test Connect Onboarding
In test mode, you can skip onboarding verification:
```typescript
// Stripe will auto-approve in test mode
const account = await createShopperConnectAccount(shopperId, email);
// account.charges_enabled will be true immediately in test mode
```

---

## Common Issues & Solutions

### Issue: "No such payment_intent"
**Solution**: Payment intent IDs are mode-specific. Ensure you're using the same mode (test/live) for all operations.

### Issue: "Insufficient permissions for issuing"
**Solution**: Stripe Issuing requires approval. Apply at: https://dashboard.stripe.com/issuing

### Issue: "Webhook signature verification failed"
**Solution**: Ensure you're using the raw request body (not parsed JSON) for verification.

### Issue: "Card authorization declined"
**Solution**: Check spending limits, MCC restrictions, and card status.

---

## Next Steps

1. **Set up webhook endpoint** in Stripe Dashboard
2. **Enable Stripe Issuing** (if not already approved)
3. **Create test shoppers** and onboard them
4. **Run test orders** end-to-end
5. **Monitor dashboard** for issues
6. **Set up error tracking** (Sentry, etc.)
7. **Implement fraud detection** using authorization webhooks
8. **Add receipt OCR** to verify purchases

---

## Support Resources

- **Stripe Docs**: https://stripe.com/docs
- **Connect Guide**: https://stripe.com/docs/connect
- **Issuing Guide**: https://stripe.com/docs/issuing
- **API Reference**: https://stripe.com/docs/api
- **Webhook Events**: https://stripe.com/docs/api/events/types

---

## Cost Estimates

For a $100 order:
```
Customer pays: $100.00
├─ Grocery items: $85.00
├─ Delivery fee: $7.00
├─ Service fee (10%): $8.50
└─ Tax estimate: $6.80

Platform costs:
├─ Payment processing: $3.18 (2.9% + $0.30)
├─ Card authorization: $0.10
├─ Shopper transfer: $0.08 (0.5% of $15)
└─ Total Stripe fees: $3.36

Shopper earns: $15.00
├─ Base fee: $10.00
└─ Percentage (5%): $5.00

Platform net: $12.34
```

---

## Production Checklist

Before going live:
- [ ] Switch to live API keys
- [ ] Complete Stripe account verification
- [ ] Set up production webhook endpoint
- [ ] Enable fraud detection rules
- [ ] Configure payout schedule
- [ ] Test refund process
- [ ] Set up monitoring/alerts
- [ ] Review fee structure
- [ ] Test Connect onboarding flow
- [ ] Verify Issuing card controls
- [ ] Document incident response plan
- [ ] Train support team on Stripe Dashboard
