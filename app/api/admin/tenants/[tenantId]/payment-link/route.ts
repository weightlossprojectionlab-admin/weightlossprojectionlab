/**
 * POST /api/admin/tenants/[tenantId]/payment-link
 *
 * Sends the franchise setup-fee Stripe checkout link to the franchise owner.
 *
 * IMPORTANT — uses Stripe Checkout Sessions, NOT Payment Links:
 * Payment Links collect customer email at checkout time and let the customer
 * type whatever email they want. That created several real bugs:
 *   1. Mismatched audit trail (Stripe charge email != tenant.contact.adminEmail)
 *   2. Wrong owner provisioned by webhook (handleFranchiseSetupPaid reads
 *      tenant.contact.adminEmail, so the magic link goes to the wrong person)
 *   3. Anyone with the link can pay it (Payment Links are public-shareable)
 *
 * Checkout Sessions with `customer: <id>` lock the email field to the
 * pre-existing Stripe Customer record, which we get-or-create with the
 * franchise owner's email. The customer cannot change the email at checkout.
 *
 * The route name (.../payment-link) is preserved for UI compatibility — the
 * admin "Send Payment Link" button still calls this same URL. Internally,
 * "payment link" now means "checkout session URL".
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { logAdminAction } from '@/lib/admin/audit'
import stripe from '@/lib/stripe-config'
import { sendEmail } from '@/lib/email-service'
import { logger } from '@/lib/logger'
import { errorResponse, forbiddenResponse } from '@/lib/api-response'
import { SETUP_FEE_CENTS } from '@/lib/franchise-plans'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const idToken = authHeader?.replace('Bearer ', '')
  if (!idToken) return null
  const decodedToken = await adminAuth.verifyIdToken(idToken)
  const adminEmail = decodedToken.email || ''
  const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
  const adminData = adminDoc.data()
  if (!isSuperAdmin(adminEmail) && adminData?.role !== 'admin') return null
  return decodedToken
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const decoded = await verifyAdmin(request)
    if (!decoded) return forbiddenResponse('Admin access required')

    // Get tenant data
    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get()
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const tenant = tenantDoc.data()!
    const setupFeeAmount = tenant.billing?.setupFeeAmount || SETUP_FEE_CENTS
    const adminEmail = tenant.contact?.adminEmail
    const businessName = tenant.name

    if (!adminEmail) {
      return NextResponse.json({ error: 'Tenant has no admin email' }, { status: 400 })
    }

    // 1. Get or create a Stripe Customer for this franchise owner.
    //    We bind the customer to the tenant so future calls (e.g. recurring
    //    billing in Phase C) can re-use the same customer record.
    let stripeCustomerId: string | undefined = tenant.billing?.stripeCustomerId
    if (stripeCustomerId) {
      // Verify the stored customer still exists in Stripe (handles deleted/rotated)
      try {
        await stripe.customers.retrieve(stripeCustomerId)
      } catch {
        stripeCustomerId = undefined
      }
    }
    if (!stripeCustomerId) {
      // Try to find by email first to avoid creating duplicates if we hit retries
      const existingByEmail = await stripe.customers.list({ email: adminEmail, limit: 1 })
      if (existingByEmail.data[0]) {
        stripeCustomerId = existingByEmail.data[0].id
      } else {
        const created = await stripe.customers.create({
          email: adminEmail,
          name: tenant.contact?.adminName || businessName,
          metadata: { tenantId, businessName },
        })
        stripeCustomerId = created.id
      }
    }

    // 2. Create a Checkout Session bound to that customer.
    //    Passing `customer: <id>` (instead of `customer_email:`) makes the
    //    email field READ-ONLY in the Stripe-hosted checkout page.
    //
    //    `expires_at` (Stripe requires absolute Unix seconds) auto-expires
    //    the link in 24 hours so old un-paid links don't linger.
    const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: stripeCustomerId,
      // tenantId on the session metadata is what handleFranchiseSetupPaid
      // in the webhook reads to identify which tenant to activate. Do not
      // remove or rename without also updating the webhook.
      metadata: { tenantId, businessName },
      payment_intent_data: {
        // Mirrors metadata onto the underlying PaymentIntent so dispute /
        // refund tooling in the Stripe Dashboard can also identify the tenant.
        metadata: { tenantId, businessName, type: 'franchise_setup' },
        description: `Wellness Projection Lab Franchise Setup Fee — ${businessName}`,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: setupFeeAmount,
            product_data: {
              name: `Wellness Projection Lab Franchise Setup Fee — ${businessName}`,
              description: `One-time setup fee for the ${businessName} franchise platform.`,
              metadata: { tenantId, type: 'franchise_setup' },
            },
          },
        },
      ],
      expires_at: expiresAt,
      success_url: `https://www.wellnessprojectionlab.com/franchise/payment-success?tenant=${tenantId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://www.wellnessprojectionlab.com/franchise/payment-cancelled?tenant=${tenantId}`,
    })

    if (!checkoutSession.url) {
      throw new Error('Stripe did not return a checkout session URL')
    }
    const checkoutUrl = checkoutSession.url

    // Email the payment link to the franchisee
    await sendEmail({
      to: adminEmail,
      subject: `Your Wellness Projection Lab Franchise — Complete Setup Payment`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 40px 30px;text-align:center;">
<h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">Welcome to the WPL Family</h1>
<p style="color:rgba(255,255,255,0.9);font-size:16px;margin:0;">Your franchise platform is almost ready!</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">Hi ${tenant.contact?.adminName || 'there'},</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">Thank you for choosing Wellness Projection Lab as your health platform partner. To complete your franchise setup, please pay the one-time setup fee below.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr><td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;">
<div style="font-size:14px;color:#6b7280;margin-bottom:8px;">Setup Fee for <strong style="color:#374151;">${businessName}</strong></div>
<div style="font-size:28px;font-weight:700;color:#374151;">$${(setupFeeAmount / 100).toLocaleString()}</div>
<div style="font-size:13px;color:#6b7280;margin-top:4px;">One-time payment</div>
</td></tr>
</table>

<table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td align="center" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:8px;padding:16px 40px;">
<a href="${checkoutUrl}" style="color:#ffffff;text-decoration:none;font-size:18px;font-weight:600;">Complete Payment →</a>
</td></tr>
</table>

<p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0 0 20px;text-align:center;">This payment link is unique to <strong>${adminEmail}</strong> and expires in 24 hours.</p>

<p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 20px;">After payment, we'll activate your platform within 48 hours at:</p>
<p style="font-size:16px;color:#667eea;font-weight:600;margin:0 0 20px;">${tenant.slug}.wellnessprojectionlab.com</p>

<p style="font-size:14px;color:#6b7280;line-height:1.6;">Questions? Reply to this email or contact us at support@wellnessprojectionlab.com</p>
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

    // Update tenant with checkout session info. We persist both the new
    // canonical fields AND keep the legacy `paymentLink*` fields nulled so
    // any legacy reads (e.g. older admin UI) don't show stale URLs.
    const nowIso = new Date().toISOString()
    await adminDb.collection('tenants').doc(tenantId).update({
      'billing.stripeCustomerId': stripeCustomerId,
      'billing.checkoutSessionUrl': checkoutUrl,
      'billing.checkoutSessionId': checkoutSession.id,
      'billing.checkoutSessionSentAt': nowIso,
      'billing.checkoutSessionExpiresAt': new Date(expiresAt * 1000).toISOString(),
      // Legacy field cleanup so no stale Payment Link URL is visible
      'billing.paymentLinkUrl': null,
      'billing.paymentLinkId': null,
      status: 'pending_payment',
      updatedAt: nowIso,
    })

    await logAdminAction({
      adminUid: decoded.uid,
      adminEmail: decoded.email || 'unknown',
      action: 'tenant_payment_link_sent',
      targetType: 'tenant',
      targetId: tenantId,
      tenantId,
      reason: `Checkout session sent to ${adminEmail} for ${businessName} ($${setupFeeAmount / 100})`,
      metadata: { stripeCustomerId, checkoutSessionId: checkoutSession.id },
    })

    logger.info('[Tenants] Checkout session sent', {
      tenantId,
      adminEmail,
      amount: setupFeeAmount,
      stripeCustomerId,
      checkoutSessionId: checkoutSession.id,
    })

    return NextResponse.json({
      success: true,
      // Field name preserved for UI compatibility — the admin page reads
      // `paymentLinkUrl` from the response. Value is the new checkout URL.
      paymentLinkUrl: checkoutUrl,
      checkoutSessionUrl: checkoutUrl,
      checkoutSessionId: checkoutSession.id,
      stripeCustomerId,
      message: `Checkout session sent to ${adminEmail}`,
    })
  } catch (error) {
    logger.error('[Tenants] Checkout session creation failed', error as Error)
    return errorResponse(error, { route: '/api/admin/tenants/[tenantId]/payment-link', operation: 'create' })
  }
}
