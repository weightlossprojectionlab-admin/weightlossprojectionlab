# Email Service Setup Guide
## Inactive User Detection - Re-engagement Campaigns

The Inactive User Detection system is fully implemented and ready to send re-engagement emails. However, **you need to configure an email service provider** to actually send the emails.

---

## Overview

The system is designed to work with any email service provider. Choose one of the recommended options below based on your needs:

### Recommended Email Services

1. **Resend** (Easiest, modern, developer-friendly)
   - Best for: New projects, simple setup
   - Pricing: 100 emails/day free, then $20/month
   - Website: https://resend.com

2. **SendGrid** (Most popular, enterprise-ready)
   - Best for: Scale, analytics, templates
   - Pricing: 100 emails/day free, then $20/month
   - Website: https://sendgrid.com

3. **Mailgun** (Developer-focused, powerful APIs)
   - Best for: Advanced features, transactional emails
   - Pricing: 5,000 emails/month free, then pay as you go
   - Website: https://mailgun.com

4. **Amazon SES** (Cheapest at scale)
   - Best for: High volume, AWS users
   - Pricing: $0.10 per 1,000 emails
   - Website: https://aws.amazon.com/ses

---

## Setup Instructions

### Option 1: Resend (Recommended for Simplicity)

1. **Create Account**
   ```bash
   # Visit https://resend.com/signup
   # Verify your email
   ```

2. **Get API Key**
   ```bash
   # Dashboard → API Keys → Create API Key
   # Copy the key (starts with re_...)
   ```

3. **Add to Environment Variables**
   ```bash
   # .env.local
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   ```

4. **Install Package**
   ```bash
   npm install resend
   ```

5. **Update `lib/inactive-detection.ts`**

   Replace the `sendReEngagementEmail` function:

   ```typescript
   import { Resend } from 'resend'

   const resend = new Resend(process.env.RESEND_API_KEY)

   export async function sendReEngagementEmail(campaign: ReEngagementCampaign): Promise<boolean> {
     try {
       await saveCampaign(campaign)

       const { data, error } = await resend.emails.send({
         from: 'Weight Loss Project Lab <noreply@weightlossprojectlab.com>',
         to: campaign.userId, // Should be email from user lookup
         subject: campaign.emailSubject,
         html: campaign.emailBody,
         tags: [
           { name: 'campaign_type', value: campaign.campaignType },
           { name: 'inactivity_level', value: campaign.inactivityLevel }
         ]
       })

       if (error) {
         console.error('Resend error:', error)
         return false
       }

       console.log(`Email sent successfully: ${data?.id}`)
       return true
     } catch (error) {
       console.error('Error sending re-engagement email:', error)
       return false
     }
   }
   ```

---

### Option 2: SendGrid

1. **Create Account**
   ```bash
   # Visit https://signup.sendgrid.com
   # Verify your email
   ```

2. **Get API Key**
   ```bash
   # Settings → API Keys → Create API Key
   # Copy the key (starts with SG....)
   ```

3. **Add to Environment Variables**
   ```bash
   # .env.local
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
   ```

4. **Install Package**
   ```bash
   npm install @sendgrid/mail
   ```

5. **Update `lib/inactive-detection.ts`**

   Replace the `sendReEngagementEmail` function:

   ```typescript
   import sgMail from '@sendgrid/mail'

   sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

   export async function sendReEngagementEmail(campaign: ReEngagementCampaign): Promise<boolean> {
     try {
       await saveCampaign(campaign)

       const msg = {
         to: campaign.userId, // Should be email from user lookup
         from: 'support@weightlossprojectlab.com',
         subject: campaign.emailSubject,
         html: campaign.emailBody,
         trackingSettings: {
           clickTracking: { enable: true },
           openTracking: { enable: true }
         },
         categories: [campaign.campaignType, campaign.inactivityLevel]
       }

       await sgMail.send(msg)

       console.log(`Email sent successfully to ${campaign.userId}`)
       return true
     } catch (error) {
       console.error('Error sending re-engagement email:', error)
       return false
     }
   }
   ```

---

### Option 3: Mailgun

1. **Create Account**
   ```bash
   # Visit https://signup.mailgun.com
   # Verify domain
   ```

2. **Get API Key & Domain**
   ```bash
   # Settings → API Keys
   # Copy Private API Key
   # Copy your domain (e.g., mg.yourdomain.com)
   ```

3. **Add to Environment Variables**
   ```bash
   # .env.local
   MAILGUN_API_KEY=xxxxxxxxxxxxxxxxxxxx
   MAILGUN_DOMAIN=mg.weightlossprojectlab.com
   ```

4. **Install Package**
   ```bash
   npm install mailgun.js form-data
   ```

5. **Update `lib/inactive-detection.ts`**

   Replace the `sendReEngagementEmail` function:

   ```typescript
   import formData from 'form-data'
   import Mailgun from 'mailgun.js'

   const mailgun = new Mailgun(formData)
   const mg = mailgun.client({
     username: 'api',
     key: process.env.MAILGUN_API_KEY!
   })

   export async function sendReEngagementEmail(campaign: ReEngagementCampaign): Promise<boolean> {
     try {
       await saveCampaign(campaign)

       const data = await mg.messages.create(process.env.MAILGUN_DOMAIN!, {
         from: 'Weight Loss Project Lab <noreply@weightlossprojectlab.com>',
         to: [campaign.userId], // Should be email from user lookup
         subject: campaign.emailSubject,
         html: campaign.emailBody,
         'o:tracking': true,
         'o:tracking-clicks': true,
         'o:tracking-opens': true,
         'o:tag': [campaign.campaignType, campaign.inactivityLevel]
       })

       console.log(`Email sent successfully: ${data.id}`)
       return true
     } catch (error) {
       console.error('Error sending re-engagement email:', error)
       return false
     }
   }
   ```

---

## Setting Up Scheduled Jobs

The inactive detection should run **daily** via a cron job or Cloud Function.

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

1. **Create `/app/api/cron/inactive-detection/route.ts`:**

   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   import { runDailyDetection } from '@/lib/inactive-detection'

   export async function GET(request: NextRequest) {
     // Verify cron secret to prevent unauthorized calls
     const authHeader = request.headers.get('authorization')
     if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
     }

     const result = await runDailyDetection()

     return NextResponse.json({
       success: true,
       result
     })
   }
   ```

2. **Add `vercel.json`:**

   ```json
   {
     "crons": [
       {
         "path": "/api/cron/inactive-detection",
         "schedule": "0 10 * * *"
       }
     ]
   }
   ```

3. **Add Environment Variable:**
   ```bash
   CRON_SECRET=your-random-secret-here
   ```

---

### Option 2: Firebase Cloud Functions

1. **Install Functions SDK:**
   ```bash
   firebase init functions
   npm install --save firebase-functions
   ```

2. **Create `functions/src/index.ts`:**

   ```typescript
   import * as functions from 'firebase-functions'
   import { runDailyDetection } from './inactive-detection'

   export const dailyInactiveDetection = functions.pubsub
     .schedule('0 10 * * *')
     .timeZone('America/New_York')
     .onRun(async (context) => {
       console.log('Running daily inactive detection...')
       const result = await runDailyDetection()
       console.log('Detection complete:', result)
       return null
     })
   ```

3. **Deploy:**
   ```bash
   firebase deploy --only functions
   ```

---

### Option 3: GitHub Actions (Free, simple)

1. **Create `.github/workflows/inactive-detection.yml`:**

   ```yaml
   name: Daily Inactive User Detection

   on:
     schedule:
       - cron: '0 10 * * *'  # 10 AM UTC daily
     workflow_dispatch:  # Allow manual trigger

   jobs:
     detect:
       runs-on: ubuntu-latest
       steps:
         - name: Trigger Detection API
           run: |
             curl -X POST https://app.weightlossprojectlab.com/api/inactive/detect \
               -H "Authorization: Bearer ${{ secrets.ADMIN_TOKEN }}" \
               -H "Content-Type: application/json"
   ```

2. **Add Secret:**
   - Go to GitHub repo → Settings → Secrets
   - Add `ADMIN_TOKEN` with your Firebase admin token

---

## Testing

### Manual Testing

```bash
# 1. Trigger detection manually via API
curl -X POST http://localhost:3000/api/inactive/detect \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# 2. View analytics
curl http://localhost:3000/api/inactive/analytics \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 3. View campaign metrics
curl http://localhost:3000/api/inactive/campaigns \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Test Email Content

The system includes 4 campaign types with pre-written email templates:

1. **Gentle Reminder** (3-6 days inactive)
   - Subject: "Your {streak}-day streak is waiting! 🔥"
   - Tone: Friendly, encouraging

2. **Motivational** (7-13 days inactive)
   - Subject: "We miss you! Your progress deserves celebration 🎉"
   - Tone: Supportive, highlights achievements

3. **Incentive** (14-29 days inactive)
   - Subject: "Come back and get 1 month premium FREE! 🎁"
   - Tone: Offer-focused, urgency

4. **Last Chance** (30+ days inactive)
   - Subject: "We don't want to lose you 💔"
   - Tone: Emotional, final offer (3 months premium)

---

## Monitoring & Analytics

### View Inactivity Dashboard

```bash
GET /api/inactive/analytics
```

Returns:
- Total users
- Active vs inactive breakdown
- Inactivity levels (mild, moderate, severe, critical)
- Churn risk distribution
- Average inactive days

### View Campaign Performance

```bash
GET /api/inactive/campaigns
```

Returns:
- Total campaigns sent
- Open rate
- Click rate
- Conversion rate (returned users)

---

## Important Notes

1. **Email Addresses**: The current implementation uses `userId` as the email recipient. You need to modify `sendReEngagementEmail` to look up the user's actual email address from Firestore.

2. **Domain Verification**: Most email services require you to verify your sending domain to avoid spam filters.

3. **Unsubscribe Links**: Add unsubscribe functionality to comply with CAN-SPAM and GDPR:
   ```html
   <a href="https://app.weightlossprojectlab.com/unsubscribe?token={token}">Unsubscribe</a>
   ```

4. **Rate Limiting**: The system enforces a 3-day cooldown between campaigns to the same user.

5. **Testing**: Always test with your own email first before sending to real users.

---

## Next Steps

1. Choose an email service provider
2. Set up your account and verify your domain
3. Update `lib/inactive-detection.ts` with the integration code
4. Set up scheduled jobs (cron, Cloud Functions, or GitHub Actions)
5. Test with your own email
6. Monitor campaign performance via analytics API
7. Adjust email content and timing based on metrics

---

## Support

If you need help setting up:
- Check the email service provider's documentation
- Review Firebase Cloud Functions docs: https://firebase.google.com/docs/functions
- Review Vercel Cron docs: https://vercel.com/docs/cron-jobs

The core detection logic is complete and ready to use once email service is configured.
