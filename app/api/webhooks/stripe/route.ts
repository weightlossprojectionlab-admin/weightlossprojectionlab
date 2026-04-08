/**
 * Stripe Webhook Handler
 *
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for subscription lifecycle
 *
 * Events handled:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/stripe-config'
import { adminDb, getAdminAuth, createUser } from '@/lib/firebase-admin'
import { sendEmail } from '@/lib/email-service'
import { logger } from '@/lib/logger'
import Stripe from 'stripe'

// Initialize Stripe client for webhook handler
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

export async function POST(request: NextRequest) {
  logger.info('[Stripe Webhook] Webhook endpoint hit')
  try {
    logger.info('[Stripe Webhook] Request received')
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    logger.info('[Stripe Webhook] Request details', {
      bodyLength: body.length,
      signaturePresent: !!signature
    })

    if (!signature) {
      logger.error('[Stripe Webhook] Missing signature')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = verifyWebhookSignature(body, signature)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      logger.error('[Stripe Webhook] Signature verification failed', err as Error)
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${errorMessage}` },
        { status: 400 }
      )
    }

    logger.info('[Stripe Webhook] Event received', {
      type: event.type,
      id: event.id
    })

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        logger.info('[Stripe Webhook] Handling checkout completion')
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        logger.info('[Stripe Webhook] Handling subscription event')
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        logger.info('[Stripe Webhook] Unhandled event type', { type: event.type })
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Webhook processing failed'
    logger.error('[Stripe Webhook] Error processing webhook', error as Error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * Handle checkout session completed
 * This fires when a user completes payment for a subscription
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  logger.info('[Stripe Webhook] Checkout completed', {
    sessionId: session.id,
    metadata: session.metadata
  })

  // Franchise setup-fee payment branch — distinguished by tenantId metadata
  // set when the Stripe Checkout Session is created in
  // app/api/admin/tenants/[tenantId]/payment-link/route.ts
  const tenantId = session.metadata?.tenantId
  if (tenantId) {
    await handleFranchiseSetupPaid(session, tenantId)
    return
  }

  const firebaseUid = session.metadata?.firebaseUid
  const subscriptionId = session.subscription as string

  if (!firebaseUid) {
    logger.warn('[Stripe Webhook] Checkout session missing firebaseUid', {
      sessionId: session.id
    })
    return
  }

  if (!subscriptionId) {
    logger.warn('[Stripe Webhook] No subscription ID in checkout session', {
      sessionId: session.id
    })
    return
  }

  logger.info('[Stripe Webhook] Processing checkout', {
    firebaseUid,
    subscriptionId
  })

  // Fetch the full subscription details with expanded price data
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price']
  })

  // Update the subscription in Firebase using the existing handler
  await handleSubscriptionUpdate(subscription)
}

/**
 * Handle franchise setup-fee payment completion.
 * Idempotent — replays from Stripe are common and must not double-email.
 */
async function handleFranchiseSetupPaid(session: Stripe.Checkout.Session, tenantId: string) {
  try {
    const tenantRef = adminDb.collection('tenants').doc(tenantId)
    const tenantDoc = await tenantRef.get()

    if (!tenantDoc.exists) {
      logger.error('[Stripe Webhook] Franchise tenant not found', undefined, {
        tenantId,
        sessionId: session.id,
      })
      return
    }

    const tenant = tenantDoc.data()!

    // Idempotency: if already activated, no-op. Stripe retries are normal.
    if (tenant.billing?.setupFeePaid === true || tenant.status === 'active' || tenant.status === 'paid') {
      logger.info('[Stripe Webhook] Franchise tenant already activated, skipping', {
        tenantId,
        currentStatus: tenant.status,
      })
      return
    }

    const nowIso = new Date().toISOString()
    await tenantRef.update({
      status: 'paid',
      'billing.setupFeePaid': true,
      'billing.setupFeePaidAt': nowIso,
      'billing.stripeCheckoutSessionId': session.id,
      updatedAt: nowIso,
    })

    logger.info('[Stripe Webhook] Franchise tenant activated', {
      tenantId,
      slug: tenant.slug,
      sessionId: session.id,
    })

    // Provision the franchise owner's Firebase Auth account + custom claims
    // and generate a magic sign-in link. All wrapped in best-effort try/catch
    // because the tenant is already marked paid above; if provisioning fails
    // here, an admin can re-trigger from the back-office tenant page.
    const adminEmail = tenant.contact?.adminEmail
    let magicLinkUrl: string | null = null
    if (adminEmail) {
      try {
        const auth = getAdminAuth()
        let ownerUid: string
        try {
          const existing = await auth.getUserByEmail(adminEmail)
          ownerUid = existing.uid
          logger.info('[Stripe Webhook] Owner already exists, reusing', { tenantId, ownerUid })
        } catch (lookupErr: any) {
          if (lookupErr?.code === 'auth/user-not-found') {
            const created = await createUser({
              email: adminEmail,
              displayName: tenant.contact?.adminName || tenant.name,
              emailVerified: true,
            })
            ownerUid = created.uid
            logger.info('[Stripe Webhook] Owner provisioned', { tenantId, ownerUid })
          } else {
            throw lookupErr
          }
        }

        // Set custom claims so firestore.rules isTenantAdmin() recognizes them.
        // Pattern matches lib/admin-auth.ts:81 setCustomUserClaims call.
        await auth.setCustomUserClaims(ownerUid, {
          tenantId,
          tenantRole: 'franchise_admin',
        })

        await tenantRef.update({
          ownerUid,
          ownerProvisionedAt: nowIso,
        })

        // First-ever use of generateSignInWithEmailLink in this codebase.
        // Action URL must be allowlisted in Firebase Console → Auth → Authorized domains.
        const finishUrl = `https://${tenant.slug}.wellnessprojectionlab.com/auth/finish-sign-in?email=${encodeURIComponent(adminEmail)}`
        magicLinkUrl = await auth.generateSignInWithEmailLink(adminEmail, {
          url: finishUrl,
          handleCodeInApp: true,
        })
        logger.info('[Stripe Webhook] Magic sign-in link generated', { tenantId })
      } catch (provisionErr) {
        logger.error('[Stripe Webhook] Owner provisioning failed', provisionErr as Error, { tenantId })
        // fall through — still send the activation email with the bare subdomain link
      }
    }

    if (adminEmail) {
      const adminName = tenant.contact?.adminName || 'there'
      const businessName = tenant.name
      const subdomainUrl = `https://${tenant.slug}.wellnessprojectionlab.com`
      const ctaUrl = magicLinkUrl || subdomainUrl
      const ctaLabel = magicLinkUrl ? 'Sign In to Your Dashboard →' : 'Visit Your Platform →'

      try {
        await sendEmail({
          to: adminEmail,
          subject: `Your ${businessName} platform is live!`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:40px;text-align:center;">
<h1 style="color:#ffffff;font-size:26px;margin:0 0 8px;">You're Live! 🎉</h1>
<p style="color:rgba(255,255,255,0.95);font-size:16px;margin:0;">Payment confirmed — your platform is ready.</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">Hi ${adminName},</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">Your setup payment for <strong>${businessName}</strong> has been received and your branded platform is now active.</p>

<table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td align="center" style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:8px;padding:16px 40px;">
<a href="${ctaUrl}" style="color:#ffffff;text-decoration:none;font-size:18px;font-weight:600;">${ctaLabel}</a>
</td></tr>
</table>

<p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 8px;">Your subdomain:</p>
<p style="font-size:16px;color:#10b981;font-weight:600;margin:0 0 24px;">${tenant.slug}.wellnessprojectionlab.com</p>

<p style="font-size:14px;color:#6b7280;line-height:1.6;">${magicLinkUrl ? "Click the button above to sign in instantly — no password needed. The link is valid for one use." : "Next steps: log in with the email you used to apply, invite your staff, and start onboarding families. Questions? Reply to this email."}</p>
</td></tr>
<tr><td style="padding:24px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
<p style="font-size:12px;color:#9ca3af;margin:0;">&copy; 2026 Wellness Projection Lab. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
        })
      } catch (emailErr) {
        // Don't fail the webhook on email errors — activation already succeeded
        logger.error('[Stripe Webhook] Activation email failed', emailErr as Error, { tenantId })
      }
    }
  } catch (err) {
    // Log but swallow — we never want Stripe to retry once the session has been parsed,
    // to avoid duplicate activations / emails. The activation is idempotent on retry anyway.
    logger.error('[Stripe Webhook] Franchise activation failed', err as Error, { tenantId })
  }
}

/**
 * Handle subscription created or updated
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  logger.info('[Stripe Webhook] Subscription update', {
    subscriptionId: subscription.id,
    metadata: subscription.metadata
  })
  const firebaseUid = subscription.metadata?.firebaseUid

  if (!firebaseUid) {
    logger.warn('[Stripe Webhook] Subscription missing firebaseUid', {
      subscriptionId: subscription.id
    })
    return
  }

  // Enforce one subscription per account
  // Check if user already has a different active subscription
  const userDoc = await adminDb.collection('users').doc(firebaseUid).get()
  const existingSubscription = userDoc.data()?.subscription

  if (existingSubscription?.stripeSubscriptionId &&
      existingSubscription.stripeSubscriptionId !== subscription.id &&
      (existingSubscription.status === 'active' || existingSubscription.status === 'trialing')) {
    logger.error('[Stripe Webhook] Attempted to create multiple subscriptions', undefined, {
      userId: firebaseUid,
      existingSubscriptionId: existingSubscription.stripeSubscriptionId,
      newSubscriptionId: subscription.id
    })
    // Cancel the new subscription to prevent multiple active subscriptions
    await stripe.subscriptions.cancel(subscription.id)
    return
  }

  logger.info('[Stripe Webhook] Updating subscription', {
    userId: firebaseUid,
    subscriptionId: subscription.id,
    status: subscription.status
    })

  // Map Stripe subscription to Firebase subscription data
  const priceId = subscription.items.data[0]?.price?.id
  let plan: string = 'free'
  let billingInterval: 'monthly' | 'yearly' = 'monthly'

  if (!priceId) {
    logger.error('[Stripe Webhook] No price ID in subscription', new Error('No price ID in subscription'), { subscriptionId: subscription.id })
    return
  }

  logger.info('[Stripe Webhook] Processing price ID', {
    priceId,
    expectedSingleMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_MONTHLY,
    expectedSinglePlusMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_PLUS_MONTHLY
  })

  // Determine plan and billing interval based on price ID
  // Monthly plans
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_MONTHLY) {
    plan = 'single'
    billingInterval = 'monthly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_PLUS_MONTHLY) {
    plan = 'single_plus'
    billingInterval = 'monthly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_MONTHLY) {
    plan = 'family_basic'
    billingInterval = 'monthly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_MONTHLY) {
    plan = 'family_plus'
    billingInterval = 'monthly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_MONTHLY) {
    plan = 'family_premium'
    billingInterval = 'monthly'
  }
  // Yearly plans
  else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_YEARLY) {
    plan = 'single'
    billingInterval = 'yearly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_PLUS_YEARLY) {
    plan = 'single_plus'
    billingInterval = 'yearly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_YEARLY) {
    plan = 'family_basic'
    billingInterval = 'yearly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_YEARLY) {
    plan = 'family_plus'
    billingInterval = 'yearly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_YEARLY) {
    plan = 'family_premium'
    billingInterval = 'yearly'
  }

  // Define subscription limits based on plan
  const seatLimits: Record<string, number> = {
    free: 1,
    single: 1,
    single_plus: 1,
    family_basic: 5,
    family_plus: 10,
    family_premium: 999,
  }

  const caregiverLimits: Record<string, number> = {
    free: 0,
    single: 0,
    single_plus: 3,
    family_basic: 5,
    family_plus: 10,
    family_premium: 999,
  }

  const subscriptionData = {
    plan,
    billingInterval,
    status: subscription.status,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    maxSeats: seatLimits[plan],
    maxPatients: seatLimits[plan],
    maxExternalCaregivers: caregiverLimits[plan],
    currentPeriodStart: (subscription as any).current_period_start
      ? new Date((subscription as any).current_period_start * 1000).toISOString()
      : new Date().toISOString(),
    currentPeriodEnd: (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
    updatedAt: new Date().toISOString()
  }

  logger.info('[Stripe Webhook] Saving subscription data', {
    userId: firebaseUid,
    plan,
    billingInterval,
    status: subscription.status
  })

  await adminDb
    .collection('users')
    .doc(firebaseUid)
    .set(
      {
        subscription: subscriptionData
      },
      { merge: true }
    )

  logger.info('[Stripe Webhook] Subscription updated in Firebase', {
    userId: firebaseUid,
    plan,
    status: subscription.status
  })
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const firebaseUid = subscription.metadata?.firebaseUid

  if (!firebaseUid) {
    logger.warn('[Stripe Webhook] Subscription missing firebaseUid', {
      subscriptionId: subscription.id
    })
    return
  }

  logger.info('[Stripe Webhook] Deleting subscription', {
    userId: firebaseUid,
    subscriptionId: subscription.id
  })

  await adminDb
    .collection('users')
    .doc(firebaseUid)
    .set(
      {
        subscription: {
          plan: null,
          status: 'canceled',
          stripeSubscriptionId: null,
          canceledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      },
      { merge: true }
    )

  logger.info('[Stripe Webhook] Subscription deleted in Firebase', {
    userId: firebaseUid
  })
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string | undefined

  if (!subscriptionId) {
    return
  }

  logger.info('[Stripe Webhook] Payment succeeded', {
    invoiceId: invoice.id,
    subscriptionId
  })

  // Could add payment history logging here if needed
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string | undefined

  if (!subscriptionId) {
    return
  }

  logger.error('[Stripe Webhook] Payment failed', undefined, {
    invoiceId: invoice.id,
    subscriptionId
  })

  // Could send notification to user about failed payment
  // Could update subscription status to 'past_due'
}

// Required for Stripe webhook signature verification in App Router
// This ensures we get the raw request body needed for signature verification
export const runtime = 'nodejs'
