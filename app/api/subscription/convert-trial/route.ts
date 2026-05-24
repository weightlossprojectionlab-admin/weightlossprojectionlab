/**
 * Convert Trial to Paid Subscription
 *
 * POST /api/subscription/convert-trial
 *
 * End a Stripe trial immediately ("trial_end: 'now'") so the user
 * starts paying for the plan they're already trialing — same tier,
 * no plan change. The Stripe Customer Portal's "Update plan" page
 * can't do this (it's gated on plan changes), and Stripe Checkout
 * can't either (it rejects creating a new sub when one already exists
 * on the customer).
 *
 * Flow:
 *   1. Auth user, get their Firestore subscription record.
 *   2. Verify status === 'trialing' (only valid starting state).
 *   3. Resolve the Stripe subscription ID:
 *        - From subscription.stripeSubscriptionId if present, OR
 *        - Look up via Stripe by customer email (handles users with
 *          a real Stripe sub that lost its Firestore linkage).
 *   4. Call stripe.subscriptions.update(subId, { trial_end: 'now' }).
 *   5. Inspect the returned subscription:
 *        - status === 'active' → Stripe charged successfully; return
 *          success and let the webhook sync state.
 *        - status === 'past_due' / 'incomplete' / 'unpaid' → Stripe
 *          tried to charge but failed (no card on file or card
 *          declined). Return the latest invoice's hosted_invoice_url
 *          so the client can redirect the user to a Stripe-hosted
 *          payment-completion page.
 *
 * Returns:
 *   200 { success: true, status }           — trial ended, sub active
 *   200 { success: true, payInvoiceUrl }    — trial ended, payment required
 *   400 / 404 / 500 with { success: false, error, code }
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-config'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 },
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    logger.info('[Convert Trial] Starting trial conversion', { userId })

    // Fetch current subscription state from Firestore.
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const existingSubscription = userData?.subscription

    if (!existingSubscription) {
      return NextResponse.json(
        { success: false, error: 'No subscription found', code: 'NO_SUBSCRIPTION' },
        { status: 404 },
      )
    }

    if (existingSubscription.status !== 'trialing') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot convert — subscription is ${existingSubscription.status}, not trialing.`,
          code: 'NOT_TRIALING',
        },
        { status: 400 },
      )
    }

    // Resolve the Stripe subscription ID. Try Firestore first; fall
    // back to looking up by customer email when our record doesn't
    // have the linkage (auto-granted Firestore-only trials, or older
    // records whose stripeSubscriptionId never got written).
    let stripeSubscriptionId: string | undefined = existingSubscription.stripeSubscriptionId

    if (!stripeSubscriptionId && userEmail) {
      try {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 })
        if (customers.data.length > 0) {
          const customerId = customers.data[0].id
          const subs = await stripe.subscriptions.list({
            customer: customerId,
            status: 'trialing',
            limit: 1,
          })
          if (subs.data.length > 0) {
            stripeSubscriptionId = subs.data[0].id
            logger.info('[Convert Trial] Recovered subscriptionId via email lookup', {
              userId,
              stripeSubscriptionId,
              customerId,
            })
          }
        }
      } catch (lookupErr: any) {
        logger.warn('[Convert Trial] Customer/subscription lookup failed', {
          userId,
          email: userEmail,
          error: lookupErr?.message,
        })
      }
    }

    if (!stripeSubscriptionId) {
      // No Stripe sub to convert. The user has a Firestore-only auto-
      // granted trial. They need to go through Stripe Checkout to
      // create a real subscription. Return a code the client can
      // route on (e.g. fall back to the create-checkout-session flow).
      return NextResponse.json(
        {
          success: false,
          error: 'No Stripe subscription to convert — please subscribe via checkout.',
          code: 'NO_STRIPE_SUBSCRIPTION',
        },
        { status: 404 },
      )
    }

    // End the trial immediately. Stripe attempts to bill the default
    // payment method on the customer. If billing succeeds, the sub
    // transitions to 'active'. If it fails (no card / declined), the
    // sub goes to 'past_due' or 'incomplete' and the invoice carries
    // a hosted payment page we can redirect to.
    const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
      trial_end: 'now',
    })

    logger.info('[Convert Trial] Subscription updated', {
      userId,
      stripeSubscriptionId,
      newStatus: updated.status,
    })

    // Payment incomplete → fetch the latest invoice and return its
    // hosted_invoice_url for the client to redirect to. The user
    // completes payment on Stripe's hosted page; our webhook syncs
    // status back when payment succeeds.
    if (updated.status !== 'active') {
      let payInvoiceUrl: string | undefined
      if (updated.latest_invoice) {
        try {
          const invoiceId =
            typeof updated.latest_invoice === 'string'
              ? updated.latest_invoice
              : updated.latest_invoice.id
          if (invoiceId) {
            const invoice = await stripe.invoices.retrieve(invoiceId)
            payInvoiceUrl = invoice.hosted_invoice_url || undefined
          }
        } catch (invErr: any) {
          logger.warn('[Convert Trial] Failed to fetch invoice for payment URL', {
            userId,
            stripeSubscriptionId,
            error: invErr?.message,
          })
        }
      }

      return NextResponse.json({
        success: true,
        status: updated.status,
        requiresPaymentCompletion: true,
        payInvoiceUrl,
        message:
          'Trial ended. Complete payment to activate your subscription.',
      })
    }

    // Success — sub is active. The Stripe webhook will sync the
    // canonical state back to Firestore; we don't need to write here.
    return NextResponse.json({
      success: true,
      status: updated.status,
      message: 'Your subscription is now active. Welcome!',
    })
  } catch (error: any) {
    logger.error('[Convert Trial] Error converting trial', error as Error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to convert trial',
      },
      { status: 500 },
    )
  }
}
