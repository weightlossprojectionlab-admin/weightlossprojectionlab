# Stripe Operations API Reference

Quick reference for all Stripe operations available in `lib/stripe-operations.ts`.

---

## Customer Payment Operations

### `createPaymentIntent()`
Creates a payment intent with manual capture to hold funds.

**Parameters:**
- `orderId: string` - Internal order ID
- `customerId: string` - Stripe customer ID (cus_xxx)
- `amount: number` - Estimated total in cents
- `paymentMethodId: string` - Payment method ID (pm_xxx)
- `metadata: Partial<PaymentIntentMetadata>` - Optional metadata

**Returns:** `Promise<Stripe.PaymentIntent>`

**Example:**
```typescript
const intent = await createPaymentIntent(
  'order_123',
  'cus_abc',
  8500,
  'pm_xyz',
  { deliveryFee: 700, taxEstimate: 680 }
);
```

---

### `capturePaymentIntent()`
Captures held funds after shopping complete.

**Parameters:**
- `paymentIntentId: string` - Payment intent ID (pi_xxx)
- `finalAmount?: number` - Optional final amount (defaults to full hold)

**Returns:** `Promise<Stripe.PaymentIntent>`

**Example:**
```typescript
await capturePaymentIntent('pi_123', 8236); // Capture $82.36
```

---

### `cancelPaymentIntent()`
Cancels payment intent and releases held funds.

**Parameters:**
- `paymentIntentId: string` - Payment intent ID
- `reason?: string` - Optional cancellation reason

**Returns:** `Promise<Stripe.PaymentIntent>`

**Example:**
```typescript
await cancelPaymentIntent('pi_123', 'Customer cancelled order');
```

---

## Shopper Connect Operations

### `createShopperConnectAccount()`
Creates Stripe Connect Express account for shopper.

**Parameters:**
- `shopperId: string` - Internal shopper ID
- `email: string` - Shopper email
- `metadata?: Record<string, string>` - Optional metadata

**Returns:** `Promise<Stripe.Account>`

**Example:**
```typescript
const account = await createShopperConnectAccount(
  'shopper_123',
  'john@example.com',
  { backgroundCheck: 'passed' }
);
```

---

### `createAccountOnboardingLink()`
Generates onboarding link for Connect account setup.

**Parameters:**
- `accountId: string` - Connect account ID (acct_xxx)
- `refreshUrl: string` - URL if link expires
- `returnUrl: string` - URL after completion

**Returns:** `Promise<Stripe.AccountLink>`

**Example:**
```typescript
const link = await createAccountOnboardingLink(
  'acct_123',
  'https://app.com/refresh',
  'https://app.com/dashboard'
);
```

---

### `getConnectAccount()`
Retrieves Connect account details and status.

**Parameters:**
- `accountId: string` - Connect account ID

**Returns:** `Promise<Stripe.Account>`

**Example:**
```typescript
const account = await getConnectAccount('acct_123');
console.log(account.charges_enabled); // Can receive payments?
```

---

## Issuing Card Operations

### `createCardholder()`
Creates cardholder profile (required before issuing cards).

**Parameters:**
- `shopperId: string` - Internal shopper ID
- `name: string` - Full name
- `email: string` - Email
- `phone: string` - Phone number
- `billingAddress: object` - Billing address

**Returns:** `Promise<Stripe.Issuing.Cardholder>`

**Example:**
```typescript
const cardholder = await createCardholder(
  'shopper_123',
  'John Doe',
  'john@example.com',
  '+14155551234',
  {
    line1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'US'
  }
);
```

---

### `createIssuingCard()`
Creates virtual card with spending controls.

**Parameters:**
- `shopperId: string` - Internal shopper ID
- `cardholderId: string` - Cardholder ID (ich_xxx)
- `spendingLimit: number` - Max spend in cents
- `orderId?: string` - Optional order ID

**Returns:** `Promise<Stripe.Issuing.Card>`

**Example:**
```typescript
const card = await createIssuingCard(
  'shopper_123',
  'ich_abc',
  10000, // $100 limit
  'order_456'
);
```

---

### `updateCardSpendingLimit()`
Updates spending limit on existing card.

**Parameters:**
- `cardId: string` - Card ID (ic_xxx)
- `newLimit: number` - New limit in cents

**Returns:** `Promise<Stripe.Issuing.Card>`

**Example:**
```typescript
await updateCardSpendingLimit('ic_123', 12000); // Increase to $120
```

---

### `cancelIssuingCard()`
Cancels card (use after shopping complete).

**Parameters:**
- `cardId: string` - Card ID

**Returns:** `Promise<Stripe.Issuing.Card>`

**Example:**
```typescript
await cancelIssuingCard('ic_123');
```

---

## Shopper Payment Operations

### `transferShopperPayment()`
Transfers payment to shopper's Connect account.

**Parameters:**
- `shopperId: string` - Internal shopper ID
- `connectAccountId: string` - Connect account ID (acct_xxx)
- `amount: number` - Total payment in cents
- `orderId: string` - Order ID
- `breakdown: object` - Payment breakdown

**Returns:** `Promise<Stripe.Transfer>`

**Example:**
```typescript
await transferShopperPayment(
  'shopper_123',
  'acct_abc',
  1500,
  'order_456',
  {
    baseFee: 1000,
    percentageFee: 425,
    tips: 75,
    bonuses: 0
  }
);
```

---

### `reverseShopperPayment()`
Reverses a transfer (fraud/disputes).

**Parameters:**
- `transferId: string` - Transfer ID (tr_xxx)
- `amount?: number` - Optional partial reversal amount
- `reason?: string` - Reversal reason

**Returns:** `Promise<Stripe.TransferReversal>`

**Example:**
```typescript
await reverseShopperPayment('tr_123', undefined, 'Fraudulent activity');
```

---

## Refund Operations

### `processRefund()`
Issues refund to customer.

**Parameters:**
- `orderId: string` - Internal order ID
- `paymentIntentId: string` - Payment intent ID (pi_xxx)
- `amount: number` - Refund amount in cents
- `reason: string` - Refund reason
- `metadata?: Record<string, string>` - Optional metadata

**Returns:** `Promise<Stripe.Refund>`

**Example:**
```typescript
await processRefund(
  'order_123',
  'pi_abc',
  350,
  'Missing items',
  { itemIds: '["item_1", "item_2"]' }
);
```

---

## Utility Functions

### `calculatePlatformFees()`
Calculates all Stripe fees for an order.

**Parameters:**
- `orderAmount: number` - Order amount in cents
- `shopperPayment: number` - Shopper payment in cents

**Returns:** Fee breakdown object

**Example:**
```typescript
const fees = calculatePlatformFees(10000, 1500);
console.log(fees.totalFees); // Total fees in cents
```

---

### `getPaymentIntent()`
Retrieves payment intent details.

**Parameters:**
- `paymentIntentId: string` - Payment intent ID

**Returns:** `Promise<Stripe.PaymentIntent>`

---

### `listShopperTransfers()`
Lists all transfers to a shopper.

**Parameters:**
- `connectAccountId: string` - Connect account ID
- `limit?: number` - Max results (default: 10)

**Returns:** `Promise<Stripe.Transfer[]>`

---

### `getIssuingAuthorization()`
Gets details of card authorization.

**Parameters:**
- `authorizationId: string` - Authorization ID (iauth_xxx)

**Returns:** `Promise<Stripe.Issuing.Authorization>`

---

## Configuration Constants

Access via `STRIPE_CONFIG` from `lib/stripe-config.ts`:

```typescript
import { STRIPE_CONFIG } from '@/lib/stripe-config';

STRIPE_CONFIG.CURRENCY // 'usd'
STRIPE_CONFIG.PAYMENT_BUFFER_PERCENTAGE // 0.15 (15%)
STRIPE_CONFIG.ALLOWED_MCC_CATEGORIES // ['grocery_stores_supermarkets']
STRIPE_CONFIG.FEES.PAYMENT_PROCESSING_PERCENTAGE // 290 (2.9%)
STRIPE_CONFIG.LIMITS.MAX_ORDER_AMOUNT // 50000 ($500)
```

---

## Helper Functions

### `formatCurrency(cents: number): string`
Formats cents as currency string.

```typescript
formatCurrency(8500); // "$85.00"
```

### `dollarsToCents(dollars: number): number`
Converts dollars to cents.

```typescript
dollarsToCents(85.50); // 8550
```

### `centsToDollars(cents: number): number`
Converts cents to dollars.

```typescript
centsToDollars(8550); // 85.50
```

### `getStripeDashboardUrl(type, id, livemode?): string`
Gets Stripe Dashboard URL for object.

```typescript
getStripeDashboardUrl('payment_intents', 'pi_123');
// "https://dashboard.stripe.com/test/payment_intents/pi_123"
```

---

## Error Handling

All functions throw errors with descriptive messages. Always use try-catch:

```typescript
try {
  const intent = await createPaymentIntent(...);
} catch (error) {
  console.error('Payment failed:', error.message);
  // Handle error appropriately
}
```

---

## Type Definitions

All types available in `types/stripe.ts`:

- `StripeConnectAccount`
- `StripeIssuingCard`
- `PaymentIntentMetadata`
- `ShopperEarnings`
- `RefundRequest`
- `IssuingAuthorization`
- `StripeWebhookEvent`
- `StripeCardholder`
- `PlatformRevenue`
- `SpendingControl`

---

## Import Examples

```typescript
// Import operations
import {
  createPaymentIntent,
  capturePaymentIntent,
  createIssuingCard,
  transferShopperPayment,
} from '@/lib/stripe-operations';

// Import config and helpers
import {
  stripe,
  STRIPE_CONFIG,
  formatCurrency,
  getStripeDashboardUrl,
} from '@/lib/stripe-config';

// Import types
import type {
  PaymentIntentMetadata,
  StripeIssuingCard,
  ShopperEarnings,
} from '@/types/stripe';
```
