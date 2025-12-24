# Email Delivery Fix Guide

## Problem
Emails from SendGrid are bouncing at Gmail, even though domain is authenticated.

## Root Cause
Gmail updated requirements in 2024/2025 to require:
1. ✅ SPF/DKIM (already done - domain verified)
2. ❌ DMARC policy (missing)
3. ❌ List-Unsubscribe header (missing)
4. ❌ Avoid "noreply@" addresses (Gmail deprioritizes these)

## Solutions Implemented

### ✅ 1. Changed Email Address
- **Old:** `noreply@em7394.www.weightlossprojectionlab.com`
- **New:** `support@em7394.www.weightlossprojectionlab.com`
- Gmail prefers real-looking addresses over "noreply"

### ✅ 2. Added Gmail Compliance Headers
- Added `List-Unsubscribe` header
- Added `List-Unsubscribe-Post` for one-click unsubscribe
- Disabled click/open tracking (reduces spam score)

### ⏳ 3. DMARC DNS Record (YOU NEED TO DO THIS)

**This is the most important step!** Add this DNS record:

```
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:weightlossprojectionlab@gmail.com; pct=100; adkim=r; aspf=r
```

**Where to add it:**

#### If using Cloudflare:
1. Log in to Cloudflare
2. Select your domain `weightlossprojectionlab.com`
3. Click **DNS** in the left menu
4. Click **Add record**
5. Type: `TXT`
6. Name: `_dmarc`
7. Content: `v=DMARC1; p=none; rua=mailto:weightlossprojectionlab@gmail.com; pct=100; adkim=r; aspf=r`
8. Click **Save**

#### If using GoDaddy:
1. Log in to GoDaddy
2. Go to **My Products** → **DNS**
3. Scroll to **Records** section
4. Click **Add** → **TXT**
5. Host: `_dmarc`
6. TXT Value: `v=DMARC1; p=none; rua=mailto:weightlossprojectionlab@gmail.com; pct=100; adkim=r; aspf=r`
7. Click **Save**

#### If using Namecheap:
1. Log in to Namecheap
2. Domain List → Manage → **Advanced DNS**
3. Click **Add New Record**
4. Type: `TXT Record`
5. Host: `_dmarc`
6. Value: `v=DMARC1; p=none; rua=mailto:weightlossprojectionlab@gmail.com; pct=100; adkim=r; aspf=r`
7. Click **Save**

**Wait Time:** DNS changes take 1-24 hours to propagate.

## Testing

### After Adding DMARC:
1. Wait 2-4 hours for DNS propagation
2. Test email delivery by sending an invitation
3. Check SendGrid Activity Feed for delivery status

### Check if DMARC is Working:
Use this tool: https://mxtoolbox.com/dmarc.aspx
- Enter: `weightlossprojectionlab.com`
- Should show your DMARC policy

## What Each DMARC Parameter Means:
- `v=DMARC1` - Version 1 of DMARC
- `p=none` - Policy: monitor only (don't reject emails yet)
- `rua=mailto:...` - Where to send aggregate reports
- `pct=100` - Apply to 100% of emails
- `adkim=r` - Relaxed DKIM alignment
- `aspf=r` - Relaxed SPF alignment

## Expected Results
After DMARC is added and propagated:
- ✅ Emails should deliver to Gmail
- ✅ No more bounces
- ✅ Better inbox placement (not spam folder)

## If Still Bouncing After 24 Hours:
1. Check SendGrid Activity Feed for specific error
2. Verify DMARC record with MXToolbox
3. Try sending to non-Gmail address (Yahoo, Outlook)
4. Contact SendGrid support

## Alternative Temporary Solution
Until DMARC is set up, you can:
1. Copy the invite code shown in the toast message
2. Send it manually via text/WhatsApp
3. Recipient enters code at `/accept-invitation`
