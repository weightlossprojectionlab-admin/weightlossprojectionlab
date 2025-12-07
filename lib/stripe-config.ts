/**
 * Stripe Configuration and Client Initialization
 *
 * This module initializes and exports the Stripe client for server-side operations.
 * IMPORTANT: This should ONLY be used in server-side code (API routes, server components, etc.)
 */

import Stripe from 'stripe';

// Lazy stripe client initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

/**
 * Get or create Stripe client instance
 * Validates configuration at runtime, not build time
 */
function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured. Please add it to your .env.local file.\n' +
      'Get your key from: https://dashboard.stripe.com/apikeys'
    );
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
      appInfo: {
        name: 'WeightLoss Shop & Deliver',
        version: '1.0.0',
        url: 'https://weightlossprojectlab.com',
      },
      maxNetworkRetries: 2,
    });
  }

  return stripeInstance;
}

/**
 * Stripe Client Instance
 *
 * Configuration:
 * - API Version: Latest stable version
 * - TypeScript support enabled
 * - Automatic retries with exponential backoff
 * - Request timeout: 80 seconds (default)
 */
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    return (getStripeClient() as any)[prop];
  }
});

/**
 * Stripe Publishable Key for Client-Side
 * Used for payment element, card details, etc.
 */
export const getPublishableKey = (): string => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    throw new Error(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured. Please add it to your .env.local file.\n' +
      'Get your key from: https://dashboard.stripe.com/apikeys'
    );
  }
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
};

/**
 * Stripe Webhook Secret
 * Used to verify webhook signatures
 */
export const getWebhookSecret = (): string => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not configured. Please add it to your .env.local file.\n' +
      'Get your webhook secret from: https://dashboard.stripe.com/webhooks'
    );
  }
  return process.env.STRIPE_WEBHOOK_SECRET;
};

/**
 * Verify Stripe Webhook Signature
 *
 * @param payload - Raw request body as string or buffer
 * @param signature - Stripe signature from request headers (stripe-signature)
 * @returns Verified Stripe event object
 * @throws Error if signature verification fails
 */
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string
): Stripe.Event => {
  const webhookSecret = getWebhookSecret();

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const error = err as Error;
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
};

/**
 * Test Stripe Connection
 *
 * Verifies that the Stripe API keys are valid and connection is working.
 * Useful for health checks and startup validation.
 *
 * @returns true if connection is successful
 * @throws Error if connection fails
 */
export const testStripeConnection = async (): Promise<boolean> => {
  try {
    // List balance to verify API key works
    await stripe.balance.retrieve();
    return true;
  } catch (err) {
    const error = err as Error;
    throw new Error(`Stripe connection test failed: ${error.message}`);
  }
};

/**
 * Stripe Configuration Constants
 */
export const STRIPE_CONFIG = {
  // Currency
  CURRENCY: 'usd',

  // Payment Intent Settings
  PAYMENT_BUFFER_PERCENTAGE: 0.15, // 15% buffer for price variations
  CAPTURE_METHOD: 'manual' as const, // Hold funds until shopping complete

  // Issuing Card Settings
  CARD_TYPE: 'virtual' as const, // Virtual cards for shoppers
  CARD_BRAND: 'Visa' as const,
  ALLOWED_MCC_CATEGORIES: ['grocery_stores_supermarkets'], // MCC 5411
  BLOCKED_MCC_CATEGORIES: [
    'gambling',
    'cash_advances',
    'money_transfers',
    'wire_transfers',
  ],

  // Connect Account Settings
  CONNECT_ACCOUNT_TYPE: 'express' as const, // Simplified onboarding
  PAYOUT_SCHEDULE: {
    interval: 'daily' as const, // Daily payouts to shoppers
    delay_days: 2, // 2-day delay for risk management
  },

  // Fee Structure (in basis points, 1% = 100)
  FEES: {
    PAYMENT_PROCESSING_PERCENTAGE: 290, // 2.9%
    PAYMENT_PROCESSING_FIXED: 30, // $0.30 in cents
    ISSUING_AUTHORIZATION: 10, // $0.10 per authorization
    CONNECT_TRANSFER_PERCENTAGE: 50, // 0.5%
  },

  // Limits
  LIMITS: {
    MAX_ORDER_AMOUNT: 50000, // $500.00 max order
    MIN_ORDER_AMOUNT: 1000, // $10.00 min order
    MAX_REFUND_WINDOW_DAYS: 1, // 24 hours to request refund
    MAX_CARD_SPENDING_LIMIT: 100000, // $1,000.00 max card limit
  },
} as const;

/**
 * Get Stripe Dashboard URL for an object
 *
 * @param type - Stripe object type
 * @param id - Stripe object ID
 * @param livemode - Whether in live mode (default: based on secret key)
 * @returns URL to Stripe dashboard
 */
export const getStripeDashboardUrl = (
  type: 'payment_intents' | 'customers' | 'charges' | 'refunds' | 'transfers' | 'issuing/cards' | 'connect/accounts',
  id: string,
  livemode: boolean = !process.env.STRIPE_SECRET_KEY?.includes('test')
): string => {
  const mode = livemode ? '' : 'test/';
  return `https://dashboard.stripe.com/${mode}${type}/${id}`;
};

/**
 * Format amount from cents to dollars
 *
 * @param cents - Amount in cents
 * @returns Formatted dollar string (e.g., "$123.45")
 */
export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: STRIPE_CONFIG.CURRENCY.toUpperCase(),
  }).format(cents / 100);
};

/**
 * Convert dollars to cents
 *
 * @param dollars - Amount in dollars
 * @returns Amount in cents
 */
export const dollarsToCents = (dollars: number): number => {
  return Math.round(dollars * 100);
};

/**
 * Convert cents to dollars
 *
 * @param cents - Amount in cents
 * @returns Amount in dollars
 */
export const centsToDollars = (cents: number): number => {
  return cents / 100;
};

export default stripe;
