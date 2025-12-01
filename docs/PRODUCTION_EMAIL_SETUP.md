# Production Email Setup Checklist

## Issue: Invitation Emails Not Sending in Production

This checklist will help you diagnose and fix SendGrid email issues in your production environment.

---

## Step 1: Verify SendGrid API Key is Set

### Check Production Environment Variables

1. **Firebase Hosting** (if using Firebase):
   ```bash
   firebase functions:config:get
   ```
   Look for: `sendgrid.api_key`, `sendgrid.from_email`, `sendgrid.from_name`

2. **Vercel** (if using Vercel):
   - Go to: https://vercel.com/[your-project]/settings/environment-variables
   - Check for: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`

3. **Other hosting platforms**:
   - Check your platform's environment variable settings
   - Ensure variables are set for **production** environment (not just preview/development)

### Set Missing Variables

If variables are missing, add them:

```
SENDGRID_API_KEY=SG.your-actual-api-key-from-sendgrid
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=WLPL Family Health
SENDGRID_REPLY_TO_EMAIL=support@yourdomain.com (optional)
```

**IMPORTANT:** Do NOT use `@gmail.com` as the FROM_EMAIL - it will fail due to DMARC policies.

---

## Step 2: Verify Sender Email in SendGrid

Your `FROM_EMAIL` must be verified in SendGrid:

### Option A: Single Sender Verification (5 minutes)

1. Login to SendGrid: https://app.sendgrid.com/
2. Go to: **Settings → Sender Authentication → Single Sender Verification**
3. Click **"Create New Sender"**
4. Enter email details:
   - **From Email**: Use the same email as `SENDGRID_FROM_EMAIL`
   - **From Name**: WLPL Family Health
   - **Reply To**: Your support email (can be Gmail)
   - **Company**: Your company name
   - **Address**: Required fields
5. Click **"Create"**
6. **Check your email inbox** for verification email
7. Click the verification link
8. Status should change to **"Verified"** ✅

### Option B: Domain Authentication (Recommended for production)

1. Login to SendGrid: https://app.sendgrid.com/
2. Go to: **Settings → Sender Authentication → Domain Authentication**
3. Click **"Authenticate Your Domain"**
4. Enter your domain (e.g., `wlpl.app` or `yourdomain.com`)
5. Copy the DNS records provided by SendGrid
6. Add these CNAME records to your domain DNS settings:
   - Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
   - Add all 3 CNAME records provided by SendGrid
7. Wait 10-60 minutes for DNS propagation
8. Return to SendGrid and click **"Verify"**
9. Status should show **"Verified"** ✅

---

## Step 3: Check SendGrid API Key Permissions

1. Go to SendGrid: https://app.sendgrid.com/settings/api_keys
2. Find your API key (or create a new one)
3. Ensure it has **"Full Access"** or at minimum:
   - ✅ Mail Send (required)
   - ✅ Mail Settings (optional, for tracking)

If needed, regenerate the API key and update your production environment variables.

---

## Step 4: Test Email Sending Locally

Before deploying, test locally:

```bash
# Install dependencies if needed
npm install dotenv

# Run the test script
npx tsx scripts/test-sendgrid.ts
```

This script will:
- ✅ Verify all environment variables are set
- ✅ Check FROM_EMAIL format (no @gmail.com)
- ✅ Initialize SendGrid client
- ✅ Optionally send a test email

If the test passes locally but fails in production, the issue is with your production environment variables.

---

## Step 5: Check Production Logs

After deploying with correct environment variables:

1. Trigger an invitation email in production
2. Check your server logs for:

### Success Indicators:
```
[Email Service] Attempting to send email to user@example.com from noreply@yourdomain.com
[Email Service] ✅ Email sent successfully to user@example.com
```

### Error Indicators:
```
❌ SENDGRID_API_KEY not configured
❌ SENDGRID_FROM_EMAIL is not verified
🚨 DMARC/Authentication Error Detected
```

### Common Error Messages:

**"SENDGRID_API_KEY not configured"**
- ✅ Fix: Set `SENDGRID_API_KEY` in production environment variables

**"The from address does not match a verified Sender Identity"**
- ✅ Fix: Verify your FROM_EMAIL in SendGrid dashboard (Step 2 above)

**"DMARC policy prevents sending"**
- ✅ Fix: Change FROM_EMAIL to a domain you own (not @gmail.com)
- ✅ Fix: Set up domain authentication in SendGrid

**"Unauthorized"**
- ✅ Fix: Regenerate SendGrid API key and update production env vars
- ✅ Fix: Ensure API key has "Mail Send" permission

---

## Step 6: Verify Email Delivery

After fixing the configuration:

1. Send a test invitation from production
2. Check recipient's inbox (and spam folder)
3. Verify email shows correct:
   - From: Your verified sender (e.g., "WLPL Family Health <noreply@yourdomain.com>")
   - Reply-To: Your support email (if configured)
   - Subject: Invitation subject line
   - Content: Invitation code and accept link

---

## Step 7: Monitor SendGrid Activity

Check SendGrid dashboard for delivery stats:

1. Go to: https://app.sendgrid.com/stats
2. Look for recent email activity
3. Check for:
   - ✅ **Delivered**: Email sent successfully
   - ⚠️  **Bounced**: Invalid recipient email
   - ⚠️  **Blocked**: Authentication failed or spam detected

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| No logs at all | Environment variables not set in production |
| "Not configured" error | Set `SENDGRID_API_KEY` in production env |
| "Not verified" error | Verify sender in SendGrid dashboard |
| DMARC error | Don't use @gmail.com, use your own domain |
| "Unauthorized" | API key invalid or lacks permissions |
| Email in spam | Set up domain authentication (Step 2, Option B) |

---

## Production Checklist

Before marking this as resolved, verify:

- [ ] `SENDGRID_API_KEY` is set in production environment
- [ ] `SENDGRID_FROM_EMAIL` is set to a verified sender
- [ ] `SENDGRID_FROM_NAME` is set (optional but recommended)
- [ ] FROM_EMAIL does NOT use @gmail.com
- [ ] Sender is verified in SendGrid dashboard
- [ ] API key has "Mail Send" permission
- [ ] Test invitation email sent successfully
- [ ] Email appears in recipient inbox (not spam)
- [ ] Production logs show success message

---

## Additional Resources

- [SendGrid Setup Guide](./SENDGRID_SETUP.md)
- [SendGrid API Keys](https://app.sendgrid.com/settings/api_keys)
- [Sender Authentication](https://app.sendgrid.com/settings/sender_auth)
- [Email Activity Dashboard](https://app.sendgrid.com/email_activity)

---

## Support

If you're still having issues after following this checklist:

1. Run the test script: `npx tsx scripts/test-sendgrid.ts`
2. Share the output and production logs
3. Verify sender authentication status in SendGrid dashboard
4. Check SendGrid activity feed for rejected emails
