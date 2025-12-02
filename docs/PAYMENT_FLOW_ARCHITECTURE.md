# Shop & Deliver Payment Flow Architecture

## Overview
This document outlines the complete payment infrastructure for the shop-and-deliver service using Stripe.

---

## Payment Flow Components

### **1. Stripe Products Needed:**
- **Stripe Connect** - Manage shopper/driver accounts
- **Stripe Issuing** - Virtual/physical cards for shoppers
- **Stripe Payment Intents** - Customer payment holds
- **Stripe Terminal** - Optional: For in-store checkout

---

## Complete Payment Flow

### **Phase 1: Order Submission**
```
Customer submits order
    ↓
System calculates estimated total:
  - Subtotal (estimated from item prices)
  - Delivery fee ($5-10)
  - Late add fees ($0.10 × late items)
  - Tax estimate (based on zip code)
  - Safety buffer (10-15% for price variations)
    ↓
Create Stripe Payment Intent with:
  - amount: estimatedTotal + buffer
  - capture_method: 'manual'
  - status: 'requires_confirmation'
    ↓
Customer confirms payment method
    ↓
Payment Intent status → 'requires_capture'
(Funds are HELD on customer's card, not charged yet)
```

### **Phase 2: Shopper Assignment**
```
Order assigned to shopper
    ↓
System checks shopper's Stripe Issuing Card:
  - If no card exists → Create virtual card via Stripe Issuing
  - If card exists → Verify active status
    ↓
Load estimated amount onto shopper's card:
  - Transfer from platform account to card spending limit
  - Set authorization controls (grocery stores only)
    ↓
Shopper receives notification:
  - Order details
  - Card last 4 digits
  - Estimated budget
  - Shopping deadline
```

### **Phase 3: Shopping & Checkout**
```
Shopper scans items (tracking total)
    ↓
At store checkout:
  - Shopper uses Stripe Issuing card
  - Card authorizes transaction (grocery store MCC only)
  - Stripe captures actual amount
    ↓
Shopper scans receipt:
  - OCR extracts total
  - System compares: receipt total vs card charge
  - Verify amounts match (fraud detection)
    ↓
Shopper marks shopping complete
```

### **Phase 4: Final Capture & Settlement**
```
Shopping complete
    ↓
Calculate final total:
  - Actual items purchased (from receipt)
  - Unavailable items (refund)
  - Replacements (price adjustment)
  - Damaged/missing items (refund after delivery)
    ↓
Update Payment Intent:
  - If actualTotal < heldAmount → Capture actualTotal, release difference
  - If actualTotal > heldAmount → Capture heldAmount, request additional auth
    ↓
Capture Payment Intent (charge customer)
    ↓
Pay shopper:
  - Shopping fee (flat rate or % of order)
  - Transfer to Connect account
```

### **Phase 5: Post-Delivery Adjustments**
```
Customer reports issues (24hr window)
    ↓
For each issue:
  - System calculates refund
  - Creates Refund object in Stripe
  - Updates fraud score
    ↓
If refund approved:
  - Issue partial refund to customer
  - Deduct from shopper earnings (if shopper fault)
  - Platform absorbs (if legitimate issue)
```

---

## Stripe Implementation Details

### **A. Customer Payment Hold**
```javascript
// Create Payment Intent with hold
const paymentIntent = await stripe.paymentIntents.create({
  amount: estimatedTotalCents + bufferCents, // e.g., $85 + $15 buffer = $100
  currency: 'usd',
  customer: customerId,
  payment_method: customerPaymentMethodId,
  capture_method: 'manual', // Don't charge yet, just hold
  confirm: true,
  metadata: {
    orderId: order.id,
    estimatedTotal: estimatedTotalCents,
    buffer: bufferCents
  }
});
// Status: requires_capture (funds held on card)
```

### **B. Shopper Stripe Issuing Card**
```javascript
// Create virtual card for shopper
const card = await stripe.issuing.cards.create({
  cardholder: shopperCardholderID,
  currency: 'usd',
  type: 'virtual', // Can also be 'physical' for regular shoppers
  spending_controls: {
    spending_limits: [{
      amount: estimatedTotalCents,
      interval: 'per_authorization'
    }],
    allowed_categories: ['grocery_stores_supermarkets'], // MCC 5411
    blocked_categories: ['gambling', 'cash_advances']
  },
  metadata: {
    orderId: order.id,
    shopperId: shopper.id
  }
});

// Card details sent to shopper's app (PCI compliant)
```

### **C. Load Funds to Card**
```javascript
// Transfer from platform account to card
// This happens automatically when card is charged
// Stripe handles the settlement between:
// 1. Customer's held payment
// 2. Store's merchant account
// 3. Platform's account
// 4. Shopper's card authorization

// NO MANUAL TRANSFER NEEDED - Stripe handles it!
```

### **D. Capture Final Amount**
```javascript
// After shopping complete, capture actual amount
const actualTotal = receipt.total + deliveryFee + tax;

if (actualTotal <= paymentIntent.amount) {
  // Capture actual amount, release the rest
  await stripe.paymentIntents.capture(paymentIntent.id, {
    amount_to_capture: actualTotal
  });
} else {
  // Need more money - create new auth
  // Or capture max and request additional payment
}
```

### **E. Pay the Shopper**
```javascript
// Transfer shopping fee to shopper
const transfer = await stripe.transfers.create({
  amount: shoppingFeeCents, // e.g., $10 flat + 5% of order
  currency: 'usd',
  destination: shopperConnectAccountId,
  metadata: {
    orderId: order.id,
    shopperId: shopper.id
  }
});
```

---

## Security & Fraud Prevention

### **Card Controls:**
1. **MCC Restrictions** - Only grocery stores
2. **Amount Limits** - Max = estimated total + 15%
3. **Time Limits** - Card expires after delivery window
4. **Geographic Limits** - Restrict to customer's zip code area
5. **Transaction Monitoring** - Alert on unusual patterns

### **Customer Protection:**
1. **Pre-auth Hold** - No charge until shopping complete
2. **Receipt Verification** - OCR compares totals
3. **Photo Evidence** - Required for all transactions
4. **24hr Inspection** - Time to report issues
5. **Fraud Scoring** - Pattern detection

### **Platform Protection:**
1. **Shopper Background Checks** - Before card issuance
2. **Bond Requirements** - Shoppers post security deposit
3. **Insurance** - Cover fraud losses
4. **Velocity Limits** - Max orders per shopper per day
5. **Manual Review** - High-value orders

---

## Cost Structure

### **Stripe Fees:**
- Payment Intent: 2.9% + $0.30 per transaction
- Issuing Card (virtual): $0 setup, $0.10 per authorization
- Issuing Card (physical): $5 per card
- Connect Transfer: 0.5% per payout to shopper

### **Example Order:**
```
Customer Order: $85.00
Delivery Fee: $7.00
Tax (8%): $7.36
--------------------------
Total: $99.36

Hold Amount: $114.36 (15% buffer)

Stripe Fees:
- Payment processing: $3.18 (2.9% + $0.30)
- Card authorization: $0.10
- Shopper payout (0.5% of $15): $0.08
--------------------------
Total Fees: $3.36

Platform Revenue:
- Delivery fee: $7.00
- Late add fees: $0.20 (2 items)
- Service fee (10%): $8.50
--------------------------
Gross Revenue: $15.70
Net Revenue: $12.34 (after Stripe fees)
```

---

## Alternative: Direct Shopper Payment

If you want shoppers to use their own cards:

### **Reimbursement Model:**
```
1. Shopper uses own card at store
2. Uploads receipt photo
3. System verifies receipt
4. Reimburse shopper via Stripe Transfer
5. Charge customer for actual total
```

**Pros:**
- No Issuing fees
- Simpler for occasional shoppers

**Cons:**
- Shoppers must front money
- Slower reimbursement
- Higher fraud risk
- Less professional

---

## Recommendations

### **For Your Service:**

**Option 1: Stripe Issuing (Recommended)**
- Use virtual cards for shoppers
- Instant fund availability
- Professional experience
- Better fraud control
- Scalable

**Option 2: Hybrid Approach**
- Frequent shoppers get Issuing cards
- Occasional shoppers get reimbursed
- Best of both worlds

---

## Implementation Priority

1. ✅ **Phase 1: Payment Intents** (Holds)
2. ✅ **Phase 2: Connect Accounts** (Shoppers)
3. ✅ **Phase 3: Issuing Cards** (Virtual cards)
4. ⏳ **Phase 4: Receipt OCR** (Verification)
5. ⏳ **Phase 5: Refund Automation**
6. ⏳ **Phase 6: Physical Cards** (Scale)

---

## Next Steps

Would you like me to implement:
1. Stripe Connect setup for shoppers?
2. Payment Intent creation flow?
3. Issuing card management?
4. Receipt OCR verification?

The payment infrastructure is the foundation - let's build it right!
