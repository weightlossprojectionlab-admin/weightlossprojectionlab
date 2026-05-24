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

    // Resolve the Stripe subscription. Try Firestore first; fall
    // back to looking up by customer email when our record doesn't
    // have the linkage (auto-granted Firestore-only trials, or older
    // records whose stripeSubscriptionId never got written). Accept
    // BOTH trialing and active subs — Firestore can lag behind Stripe
    // (e.g. our auto-granted-trial write set status='trialing' even
    // though Stripe still had the customer's prior sub at 'active').
    let stripeSubscriptionId: string | undefined = existingSubscription.stripeSubscriptionId

    if (!stripeSubscriptionId && userEmail) {
      try {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 })
        if (customers.data.length > 0) {
          const customerId = customers.data[0].id
          // Look for trialing first, then active. Either is a valid
          // "live" sub we can address; the post-fetch branch below
          // figures out whether to call trial_end or just reconcile.
          let subs = await stripe.subscriptions.list({
            customer: customerId,
            status: 'trialing',
            limit: 1,
          })
          if (subs.data.length === 0) {
            subs = await stripe.subscriptions.list({
              customer: customerId,
              status: 'active',
              limit: 1,
            })
          }
          if (subs.data.length > 0) {
            stripeSubscriptionId = subs.data[0].id
            logger.info('[Convert Trial] Recovered subscriptionId via email lookup', {
              userId,
              stripeSubscriptionId,
              customerId,
              recoveredStatus: subs.data[0].status,
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

    // Fetch the current Stripe-side state of the sub before deciding
    // what to do. Stripe is the source of truth for billing state;
    // Firestore can lag (especially after our start-trial writes
    // status='trialing' to a record whose Stripe sub may have moved
    // on to 'active' from a previous flow).
    const current = await stripe.subscriptions.retrieve(stripeSubscriptionId)

    logger.info('[Convert Trial] Current Stripe sub state', {
      userId,
      stripeSubscriptionId,
      firestoreStatus: existingSubscription.status,
      stripeStatus: current.status,
    })

    // Case A — Stripe says 'active'. But active alone doesn't mean
    // the sub is paid: a sub can be active with an open/draft/
    // uncollectible invoice (the period is granted, the bill is
    // outstanding). Before reconciling Firestore as "done", check
    // the latest_invoice status:
    //   - 'paid' (or no invoice) → reconcile + return success
    //   - 'open' / 'draft' / 'uncollectible' → return the hosted
    //     invoice URL so the user can complete payment. Don't
    //     reconcile Firestore yet — the Stripe webhook will sync
    //     status once the invoice is paid.
    //   - 'void' → surface error
    if (current.status === 'active') {
      const latestInvoiceRef = current.latest_invoice
      let invoiceStatus: string | null = null
      let payInvoiceUrl: string | undefined

      if (latestInvoiceRef) {
        try {
          const invoiceId =
            typeof latestInvoiceRef === 'string' ? latestInvoiceRef : latestInvoiceRef.id
          if (invoiceId) {
            const invoice = await stripe.invoices.retrieve(invoiceId)
            invoiceStatus = invoice.status || null
            payInvoiceUrl = invoice.hosted_invoice_url || undefined
          }
        } catch (invErr: any) {
          logger.warn('[Convert Trial] Failed to fetch latest invoice', {
            userId,
            stripeSubscriptionId,
            error: invErr?.message,
          })
        }
      }

      logger.info('[Convert Trial] Active sub invoice status', {
        userId,
        stripeSubscriptionId,
        invoiceStatus,
      })

      // Unpaid invoice — surface the hosted payment URL. Don't
      // reconcile Firestore yet; the user hasn't actually paid.
      const isUnpaid =
        invoiceStatus === 'open' ||
        invoiceStatus === 'draft' ||
        invoiceStatus === 'uncollectible'
      if (isUnpaid && payInvoiceUrl) {
        return NextResponse.json({
          success: true,
          status: current.status,
          requiresPaymentCompletion: true,
          payInvoiceUrl,
          message:
            'Your subscription has an outstanding invoice. Complete payment to activate.',
        })
      }

      // Paid (or no invoice — e.g., $0 sub or pre-billing). Reconcile.
      try {
        await adminDb
          .collection('users')
          .doc(userId)
          .update({
            'subscription.status': 'active',
            'subscription.stripeSubscriptionId': current.id,
            'subscription.stripeCustomerId':
              typeof current.customer === 'string' ? current.customer : current.customer?.id,
            updatedAt: new Date(),
          })
        logger.info('[Convert Trial] Reconciled Firestore status → active', {
          userId,
          stripeSubscriptionId,
        })
      } catch (reconcileErr: any) {
        logger.warn('[Convert Trial] Firestore reconcile failed (non-fatal)', {
          userId,
          error: reconcileErr?.message,
        })
      }
      return NextResponse.json({
        success: true,
        status: 'active',
        reconciled: true,
        message: 'Your subscription is already active. Welcome!',
      })
    }

    // Case B — Stripe says 'trialing'. End the trial now. Stripe
    // attempts to bill the default payment method. Success → active.
    // Failure (no card / declined) → past_due / incomplete, invoice
    // carries a hosted payment page we redirect to.
    if (current.status !== 'trialing') {
      // Past_due, canceled, unpaid, incomplete, etc. — can't convert
      // from these states. Surface the actual Stripe status.
      return NextResponse.json(
        {
          success: false,
          error: `Stripe subscription is ${current.status} — cannot convert trial.`,
          code: 'STRIPE_STATUS_UNSUPPORTED',
          stripeStatus: current.status,
        },
        { status: 400 },
      )
    }

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
