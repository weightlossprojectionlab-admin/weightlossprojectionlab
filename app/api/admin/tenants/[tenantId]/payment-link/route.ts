/**
 * POST /api/admin/tenants/[tenantId]/payment-link
 * Generate a Stripe Payment Link for the franchise setup fee and email it
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

    // Create a Stripe Price for this one-time setup fee
    const price = await stripe.prices.create({
      unit_amount: setupFeeAmount,
      currency: 'usd',
      product_data: {
        name: `WPL Franchise Setup Fee — ${businessName}`,
        metadata: { tenantId, type: 'franchise_setup' },
      },
    })

    // Create a Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { tenantId, businessName },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `https://www.wellnessprojectionlab.com/franchise/payment-success?tenant=${tenantId}`,
        },
      },
    })

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
<a href="${paymentLink.url}" style="color:#ffffff;text-decoration:none;font-size:18px;font-weight:600;">Complete Payment →</a>
</td></tr>
</table>

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

    // Update tenant with payment link info
    await adminDb.collection('tenants').doc(tenantId).update({
      'billing.paymentLinkUrl': paymentLink.url,
      'billing.paymentLinkId': paymentLink.id,
      'billing.paymentLinkSentAt': new Date().toISOString(),
      status: 'pending_payment',
      updatedAt: new Date().toISOString(),
    })

    await logAdminAction({
      adminUid: decoded.uid,
      adminEmail: decoded.email || 'unknown',
      action: 'tenant_payment_link_sent',
      targetType: 'tenant',
      targetId: tenantId,
      reason: `Payment link sent to ${adminEmail} for ${businessName} ($${setupFeeAmount / 100})`,
    })

    logger.info('[Tenants] Payment link sent', { tenantId, adminEmail, amount: setupFeeAmount })

    return NextResponse.json({
      success: true,
      paymentLinkUrl: paymentLink.url,
      message: `Payment link sent to ${adminEmail}`,
    })
  } catch (error) {
    logger.error('[Tenants] Payment link failed', error as Error)
    return errorResponse(error, { route: '/api/admin/tenants/[tenantId]/payment-link', operation: 'create' })
  }
}
