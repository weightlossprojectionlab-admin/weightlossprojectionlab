/**
 * Complete Stripe Order Flow Example
 *
 * This file demonstrates the complete payment flow for a shop-and-deliver order
 * from creation through completion, including all Stripe operations.
 *
 * NOTE: This is an example/reference file, not meant to be executed directly.
 */

import {
  createPaymentIntent,
  capturePaymentIntent,
  cancelPaymentIntent,
  createShopperConnectAccount,
  createAccountOnboardingLink,
  createCardholder,
  createIssuingCard,
  updateCardSpendingLimit,
  cancelIssuingCard,
  transferShopperPayment,
  processRefund,
  calculatePlatformFees,
} from '../lib/stripe-operations';

import { formatCurrency, STRIPE_CONFIG } from '../lib/stripe-config';

// ============================================================================
// PHASE 1: ORDER CREATION & PAYMENT HOLD
// ============================================================================

async function phase1_CreateOrderAndHoldPayment() {
  console.log('=== PHASE 1: Create Order & Hold Payment ===\n');

  // Order details
  const order = {
    id: 'order_123',
    customerId: 'cus_abc123', // Stripe customer ID
    paymentMethodId: 'pm_xyz789', // Customer's payment method
    items: [
      { name: 'Organic Bananas', quantity: 2, price: 599 },
      { name: 'Whole Milk', quantity: 1, price: 499 },
      { name: 'Bread', quantity: 1, price: 399 },
    ],
    subtotal: 1497, // $14.97
    deliveryFee: 700, // $7.00
    serviceFee: 150, // $1.50 (10% of subtotal)
    taxEstimate: 117, // $1.17 (estimated 8%)
  };

  // Calculate total
  const estimatedTotal =
    order.subtotal + order.deliveryFee + order.serviceFee + order.taxEstimate;

  console.log('Order Details:');
  console.log(`  Subtotal: ${formatCurrency(order.subtotal)}`);
  console.log(`  Delivery: ${formatCurrency(order.deliveryFee)}`);
  console.log(`  Service Fee: ${formatCurrency(order.serviceFee)}`);
  console.log(`  Tax (est): ${formatCurrency(order.taxEstimate)}`);
  console.log(`  Total: ${formatCurrency(estimatedTotal)}\n`);

  // Create payment intent (holds funds, doesn't charge yet)
  const paymentIntent = await createPaymentIntent(
    order.id,
    order.customerId,
    estimatedTotal,
    order.paymentMethodId,
    {
      deliveryFee: order.deliveryFee,
      taxEstimate: order.taxEstimate,
    }
  );

  const buffer = Math.round(estimatedTotal * STRIPE_CONFIG.PAYMENT_BUFFER_PERCENTAGE);
  const totalHeld = estimatedTotal + buffer;

  console.log('Payment Intent Created:');
  console.log(`  ID: ${paymentIntent.id}`);
  console.log(`  Status: ${paymentIntent.status}`); // 'requires_capture'
  console.log(`  Amount Held: ${formatCurrency(totalHeld)}`);
  console.log(`  Buffer: ${formatCurrency(buffer)} (15%)\n`);

  return {
    orderId: order.id,
    paymentIntentId: paymentIntent.id,
    estimatedTotal,
    totalHeld,
  };
}

// ============================================================================
// PHASE 2: SHOPPER ONBOARDING (One-time setup)
// ============================================================================

async function phase2_OnboardShopper() {
  console.log('=== PHASE 2: Shopper Onboarding (One-time) ===\n');

  const shopper = {
    id: 'shopper_456',
    email: 'john.shopper@example.com',
    name: 'John Shopper',
    phone: '+14155551234',
    address: {
      line1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'US',
    },
  };

  // Step 1: Create Connect account
  console.log('Creating Connect account...');
  const connectAccount = await createShopperConnectAccount(
    shopper.id,
    shopper.email,
    { backgroundCheck: 'passed' }
  );

  console.log(`  Account ID: ${connectAccount.id}`);
  console.log(`  Charges Enabled: ${connectAccount.charges_enabled}`);
  console.log(`  Payouts Enabled: ${connectAccount.payouts_enabled}\n`);

  // Step 2: Create onboarding link
  console.log('Creating onboarding link...');
  const onboardingLink = await createAccountOnboardingLink(
    connectAccount.id,
    'https://app.com/shopper/onboarding-refresh',
    'https://app.com/shopper/dashboard'
  );

  console.log(`  Onboarding URL: ${onboardingLink.url}`);
  console.log('  (Shopper completes verification via this link)\n');

  // Step 3: Create cardholder for issuing cards
  console.log('Creating cardholder profile...');
  const cardholder = await createCardholder(
    shopper.id,
    shopper.name,
    shopper.email,
    shopper.phone,
    shopper.address
  );

  console.log(`  Cardholder ID: ${cardholder.id}`);
  console.log(`  Status: ${cardholder.status}\n`);

  return {
    shopperId: shopper.id,
    connectAccountId: connectAccount.id,
    cardholderId: cardholder.id,
  };
}

// ============================================================================
// PHASE 3: ASSIGN SHOPPER & ISSUE CARD
// ============================================================================

async function phase3_AssignShopperAndIssueCard(
  orderId: string,
  estimatedTotal: number,
  shopperData: { shopperId: string; cardholderId: string }
) {
  console.log('=== PHASE 3: Assign Shopper & Issue Card ===\n');

  // Calculate card spending limit (estimated total + 15% buffer)
  const spendingLimit = estimatedTotal + Math.round(estimatedTotal * 0.15);

  console.log(`Creating virtual card for shopper ${shopperData.shopperId}...`);
  const card = await createIssuingCard(
    shopperData.shopperId,
    shopperData.cardholderId,
    spendingLimit,
    orderId
  );

  console.log('Card Created:');
  console.log(`  Card ID: ${card.id}`);
  console.log(`  Type: ${card.type}`); // 'virtual'
  console.log(`  Last 4: ${card.last4}`);
  console.log(`  Spending Limit: ${formatCurrency(spendingLimit)}`);
  console.log(`  Allowed: Grocery stores only`);
  console.log(`  Status: ${card.status}\n`);

  console.log('Shopper notified:');
  console.log(`  Order: ${orderId}`);
  console.log(`  Budget: ${formatCurrency(spendingLimit)}`);
  console.log(`  Card ending in: ${card.last4}\n`);

  return {
    cardId: card.id,
    spendingLimit,
  };
}

// ============================================================================
// PHASE 4: SHOPPING IN PROGRESS
// ============================================================================

async function phase4_ShoppingInProgress(
  orderId: string,
  cardId: string,
  originalLimit: number
) {
  console.log('=== PHASE 4: Shopping In Progress ===\n');

  console.log('Shopper scans items and tracks total...');
  console.log('  Bananas (2): $5.99');
  console.log('  Milk (1): $4.99');
  console.log('  Bread (1): $3.99');
  console.log('  Eggs (1): $4.49 [Late addition]');
  console.log('  Current total: $19.46\n');

  // Customer adds item - need to increase card limit
  const newEstimate = 1946; // $19.46
  const newLimit = newEstimate + Math.round(newEstimate * 0.15);

  console.log('Late item added - updating card limit...');
  await updateCardSpendingLimit(cardId, newLimit);
  console.log(`  New limit: ${formatCurrency(newLimit)}\n`);

  console.log('Shopper checks out at store:');
  console.log('  Using virtual card ending in ****');
  console.log('  Store: Whole Foods Market');
  console.log('  Amount charged: $20.63 (with tax)');
  console.log('  Authorization: Approved ✓\n');

  // Webhook received: issuing_authorization.request
  console.log('Webhook received: issuing_authorization.request');
  console.log('  Amount: $20.63');
  console.log('  Merchant: Whole Foods');
  console.log('  MCC: 5411 (Grocery Store) ✓\n');

  return {
    actualTotal: 2063, // $20.63 charged at store
  };
}

// ============================================================================
// PHASE 5: COMPLETE ORDER & SETTLEMENT
// ============================================================================

async function phase5_CompleteOrderAndSettle(
  orderId: string,
  paymentIntentId: string,
  actualTotal: number,
  cardId: string,
  shopperData: { shopperId: string; connectAccountId: string }
) {
  console.log('=== PHASE 5: Complete Order & Settlement ===\n');

  console.log('Receipt scanned and verified:');
  console.log(`  Total on receipt: ${formatCurrency(actualTotal)}`);
  console.log(`  Card charge: ${formatCurrency(actualTotal)}`);
  console.log('  Match: ✓\n');

  // Step 1: Capture payment from customer
  console.log('Capturing payment from customer...');
  const paymentIntent = await capturePaymentIntent(paymentIntentId, actualTotal);

  console.log('Payment Captured:');
  console.log(`  Amount: ${formatCurrency(paymentIntent.amount_received!)}`);
  console.log(`  Status: ${paymentIntent.status}\n`);

  // Step 2: Calculate shopper payment
  const baseFee = 1000; // $10.00 flat fee
  const percentageFee = Math.round(actualTotal * 0.05); // 5% of order
  const tips = 200; // $2.00 tip from customer
  const shopperTotal = baseFee + percentageFee + tips;

  console.log('Calculating shopper payment:');
  console.log(`  Base fee: ${formatCurrency(baseFee)}`);
  console.log(`  Percentage (5%): ${formatCurrency(percentageFee)}`);
  console.log(`  Tips: ${formatCurrency(tips)}`);
  console.log(`  Total: ${formatCurrency(shopperTotal)}\n`);

  // Step 3: Transfer to shopper
  console.log('Transferring payment to shopper...');
  const transfer = await transferShopperPayment(
    shopperData.shopperId,
    shopperData.connectAccountId,
    shopperTotal,
    orderId,
    { baseFee, percentageFee, tips, bonuses: 0 }
  );

  console.log('Transfer Complete:');
  console.log(`  Transfer ID: ${transfer.id}`);
  console.log(`  Amount: ${formatCurrency(transfer.amount)}`);
  console.log(`  Destination: ${transfer.destination}\n`);

  // Step 4: Cancel the card
  console.log('Canceling virtual card...');
  await cancelIssuingCard(cardId);
  console.log('  Card canceled ✓\n');

  // Calculate platform revenue
  const fees = calculatePlatformFees(actualTotal, shopperTotal);

  console.log('Platform Revenue Analysis:');
  console.log(`  Customer paid: ${formatCurrency(actualTotal)}`);
  console.log(`  Shopper payment: ${formatCurrency(shopperTotal)}`);
  console.log(`  Stripe fees: ${formatCurrency(fees.totalFees)}`);
  console.log(
    `  Net revenue: ${formatCurrency(actualTotal - shopperTotal - fees.totalFees)}\n`
  );

  return {
    transfer,
    fees,
  };
}

// ============================================================================
// PHASE 6: POST-DELIVERY REFUND (Optional)
// ============================================================================

async function phase6_ProcessRefund(
  orderId: string,
  paymentIntentId: string,
  refundAmount: number,
  reason: string
) {
  console.log('=== PHASE 6: Process Refund (Optional) ===\n');

  console.log('Customer reported issue:');
  console.log(`  Reason: ${reason}`);
  console.log(`  Refund amount: ${formatCurrency(refundAmount)}\n`);

  console.log('Processing refund...');
  const refund = await processRefund(
    orderId,
    paymentIntentId,
    refundAmount,
    reason,
    { itemIds: '["item_eggs"]' }
  );

  console.log('Refund Issued:');
  console.log(`  Refund ID: ${refund.id}`);
  console.log(`  Amount: ${formatCurrency(refund.amount)}`);
  console.log(`  Status: ${refund.status}\n`);

  return refund;
}

// ============================================================================
// ALTERNATIVE: CANCEL ORDER BEFORE SHOPPING
// ============================================================================

async function alternativeFlow_CancelOrder(
  paymentIntentId: string,
  cardId: string,
  reason: string
) {
  console.log('=== ALTERNATIVE: Cancel Order Before Shopping ===\n');

  console.log(`Cancellation reason: ${reason}\n`);

  // Cancel payment intent (release held funds)
  console.log('Releasing held funds...');
  const paymentIntent = await cancelPaymentIntent(paymentIntentId, reason);
  console.log(`  Payment Intent: ${paymentIntent.status} (canceled)\n`);

  // Cancel issuing card
  console.log('Canceling card...');
  await cancelIssuingCard(cardId);
  console.log('  Card: canceled\n');

  console.log('Order cancelled successfully. No charges made.');
}

// ============================================================================
// MAIN FLOW ORCHESTRATION
// ============================================================================

async function runCompleteOrderFlow() {
  try {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  COMPLETE STRIPE ORDER FLOW - Shop & Deliver Service      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Phase 1: Create order and hold payment
    const { orderId, paymentIntentId, estimatedTotal, totalHeld } =
      await phase1_CreateOrderAndHoldPayment();

    // Phase 2: Onboard shopper (one-time setup)
    const shopperData = await phase2_OnboardShopper();

    // Phase 3: Assign shopper and issue card
    const { cardId } = await phase3_AssignShopperAndIssueCard(
      orderId,
      estimatedTotal,
      shopperData
    );

    // Phase 4: Shopping in progress
    const { actualTotal } = await phase4_ShoppingInProgress(
      orderId,
      cardId,
      estimatedTotal
    );

    // Phase 5: Complete order and settle
    await phase5_CompleteOrderAndSettle(
      orderId,
      paymentIntentId,
      actualTotal,
      cardId,
      shopperData
    );

    // Phase 6: Optional refund (if customer reports issue)
    const refundAmount = 449; // $4.49 for damaged eggs
    await phase6_ProcessRefund(
      orderId,
      paymentIntentId,
      refundAmount,
      'Damaged eggs on delivery'
    );

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ORDER COMPLETED SUCCESSFULLY                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Example: Alternative flow - cancellation
    console.log('\n--- ALTERNATIVE SCENARIO ---\n');
    await alternativeFlow_CancelOrder(
      paymentIntentId,
      cardId,
      'Customer cancelled before shopping started'
    );
  } catch (error) {
    console.error('\n❌ ERROR:', error);
  }
}

// ============================================================================
// EXPORTS (for use in API routes)
// ============================================================================

export {
  phase1_CreateOrderAndHoldPayment,
  phase2_OnboardShopper,
  phase3_AssignShopperAndIssueCard,
  phase4_ShoppingInProgress,
  phase5_CompleteOrderAndSettle,
  phase6_ProcessRefund,
  alternativeFlow_CancelOrder,
  runCompleteOrderFlow,
};

// Uncomment to run the complete flow (for testing/demo purposes)
// runCompleteOrderFlow();
