/**
 * Stripe Payment Infrastructure Types
 *
 * This file defines TypeScript interfaces for the shop-and-deliver
 * grocery service payment flow using Stripe.
 */

import type Stripe from 'stripe';

/**
 * Stripe Connect Account for Shoppers
 * Shoppers receive payments via Connect transfers
 */
export interface StripeConnectAccount {
  id: string; // Stripe Connect account ID (acct_xxx)
  shopperId: string; // Our internal shopper ID
  email: string; // Shopper's email
  status: 'pending' | 'active' | 'disabled' | 'rejected';
  accountType: 'express' | 'standard' | 'custom'; // Stripe account type
  chargesEnabled: boolean; // Can receive payments
  payoutsEnabled: boolean; // Can withdraw funds
  requirementsStatus: 'pending' | 'complete' | 'past_due';
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    shopperRating?: number;
    totalDeliveries?: number;
    backgroundCheckStatus?: string;
  };
}

/**
 * Stripe Issuing Card for Shoppers
 * Virtual cards used to pay at grocery stores
 */
export interface StripeIssuingCard {
  id: string; // Stripe card ID (ic_xxx)
  shopperId: string; // Our internal shopper ID
  cardholderID: string; // Stripe cardholder ID (ich_xxx)
  type: 'virtual' | 'physical';
  status: 'active' | 'inactive' | 'canceled';
  last4: string; // Last 4 digits for shopper reference
  brand: 'Visa' | 'Mastercard';
  expMonth: number;
  expYear: number;
  spendingLimits: {
    amount: number; // In cents
    interval: 'per_authorization' | 'daily' | 'weekly' | 'monthly';
  }[];
  allowedCategories: string[]; // MCC codes (e.g., 'grocery_stores_supermarkets')
  blockedCategories: string[]; // Restricted MCC codes
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    orderId?: string;
    estimatedBudget?: number;
    shoppingDeadline?: string;
  };
}

/**
 * Payment Intent Metadata
 * Tracks customer payment holds and captures
 */
export interface PaymentIntentMetadata {
  orderId: string; // Our internal order ID
  customerId: string; // Our internal customer ID
  estimatedTotal: number; // Estimated order total in cents
  buffer: number; // Safety buffer in cents (10-15%)
  deliveryFee: number; // Delivery fee in cents
  lateAddFees?: number; // Late item fees in cents
  taxEstimate: number; // Estimated tax in cents
  status: 'requires_confirmation' | 'requires_capture' | 'succeeded' | 'canceled';
  receiptUrl?: string; // URL to scanned receipt
  actualTotal?: number; // Final amount charged (after shopping)
  capturedAt?: Date;
  refundedAmount?: number; // Total refunded in cents
}

/**
 * Stripe Payment Intent with our metadata
 */
export interface StripePaymentIntent extends Stripe.PaymentIntent {
  metadata: {
    orderId: string;
    customerId: string;
    estimatedTotal: string;
    buffer: string;
    deliveryFee: string;
    lateAddFees?: string;
    taxEstimate: string;
    [key: string]: string;
  };
}

/**
 * Shopper Earnings Tracking
 * Tracks payments to shoppers via Connect transfers
 */
export interface ShopperEarnings {
  id: string; // Earnings record ID
  shopperId: string; // Our internal shopper ID
  orderId: string; // Associated order ID
  transferId: string; // Stripe transfer ID (tr_xxx)
  amount: number; // Total payment in cents
  breakdown: {
    baseFee: number; // Flat fee per order (e.g., $10)
    percentageFee: number; // Percentage of order value (e.g., 5%)
    tips?: number; // Customer tips
    bonuses?: number; // Performance bonuses
  };
  status: 'pending' | 'paid' | 'reversed';
  paidAt?: Date;
  reversalReason?: string; // If reversed due to fraud/issues
  metadata?: {
    deliveryTime?: number; // Minutes to complete delivery
    customerRating?: number;
    itemsDelivered?: number;
  };
}

/**
 * Refund Request
 * Customer refund for missing/damaged items or overcharges
 */
export interface RefundRequest {
  id: string; // Refund record ID
  orderId: string; // Associated order ID
  customerId: string; // Our internal customer ID
  paymentIntentId: string; // Stripe payment intent ID
  amount: number; // Refund amount in cents
  reason: 'missing_items' | 'damaged_items' | 'price_discrepancy' | 'customer_service' | 'fraud';
  description?: string; // Detailed explanation
  status: 'pending' | 'approved' | 'denied' | 'issued';
  refundId?: string; // Stripe refund ID (re_xxx)
  requestedAt: Date;
  processedAt?: Date;
  metadata?: {
    affectedItems?: string[]; // Item IDs
    photosUrl?: string[]; // Evidence photos
    deductFromShopper?: boolean; // If shopper fault
  };
}

/**
 * Issuing Authorization Event
 * Tracks card usage at stores
 */
export interface IssuingAuthorization {
  id: string; // Stripe authorization ID (iauth_xxx)
  cardId: string; // Stripe card ID
  orderId: string; // Our order ID
  shopperId: string; // Our shopper ID
  amount: number; // Transaction amount in cents
  merchantName: string; // Store name
  merchantCategory: string; // MCC code
  status: 'pending' | 'approved' | 'declined';
  approvedAt?: Date;
  declinedReason?: string;
  metadata?: {
    receiptTotal?: number; // OCR extracted total
    matchesReceipt?: boolean; // Fraud check
  };
}

/**
 * Webhook Event Types
 * Stripe events we need to handle
 */
export type StripeWebhookEvent =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'issuing_authorization.request'
  | 'issuing_authorization.updated'
  | 'charge.refunded'
  | 'account.updated'
  | 'transfer.created'
  | 'transfer.reversed';

/**
 * Webhook Event Handler Data
 */
export interface WebhookEventData {
  type: StripeWebhookEvent;
  data: {
    object: Stripe.PaymentIntent | Stripe.Issuing.Authorization | Stripe.Refund | Stripe.Account | Stripe.Transfer;
  };
  created: number;
}

/**
 * Cardholder for Stripe Issuing
 * Required to create cards for shoppers
 */
export interface StripeCardholder {
  id: string; // Stripe cardholder ID (ich_xxx)
  shopperId: string; // Our internal shopper ID
  name: string; // Shopper's full name
  email: string;
  phoneNumber: string;
  status: 'active' | 'inactive' | 'blocked';
  billing: {
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  createdAt: Date;
  metadata?: {
    backgroundCheckStatus?: string;
    verificationLevel?: string;
  };
}

/**
 * Transfer for Shopper Payments
 */
export interface StripeTransfer extends Stripe.Transfer {
  metadata: {
    orderId: string;
    shopperId: string;
    baseFee: string;
    percentageFee: string;
    tips?: string;
    bonuses?: string;
    [key: string]: string;
  };
}

/**
 * Platform Fees and Revenue
 * Track platform earnings from each order
 */
export interface PlatformRevenue {
  orderId: string;
  grossRevenue: number; // Total fees collected (cents)
  breakdown: {
    deliveryFee: number;
    serviceFee: number; // % of order
    lateAddFees: number;
    tips?: number; // Platform tip share if any
  };
  costs: {
    stripeFees: number; // Payment processing fees
    issuingFees: number; // Card authorization fees
    transferFees: number; // Connect transfer fees
    shopperPayment: number; // Amount paid to shopper
  };
  netRevenue: number; // After all costs
  createdAt: Date;
}

/**
 * Spending Control for Issuing Cards
 */
export interface SpendingControl {
  spendingLimit: number; // Max spend in cents
  interval: 'per_authorization' | 'daily' | 'weekly' | 'monthly';
  allowedCategories?: string[]; // Allowed MCC codes
  blockedCategories?: string[]; // Blocked MCC codes
  allowedMerchants?: string[]; // Specific merchant IDs
  blockedMerchants?: string[]; // Blocked merchant IDs
}
