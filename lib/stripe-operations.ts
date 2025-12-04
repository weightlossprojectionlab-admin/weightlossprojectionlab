/**
 * Stripe Payment Operations
 *
 * This module contains all Stripe API operations for the shop-and-deliver service.
 * All functions are designed for server-side use only.
 */

import Stripe from 'stripe';
import { stripe, STRIPE_CONFIG, dollarsToCents, getStripeDashboardUrl } from './stripe-config';
import type {
  PaymentIntentMetadata,
  ShopperEarnings,
  StripeConnectAccount,
  StripeIssuingCard,
  SpendingControl,
} from '../types/stripe';

// ============================================================================
// CUSTOMER PAYMENT OPERATIONS
// ============================================================================

/**
 * Create Payment Intent (Hold Customer Funds)
 *
 * Creates a payment intent with manual capture to hold funds on customer's card
 * without charging immediately. Funds are held until shopping is complete.
 *
 * @param orderId - Internal order ID
 * @param customerId - Stripe customer ID (cus_xxx)
 * @param amount - Estimated order total in cents
 * @param paymentMethodId - Customer's payment method ID
 * @param metadata - Additional order metadata
 * @returns Stripe Payment Intent
 *
 * @example
 * const intent = await createPaymentIntent(
 *   'order_123',
 *   'cus_abc',
 *   8500, // $85.00
 *   'pm_123',
 *   { deliveryFee: 700, taxEstimate: 680 }
 * );
 */
export async function createPaymentIntent(
  orderId: string,
  customerId: string,
  amount: number,
  paymentMethodId: string,
  metadata: Partial<PaymentIntentMetadata> = {}
): Promise<Stripe.PaymentIntent> {
  try {
    // Calculate buffer amount (15% safety margin)
    const bufferAmount = Math.round(amount * STRIPE_CONFIG.PAYMENT_BUFFER_PERCENTAGE);
    const totalAmount = amount + bufferAmount;

    // Validate amount limits
    if (totalAmount > STRIPE_CONFIG.LIMITS.MAX_ORDER_AMOUNT) {
      throw new Error(
        `Order amount exceeds maximum limit of ${STRIPE_CONFIG.LIMITS.MAX_ORDER_AMOUNT / 100}`
      );
    }

    if (totalAmount < STRIPE_CONFIG.LIMITS.MIN_ORDER_AMOUNT) {
      throw new Error(
        `Order amount below minimum limit of ${STRIPE_CONFIG.LIMITS.MIN_ORDER_AMOUNT / 100}`
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: STRIPE_CONFIG.CURRENCY,
      customer: customerId,
      payment_method: paymentMethodId,
      capture_method: STRIPE_CONFIG.CAPTURE_METHOD, // 'manual' - don't charge yet
      confirm: true, // Confirm immediately to hold funds
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // No redirect flows
      },
      metadata: {
        orderId,
        customerId: metadata.customerId || '',
        estimatedTotal: amount.toString(),
        buffer: bufferAmount.toString(),
        deliveryFee: (metadata.deliveryFee || 0).toString(),
        lateAddFees: (metadata.lateAddFees || 0).toString(),
        taxEstimate: (metadata.taxEstimate || 0).toString(),
      },
    });

    console.log(`Payment Intent created: ${paymentIntent.id} for order ${orderId}`);
    console.log(`Dashboard: ${getStripeDashboardUrl('payment_intents', paymentIntent.id)}`);

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error(
      `Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Capture Payment Intent (Charge Customer)
 *
 * Captures the held funds after shopping is complete.
 * Can capture less than the held amount to refund the difference.
 *
 * @param paymentIntentId - Stripe payment intent ID
 * @param finalAmount - Final amount to charge in cents (optional, defaults to full amount)
 * @returns Updated Payment Intent
 *
 * @example
 * // Capture exact amount spent ($82.36 instead of $85 held)
 * await capturePaymentIntent('pi_123', 8236);
 */
export async function capturePaymentIntent(
  paymentIntentId: string,
  finalAmount?: number
): Promise<Stripe.PaymentIntent> {
  try {
    const captureParams: Stripe.PaymentIntentCaptureParams = {};

    if (finalAmount !== undefined) {
      captureParams.amount_to_capture = finalAmount;
    }

    const paymentIntent = await stripe.paymentIntents.capture(
      paymentIntentId,
      captureParams
    );

    console.log(`Payment Intent captured: ${paymentIntentId}`);
    console.log(`Amount charged: ${paymentIntent.amount_received / 100}`);

    return paymentIntent;
  } catch (error) {
    console.error('Error capturing payment intent:', error);
    throw new Error(
      `Failed to capture payment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Cancel Payment Intent (Release Hold)
 *
 * Cancels a payment intent and releases the held funds.
 * Use this if order is cancelled before shopping.
 *
 * @param paymentIntentId - Stripe payment intent ID
 * @param reason - Cancellation reason
 * @returns Canceled Payment Intent
 */
export async function cancelPaymentIntent(
  paymentIntentId: string,
  reason?: string
): Promise<Stripe.PaymentIntent> {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: 'requested_by_customer',
    });

    console.log(`Payment Intent canceled: ${paymentIntentId}. Reason: ${reason || 'None provided'}`);

    return paymentIntent;
  } catch (error) {
    console.error('Error canceling payment intent:', error);
    throw new Error(
      `Failed to cancel payment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// SHOPPER CONNECT ACCOUNT OPERATIONS
// ============================================================================

/**
 * Create Shopper Connect Account
 *
 * Creates a Stripe Connect Express account for a shopper to receive payments.
 * The shopper will need to complete onboarding via the account link.
 *
 * @param shopperId - Internal shopper ID
 * @param email - Shopper's email
 * @param metadata - Additional shopper metadata
 * @returns Stripe Connect Account
 *
 * @example
 * const account = await createShopperConnectAccount('shopper_123', 'john@example.com');
 */
export async function createShopperConnectAccount(
  shopperId: string,
  email: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.Account> {
  try {
    const account = await stripe.accounts.create({
      type: STRIPE_CONFIG.CONNECT_ACCOUNT_TYPE, // 'express'
      email,
      capabilities: {
        transfers: { requested: true }, // Receive transfers
      },
      business_type: 'individual',
      metadata: {
        shopperId,
        ...metadata,
      },
      settings: {
        payouts: {
          schedule: STRIPE_CONFIG.PAYOUT_SCHEDULE,
        },
      },
    });

    console.log(`Connect Account created: ${account.id} for shopper ${shopperId}`);
    console.log(`Dashboard: ${getStripeDashboardUrl('connect/accounts', account.id)}`);

    return account;
  } catch (error) {
    console.error('Error creating Connect account:', error);
    throw new Error(
      `Failed to create shopper account: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create Account Onboarding Link
 *
 * Generates a link for shopper to complete their Connect account setup.
 *
 * @param accountId - Stripe Connect account ID
 * @param refreshUrl - URL to return if link expires
 * @param returnUrl - URL to return after onboarding complete
 * @returns Account Link
 */
export async function createAccountOnboardingLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink;
  } catch (error) {
    console.error('Error creating account link:', error);
    throw new Error(
      `Failed to create onboarding link: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get Connect Account Details
 *
 * Retrieves current status and details of a Connect account.
 *
 * @param accountId - Stripe Connect account ID
 * @returns Stripe Account
 */
export async function getConnectAccount(accountId: string): Promise<Stripe.Account> {
  try {
    return await stripe.accounts.retrieve(accountId);
  } catch (error) {
    console.error('Error retrieving Connect account:', error);
    throw new Error(
      `Failed to retrieve account: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// ISSUING CARD OPERATIONS
// ============================================================================

/**
 * Create Cardholder for Shopper
 *
 * Creates a cardholder profile required before issuing cards.
 * This is a one-time setup per shopper.
 *
 * @param shopperId - Internal shopper ID
 * @param name - Shopper's full name
 * @param email - Shopper's email
 * @param phone - Shopper's phone number
 * @param billingAddress - Billing address
 * @returns Stripe Cardholder
 */
export async function createCardholder(
  shopperId: string,
  name: string,
  email: string,
  phone: string,
  billingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }
): Promise<Stripe.Issuing.Cardholder> {
  try {
    const cardholder = await stripe.issuing.cardholders.create({
      name,
      email,
      phone_number: phone,
      type: 'individual',
      billing: {
        address: {
          line1: billingAddress.line1,
          line2: billingAddress.line2 || undefined,
          city: billingAddress.city,
          state: billingAddress.state,
          postal_code: billingAddress.postalCode,
          country: billingAddress.country,
        },
      },
      metadata: {
        shopperId,
      },
    });

    console.log(`Cardholder created: ${cardholder.id} for shopper ${shopperId}`);

    return cardholder;
  } catch (error) {
    console.error('Error creating cardholder:', error);
    throw new Error(
      `Failed to create cardholder: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create Issuing Card for Shopper
 *
 * Creates a virtual card with spending controls for a specific shopping order.
 *
 * @param shopperId - Internal shopper ID
 * @param cardholderId - Stripe cardholder ID
 * @param spendingLimit - Maximum spend amount in cents
 * @param orderId - Associated order ID
 * @returns Stripe Issuing Card
 *
 * @example
 * const card = await createIssuingCard('shopper_123', 'ich_abc', 10000, 'order_456');
 */
export async function createIssuingCard(
  shopperId: string,
  cardholderId: string,
  spendingLimit: number,
  orderId?: string
): Promise<Stripe.Issuing.Card> {
  try {
    // Validate spending limit
    if (spendingLimit > STRIPE_CONFIG.LIMITS.MAX_CARD_SPENDING_LIMIT) {
      throw new Error(
        `Spending limit exceeds maximum of ${STRIPE_CONFIG.LIMITS.MAX_CARD_SPENDING_LIMIT / 100}`
      );
    }

    const card = await stripe.issuing.cards.create({
      cardholder: cardholderId,
      currency: STRIPE_CONFIG.CURRENCY,
      type: STRIPE_CONFIG.CARD_TYPE, // 'virtual'
      spending_controls: {
        spending_limits: [
          {
            amount: spendingLimit,
            interval: 'per_authorization',
          },
        ],
        allowed_categories: [...STRIPE_CONFIG.ALLOWED_MCC_CATEGORIES] as any,
        blocked_categories: [...STRIPE_CONFIG.BLOCKED_MCC_CATEGORIES] as any,
      },
      metadata: {
        shopperId,
        orderId: orderId || '',
        estimatedBudget: spendingLimit.toString(),
      },
    });

    console.log(`Issuing Card created: ${card.id} for shopper ${shopperId}`);
    console.log(`Dashboard: ${getStripeDashboardUrl('issuing/cards', card.id)}`);

    return card;
  } catch (error) {
    console.error('Error creating issuing card:', error);
    throw new Error(
      `Failed to create card: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Update Card Spending Limit
 *
 * Updates the spending limit on an existing card.
 * Useful if order total changes.
 *
 * @param cardId - Stripe card ID
 * @param newLimit - New spending limit in cents
 * @returns Updated Card
 */
export async function updateCardSpendingLimit(
  cardId: string,
  newLimit: number
): Promise<Stripe.Issuing.Card> {
  try {
    const card = await stripe.issuing.cards.update(cardId, {
      spending_controls: {
        spending_limits: [
          {
            amount: newLimit,
            interval: 'per_authorization',
          },
        ],
      },
    });

    console.log(`Card spending limit updated: ${cardId} to ${newLimit / 100}`);

    return card;
  } catch (error) {
    console.error('Error updating card spending limit:', error);
    throw new Error(
      `Failed to update card limit: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Cancel Issuing Card
 *
 * Cancels a card after shopping is complete or if order is cancelled.
 *
 * @param cardId - Stripe card ID
 * @returns Canceled Card
 */
export async function cancelIssuingCard(cardId: string): Promise<Stripe.Issuing.Card> {
  try {
    const card = await stripe.issuing.cards.update(cardId, {
      status: 'canceled',
    });

    console.log(`Card canceled: ${cardId}`);

    return card;
  } catch (error) {
    console.error('Error canceling card:', error);
    throw new Error(
      `Failed to cancel card: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// SHOPPER PAYMENT OPERATIONS
// ============================================================================

/**
 * Transfer Shopper Payment
 *
 * Transfers payment to shopper's Connect account after delivery complete.
 *
 * @param shopperId - Internal shopper ID
 * @param connectAccountId - Stripe Connect account ID
 * @param amount - Total payment amount in cents
 * @param orderId - Associated order ID
 * @param breakdown - Payment breakdown
 * @returns Stripe Transfer
 *
 * @example
 * await transferShopperPayment(
 *   'shopper_123',
 *   'acct_abc',
 *   1500, // $15.00
 *   'order_456',
 *   { baseFee: 1000, percentageFee: 425, tips: 75 }
 * );
 */
export async function transferShopperPayment(
  shopperId: string,
  connectAccountId: string,
  amount: number,
  orderId: string,
  breakdown: {
    baseFee: number;
    percentageFee: number;
    tips?: number;
    bonuses?: number;
  }
): Promise<Stripe.Transfer> {
  try {
    const transfer = await stripe.transfers.create({
      amount,
      currency: STRIPE_CONFIG.CURRENCY,
      destination: connectAccountId,
      metadata: {
        orderId,
        shopperId,
        baseFee: breakdown.baseFee.toString(),
        percentageFee: breakdown.percentageFee.toString(),
        tips: (breakdown.tips || 0).toString(),
        bonuses: (breakdown.bonuses || 0).toString(),
      },
    });

    console.log(`Transfer created: ${transfer.id} - ${amount / 100} to ${connectAccountId}`);
    console.log(`Dashboard: ${getStripeDashboardUrl('transfers', transfer.id)}`);

    return transfer;
  } catch (error) {
    console.error('Error creating transfer:', error);
    throw new Error(
      `Failed to transfer payment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Reverse Shopper Payment
 *
 * Reverses a transfer if issues discovered after payment (fraud, etc.).
 *
 * @param transferId - Stripe transfer ID
 * @param amount - Amount to reverse (optional, defaults to full amount)
 * @param reason - Reversal reason
 * @returns Transfer Reversal
 */
export async function reverseShopperPayment(
  transferId: string,
  amount?: number,
  reason?: string
): Promise<Stripe.TransferReversal> {
  try {
    const reversal = await stripe.transfers.createReversal(transferId, {
      amount,
      metadata: {
        reason: reason || 'unspecified',
      },
    });

    console.log(`Transfer reversed: ${transferId}. Amount: ${reversal.amount / 100}`);

    return reversal;
  } catch (error) {
    console.error('Error reversing transfer:', error);
    throw new Error(
      `Failed to reverse payment: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// REFUND OPERATIONS
// ============================================================================

/**
 * Process Refund
 *
 * Issues a refund to customer for missing/damaged items or overcharges.
 *
 * @param orderId - Internal order ID
 * @param paymentIntentId - Stripe payment intent ID
 * @param amount - Refund amount in cents
 * @param reason - Refund reason
 * @param metadata - Additional refund metadata
 * @returns Stripe Refund
 *
 * @example
 * await processRefund(
 *   'order_123',
 *   'pi_abc',
 *   350, // $3.50
 *   'Missing 2 items',
 *   { itemIds: ['item_1', 'item_2'] }
 * );
 */
export async function processRefund(
  orderId: string,
  paymentIntentId: string,
  amount: number,
  reason: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.Refund> {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason: 'requested_by_customer',
      metadata: {
        orderId,
        reason,
        ...metadata,
      },
    });

    console.log(`Refund created: ${refund.id} - ${amount / 100} for order ${orderId}`);
    console.log(`Dashboard: ${getStripeDashboardUrl('refunds', refund.id)}`);

    return refund;
  } catch (error) {
    console.error('Error processing refund:', error);
    throw new Error(
      `Failed to process refund: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// UTILITY OPERATIONS
// ============================================================================

/**
 * Calculate Platform Fees
 *
 * Calculates all Stripe fees for an order.
 *
 * @param orderAmount - Order amount in cents
 * @param shopperPayment - Shopper payment amount in cents
 * @returns Fee breakdown
 */
export function calculatePlatformFees(
  orderAmount: number,
  shopperPayment: number
): {
  paymentProcessingFee: number;
  issuingAuthFee: number;
  transferFee: number;
  totalFees: number;
} {
  // Payment processing: 2.9% + $0.30
  const paymentProcessingFee =
    Math.round((orderAmount * STRIPE_CONFIG.FEES.PAYMENT_PROCESSING_PERCENTAGE) / 10000) +
    STRIPE_CONFIG.FEES.PAYMENT_PROCESSING_FIXED;

  // Issuing authorization: $0.10
  const issuingAuthFee = STRIPE_CONFIG.FEES.ISSUING_AUTHORIZATION;

  // Connect transfer: 0.5% of shopper payment
  const transferFee = Math.round(
    (shopperPayment * STRIPE_CONFIG.FEES.CONNECT_TRANSFER_PERCENTAGE) / 10000
  );

  return {
    paymentProcessingFee,
    issuingAuthFee,
    transferFee,
    totalFees: paymentProcessingFee + issuingAuthFee + transferFee,
  };
}

/**
 * Get Payment Intent Details
 *
 * Retrieves full payment intent details.
 *
 * @param paymentIntentId - Stripe payment intent ID
 * @returns Payment Intent
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw new Error(
      `Failed to get payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * List Shopper Transfers
 *
 * Gets all transfers for a shopper's Connect account.
 *
 * @param connectAccountId - Stripe Connect account ID
 * @param limit - Number of results to return
 * @returns List of transfers
 */
export async function listShopperTransfers(
  connectAccountId: string,
  limit: number = 10
): Promise<Stripe.Transfer[]> {
  try {
    const transfers = await stripe.transfers.list({
      destination: connectAccountId,
      limit,
    });

    return transfers.data;
  } catch (error) {
    console.error('Error listing transfers:', error);
    throw new Error(
      `Failed to list transfers: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get Issuing Authorization
 *
 * Retrieves details of a card authorization (shopper's store purchase).
 *
 * @param authorizationId - Stripe authorization ID
 * @returns Issuing Authorization
 */
export async function getIssuingAuthorization(
  authorizationId: string
): Promise<Stripe.Issuing.Authorization> {
  try {
    return await stripe.issuing.authorizations.retrieve(authorizationId);
  } catch (error) {
    console.error('Error retrieving authorization:', error);
    throw new Error(
      `Failed to get authorization: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
