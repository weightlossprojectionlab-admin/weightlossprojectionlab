/**
 * Email Service using SendGrid
 *
 * Handles sending transactional emails including:
 * - Family invitations
 * - Notifications
 * - Alerts
 */

import sgMail from '@sendgrid/mail'

// Initialize SendGrid with API key
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

// Use a verified SendGrid sender or domain
// IMPORTANT: Gmail addresses won't work due to DMARC policies
// Options:
// 1. Use a verified sender email from SendGrid
// 2. Set up domain authentication in SendGrid (recommended)
// 3. Use a custom domain you own
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@wlpl.app'
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'WLPL Family Health'
const REPLY_TO_EMAIL = process.env.SENDGRID_REPLY_TO_EMAIL || undefined

/**
 * Get the application URL for email links
 * Uses environment variable in production, falls back to production URL
 */
function getAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!appUrl) {
    if (process.env.NODE_ENV === 'production') {
      // Production fallback
      return 'https://weightlossprojectionlab.com'
    }
    // Development fallback
    console.warn('[Email Service] NEXT_PUBLIC_APP_URL not set, using localhost (development only)')
    return 'http://localhost:3000'
  }

  return appUrl
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[Email Service] SENDGRID_API_KEY not configured. Email not sent.')
    return
  }

  try {
    const mailOptions: any = {
      to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject,
      html,
      text: text || stripHtml(html),
      // Gmail 2024 requirement: List-Unsubscribe header
      headers: {
        'List-Unsubscribe': `<mailto:${REPLY_TO_EMAIL || FROM_EMAIL}?subject=Unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'X-Entity-Ref-ID': `wlpl-invitation-${Date.now()}`
      },
      trackingSettings: {
        clickTracking: {
          enable: false
        },
        openTracking: {
          enable: false
        }
      }
    }

    // Add reply-to if configured
    if (REPLY_TO_EMAIL) {
      mailOptions.replyTo = REPLY_TO_EMAIL
    }

    await sgMail.send(mailOptions)

    console.log(`[Email Service] Email sent successfully to ${to}`)
  } catch (error: any) {
    console.error('[Email Service] Error sending email:', error.response?.body || error.message)
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

/**
 * Send family invitation email
 */
export async function sendFamilyInvitationEmail(params: {
  recipientEmail: string
  inviterName: string
  inviteCode: string
  patientNames: string[]
  message?: string
  expiresAt: string
}): Promise<void> {
  const { recipientEmail, inviterName, inviteCode, patientNames, message, expiresAt } = params

  const expiryDate = new Date(expiresAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const patientList = patientNames.map(name => `<li>${name}</li>`).join('')

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Family Health Access Invitation from ${inviterName}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Family Health Access</h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Weight Loss Projection Lab</p>
        </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #667eea; margin-top: 0;">You've Been Invited!</h2>

        <p><strong>${inviterName}</strong> has invited you to access health records for the following family members:</p>

        <ul style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
          ${patientList}
        </ul>

        ${message ? `
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e;"><strong>Personal Message:</strong></p>
            <p style="margin: 10px 0 0 0; color: #78350f; font-style: italic;">"${message}"</p>
          </div>
        ` : ''}

        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: 600;">Your Invitation Code:</p>
          <p style="margin: 0; font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 3px; font-family: monospace;">
            ${inviteCode}
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${getAppUrl()}/accept-invitation?code=${inviteCode}"
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Accept Invitation
          </a>
        </div>

        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #991b1b; font-size: 14px;">
            <strong>⏰ This invitation expires on ${expiryDate}</strong>
          </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          To accept this invitation, log in to your account and navigate to the Family section,
          or click the button above. Enter your invitation code when prompted.
        </p>

        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
          If you didn't expect this invitation or don't want to accept it, you can safely ignore this email.
        </p>
      </div>

        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; background-color: #f9fafb;">
          <p style="margin: 0;">
            © ${new Date().getFullYear()} Weight Loss Projection Lab. All rights reserved.
          </p>
          <p style="margin: 10px 0 0 0;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Family Health Access Invitation

${inviterName} has invited you to access health records for:
${patientNames.map(name => `- ${name}`).join('\n')}

${message ? `\nPersonal Message: "${message}"\n` : ''}

Your Invitation Code: ${inviteCode}

To accept this invitation, visit ${getAppUrl()}/accept-invitation?code=${inviteCode} or enter your invitation code at the Family page.

This invitation expires on ${expiryDate}.

If you didn't expect this invitation, you can safely ignore this email.

---
© ${new Date().getFullYear()} Weight Loss Projection Lab
  `.trim()

  await sendEmail({
    to: recipientEmail,
    subject: `${inviterName} invited you to access family health records`,
    html,
    text
  })
}

/**
 * Strip HTML tags from string (simple version)
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
