/**
 * Acquisition Email Templates
 *
 * Marketing emails for attracting new users — caregiver ICP.
 * Uses Resend via sendEmail() from email-service.ts.
 */

export interface AcquisitionEmailTemplate {
  id: string
  name: string
  subject: string
  description: string
  variables: string[] // e.g. ['FirstName', 'referrerName', 'referralCode']
  generateHtml: (vars: Record<string, string>) => string
}

const appUrl = 'https://www.wellnessprojectionlab.com'

export const ACQUISITION_TEMPLATES: AcquisitionEmailTemplate[] = [
  {
    id: 'cold-outreach',
    name: 'Cold Outreach',
    subject: 'Quick question about managing your family\'s health',
    description: 'Personal, low-pressure email for caregiver community members. Asks for feedback, not selling.',
    variables: ['FirstName'],
    generateHtml: (vars) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 40px 30px;text-align:center;">
<h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">Wellness Projection Lab</h1>
<p style="color:rgba(255,255,255,0.9);font-size:16px;margin:0;">Your family's health, one place.</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">Hi ${vars.FirstName || 'there'},</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">If you're anything like most caregivers I've talked to, you're probably managing health info for more than just yourself — kids, aging parents, maybe even a pet. Scattered across apps, folders, and sticky notes.</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 24px;">I built something to fix that. It's called <strong>Wellness Projection Lab</strong> — one place where you can track vitals, medications, meals, and appointments for your entire family. You can even share access with your spouse or sitter in seconds.</p>
<p style="font-size:14px;font-weight:600;color:#374151;margin:0 0 12px;">What early users are doing:</p>
<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr><td style="padding:8px 0;font-size:15px;color:#374151;">✅ <strong>Tracking medications</strong> — reminders, doses, and interaction flags for the whole family</td></tr>
<tr><td style="padding:8px 0;font-size:15px;color:#374151;">✅ <strong>One dashboard for everyone</strong> — kids, parents, grandparents, even pets</td></tr>
<tr><td style="padding:8px 0;font-size:15px;color:#374151;">✅ <strong>Sharing access instantly</strong> — spouse, sitter, or doctor gets exactly the permissions they need</td></tr>
</table>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 24px;">I'm not trying to sell you anything right now. I'm looking for <strong>10 early users</strong> who actually live the caregiver juggle and can tell me what's useful and what's not.</p>
<table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td align="center" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:8px;padding:14px 32px;">
<a href="${appUrl}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">Take a Look — No Commitment →</a>
</td></tr>
</table>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">If it's not for you, no worries at all. But if you do check it out, I'd genuinely love to hear what you think — even a one-line reply helps.</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0;">Thanks for your time,</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:16px 0 0;"><strong>Percy Rice</strong><br><span style="font-size:14px;color:#6b7280;">Founder, Wellness Projection Lab</span><br><a href="${appUrl}" style="color:#667eea;font-size:14px;">wellnessprojectionlab.com</a></p>
</td></tr>
<tr><td style="padding:24px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
<p style="font-size:12px;color:#9ca3af;margin:0;">© 2026 Wellness Projection Lab. All rights reserved.</p>
<p style="font-size:11px;color:#9ca3af;margin:8px 0 0;">You're receiving this because you're active in a caregiver or family health community. No hard feelings if this isn't relevant.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    id: 'follow-up',
    name: 'Follow-Up (No Response)',
    subject: 'Following up — family health tracking',
    description: '5-7 days after cold outreach. Short, value-add tip, gentle re-mention.',
    variables: ['FirstName'],
    generateHtml: (vars) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px 40px;text-align:center;">
<h1 style="color:#ffffff;font-size:24px;margin:0;">Wellness Projection Lab</h1>
</td></tr>
<tr><td style="padding:40px;">
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">Hi ${vars.FirstName || 'there'},</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">Just a quick follow-up — I know inboxes get busy.</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">Quick tip: if you're juggling medication schedules for family members, try keeping a shared doc with med names, dosages, and pharmacy info. It's a lifesaver when someone else needs to handle a refill.</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 24px;">That's actually what <a href="${appUrl}" style="color:#667eea;font-weight:600;">Wellness Projection Lab</a> automates — one place for meds, vitals, and appointments for the whole family. Check it out when you have a moment.</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0;">Best,</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:16px 0 0;"><strong>Percy Rice</strong><br><span style="font-size:14px;color:#6b7280;">Founder, Wellness Projection Lab</span></p>
</td></tr>
<tr><td style="padding:24px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
<p style="font-size:12px;color:#9ca3af;margin:0;">© 2026 Wellness Projection Lab. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    id: 'referral-invite',
    name: 'Referral Invite',
    subject: '{{referrerName}} thinks you\'d love Wellness Projection Lab',
    description: 'Sent by existing users to invite friends. Includes discount code.',
    variables: ['FirstName', 'referrerName', 'referralCode'],
    generateHtml: (vars) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 40px 30px;text-align:center;">
<p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0 0 8px;">You've been invited by</p>
<h1 style="color:#ffffff;font-size:24px;margin:0;">${vars.referrerName || 'A friend'}</h1>
</td></tr>
<tr><td style="padding:40px;">
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">Hi ${vars.FirstName || 'there'},</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">Your friend <strong>${vars.referrerName || 'someone you know'}</strong> uses Wellness Projection Lab to manage their family's health — and they thought you'd love it too.</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 24px;">WPL puts your entire family's vitals, medications, meals, and appointments in one place. Share access with your spouse, caregiver, or sitter in seconds. Even track your pets.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr><td style="background-color:#f0fdf4;border:2px solid #86efac;border-radius:8px;padding:20px;text-align:center;">
<p style="font-size:20px;font-weight:700;color:#166534;margin:0 0 4px;">7% OFF your first subscription</p>
<p style="font-size:14px;color:#166534;margin:0;">Use code: <strong style="font-size:18px;letter-spacing:2px;">${vars.referralCode || 'FRIEND7'}</strong></p>
</td></tr>
</table>
<table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td align="center" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:8px;padding:14px 32px;">
<a href="${appUrl}/ref/${vars.referralCode || ''}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">Claim Your Discount →</a>
</td></tr>
</table>
<p style="font-size:14px;color:#6b7280;line-height:1.6;">Free 7-day trial included. HIPAA compliant.</p>
</td></tr>
<tr><td style="padding:24px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
<p style="font-size:12px;color:#9ca3af;margin:0;">© 2026 Wellness Projection Lab. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    id: 'welcome-beta',
    name: 'Welcome / Beta Invite',
    subject: 'You\'re in — your family health hub is ready',
    description: 'For people who expressed interest. Confirms early access and guides first steps.',
    variables: ['FirstName'],
    generateHtml: (vars) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 40px 30px;text-align:center;">
<h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">Welcome to Wellness Projection Lab</h1>
<p style="color:rgba(255,255,255,0.9);font-size:16px;margin:0;">Your family's health, one place.</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 20px;">Hi ${vars.FirstName || 'there'},</p>
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 24px;">You're in! Your early access to Wellness Projection Lab is ready. One app to track vitals, medications, meals, and appointments for your entire family — humans and pets.</p>
<p style="font-size:14px;font-weight:600;color:#374151;margin:0 0 12px;">Here's what you can do right away:</p>
<table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr><td style="padding:8px 0;font-size:15px;color:#374151;">✅ <strong>Track medications</strong> — set reminders, log doses, flag interactions</td></tr>
<tr><td style="padding:8px 0;font-size:15px;color:#374151;">✅ <strong>One dashboard for everyone</strong> — kids, parents, grandparents, pets</td></tr>
<tr><td style="padding:8px 0;font-size:15px;color:#374151;">✅ <strong>Share access instantly</strong> — grant your spouse, sitter, or doctor the permissions they need</td></tr>
</table>
<table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td align="center" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:8px;padding:14px 32px;">
<a href="${appUrl}/auth" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">Set Up Your Family →</a>
</td></tr>
</table>
<p style="font-size:14px;color:#6b7280;line-height:1.6;">Free 7-day trial. No credit card required. HIPAA compliant.</p>
</td></tr>
<tr><td style="padding:24px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
<p style="font-size:12px;color:#9ca3af;margin:0;">© 2026 Wellness Projection Lab. All rights reserved.</p>
<p style="font-size:11px;color:#9ca3af;margin:8px 0 0;">You received this because you requested early access at wellnessprojectionlab.com</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
  {
    id: 'post-signup-nurture',
    name: 'Post-Signup Nurture (Day 1)',
    subject: '3 things to do first in WPL',
    description: 'Automated after signup. Guides user through first actions.',
    variables: ['FirstName'],
    generateHtml: (vars) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px 40px 30px;text-align:center;">
<h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">Welcome aboard! 🎉</h1>
<p style="color:rgba(255,255,255,0.9);font-size:15px;margin:0;">Here's how to get the most out of WPL</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="font-size:16px;color:#374151;line-height:1.6;margin:0 0 24px;">Hi ${vars.FirstName || 'there'}, you just took the first step toward managing your family's health in one place. Here are 3 things to do in the next 5 minutes:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
<tr><td width="48" valign="top" style="padding-right:16px;"><div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;width:40px;height:40px;border-radius:50%;text-align:center;line-height:40px;font-weight:700;font-size:18px;">1</div></td>
<td style="padding:4px 0;"><p style="font-size:15px;color:#374151;margin:0 0 4px;"><strong>Add your first family member</strong></p><p style="font-size:14px;color:#6b7280;margin:0;">Go to Patients → Add Family Member. Create profiles for kids, parents, or pets.</p></td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
<tr><td width="48" valign="top" style="padding-right:16px;"><div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;width:40px;height:40px;border-radius:50%;text-align:center;line-height:40px;font-weight:700;font-size:18px;">2</div></td>
<td style="padding:4px 0;"><p style="font-size:15px;color:#374151;margin:0 0 4px;"><strong>Log a medication or vital</strong></p><p style="font-size:14px;color:#6b7280;margin:0;">Tap into any profile → Medications or Vitals. Set a reminder so you never miss a dose.</p></td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
<tr><td width="48" valign="top" style="padding-right:16px;"><div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;width:40px;height:40px;border-radius:50%;text-align:center;line-height:40px;font-weight:700;font-size:18px;">3</div></td>
<td style="padding:4px 0;"><p style="font-size:15px;color:#374151;margin:0 0 4px;"><strong>Invite your spouse or sitter</strong></p><p style="font-size:14px;color:#6b7280;margin:0;">Go to Family → Invite Caregiver. They'll get access to exactly what you allow — nothing more.</p></td></tr>
</table>
<table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
<tr><td align="center" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:8px;padding:14px 32px;">
<a href="${appUrl}/dashboard" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">Open Your Dashboard →</a>
</td></tr>
</table>
<p style="font-size:14px;color:#6b7280;text-align:center;">Takes less than 5 minutes. Your family will thank you.</p>
</td></tr>
<tr><td style="padding:24px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
<p style="font-size:12px;color:#9ca3af;margin:0;">© 2026 Wellness Projection Lab. All rights reserved.</p>
<p style="font-size:11px;color:#9ca3af;margin:8px 0 0;">Questions? Reply to this email — a real human reads every message.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  },
]

export function getAcquisitionTemplate(id: string): AcquisitionEmailTemplate | undefined {
  return ACQUISITION_TEMPLATES.find(t => t.id === id)
}
