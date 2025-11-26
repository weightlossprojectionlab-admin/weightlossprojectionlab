# SendGrid Email Setup Guide

## Problem
Gmail addresses like `weightlossprojectionlab@gmail.com` cannot be used as the "From" address in SendGrid due to DMARC policies. Gmail's strict DMARC configuration prevents third-party services from sending emails on behalf of @gmail.com addresses.

## Solutions

### Option 1: Single Sender Verification (Quick - 5 minutes)

This is the fastest way to get emails working:

1. **Go to SendGrid Dashboard**
   - Login at https://app.sendgrid.com/

2. **Navigate to Sender Authentication**
   - Settings → Sender Authentication → Single Sender Verification

3. **Add a Verified Sender**
   - Click "Create New Sender"
   - Use an email address you control that is NOT @gmail.com
   - Examples:
     - `noreply@yourdomain.com` (if you own a domain)
     - `notifications@yourdomain.com`
     - Or use a SendGrid-provided email if available

4. **Verify the Email**
   - SendGrid will send a verification email
   - Click the verification link
   - The sender will now be verified

5. **Update Your .env.local**
   ```env
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_FROM_NAME=WLPL Family Health
   SENDGRID_REPLY_TO_EMAIL=weightlossprojectionlab@gmail.com  # Optional: Users can reply to your Gmail
   ```

### Option 2: Domain Authentication (Recommended - 15 minutes)

This is the professional solution and allows you to use any address @yourdomain.com:

1. **Go to SendGrid Dashboard**
   - Login at https://app.sendgrid.com/

2. **Navigate to Sender Authentication**
   - Settings → Sender Authentication → Domain Authentication

3. **Authenticate Your Domain**
   - Click "Authenticate Your Domain"
   - Enter your domain (e.g., `wlpl.app` or `weightlossprojectlab.com`)
   - Follow instructions to add DNS records (CNAME records) to your domain registrar

4. **Add DNS Records**
   - SendGrid will provide 3 CNAME records
   - Add these to your domain's DNS settings (GoDaddy, Namecheap, Cloudflare, etc.)
   - Wait 24-48 hours for DNS propagation (usually faster)

5. **Verify Domain**
   - Return to SendGrid and click "Verify"
   - Once verified, you can use ANY email address @yourdomain.com

6. **Update Your .env.local**
   ```env
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   SENDGRID_FROM_NAME=WLPL Family Health
   SENDGRID_REPLY_TO_EMAIL=weightlossprojectionlab@gmail.com
   ```

### Option 3: Temporary Testing Solution

For immediate testing, you can use a temporary email service:

1. **Create a free Mailinator or temp email**
   - Or use any non-Gmail email you control

2. **Verify as Single Sender** (Option 1 above)

3. **Update .env.local temporarily**

## Current Configuration

After fixing the code, update your `.env.local`:

```env
# Replace with your verified sender email
SENDGRID_FROM_EMAIL=your-verified-email@yourdomain.com
SENDGRID_FROM_NAME=WLPL Family Health

# Optional: Allow users to reply to your Gmail
SENDGRID_REPLY_TO_EMAIL=weightlossprojectionlab@gmail.com
```

## Why Gmail Doesn't Work

Gmail has a strict DMARC policy set to `p=quarantine` or `p=reject` which means:
- Only Gmail's own servers can send emails from @gmail.com addresses
- Third-party services like SendGrid are blocked
- This prevents email spoofing and phishing

## Testing Your Setup

After configuring, restart your dev server and test sending an invitation. Check the logs for:
- ✅ `[Email Service] Email sent successfully to ...`
- ❌ Any DMARC or authentication errors

## Resources

- [SendGrid Sender Authentication](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication)
- [DMARC Alignment Guide](https://support.google.com/a/answer/2466563)
- [Gmail Sender Guidelines](https://support.google.com/a/answer/81126)
