# Custom Auth Domain Setup - WeightlossProjectionLab

**Goal:** Make Google Sign-in show "**WeightlossProjectionLab**" instead of "weightlossprojectionlab-8b284.firebaseapp.com"

**Current Status:** Using default Firebase auth domain
**Target:** `auth.weightlossprojectionlab.com`

---

## Overview

By default, Firebase Auth uses `[project-id].firebaseapp.com` as the auth domain. This shows up in:
- Google OAuth consent screen
- Email verification links
- Password reset links
- OAuth redirect URIs

**With custom domain, users see:**
```
Sign in with Google
Continue to WeightlossProjectionLab
auth.weightlossprojectionlab.com
```

**Instead of:**
```
Sign in with Google
Continue to weightlossprojectionlab-8b284.firebaseapp.com
weightlossprojectionlab-8b284.firebaseapp.com
```

---

## Step-by-Step Implementation

### Step 1: Add Custom Domain to Firebase Hosting

**Why:** Firebase requires the custom domain to be verified via Firebase Hosting first.

1. **Go to Firebase Console:**
   - Project: `weightlossprojectionlab-8b284`
   - Navigate to: **Hosting** → **Add custom domain**

2. **Add domain:**
   ```
   auth.weightlossprojectionlab.com
   ```

3. **Verify ownership:**
   - Firebase will provide DNS records (TXT or A/CNAME)
   - Add these to your domain registrar (e.g., Google Domains, Netlify DNS)

4. **Example DNS records:**
   ```
   Type: CNAME
   Name: auth
   Value: weightlossprojectionlab-8b284.web.app
   TTL: 3600
   ```

   **OR**

   ```
   Type: A
   Name: auth
   Value: [Firebase IP addresses provided]
   TTL: 3600
   ```

5. **Wait for verification:**
   - Can take 24-48 hours for DNS propagation
   - Firebase will auto-verify once DNS is propagated

---

### Step 2: Add Custom Domain to Firebase Auth Authorized Domains

**Why:** Firebase Auth only allows sign-in from whitelisted domains.

1. **Go to Firebase Console:**
   - Project: `weightlossprojectionlab-8b284`
   - Navigate to: **Authentication** → **Settings** → **Authorized domains**

2. **Add domain:**
   ```
   auth.weightlossprojectionlab.com
   ```

3. **Verify list includes:**
   - ✅ `localhost` (for local dev)
   - ✅ `weightlossprojectionlab-8b284.firebaseapp.com` (default)
   - ✅ `weightlossprojectionlab.com` (production domain)
   - ✅ `auth.weightlossprojectionlab.com` (new custom auth domain)
   - ✅ `[your-netlify-subdomain].netlify.app` (if using Netlify)

---

### Step 3: Update Firebase Configuration in Code

**File:** `.env.local` (local dev) and `.env.production` (production)

**Before:**
```bash
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=weightlossprojectionlab-8b284.firebaseapp.com
```

**After:**
```bash
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=auth.weightlossprojectionlab.com
```

**Also update in:**
- `.env.production` (production environment)
- Netlify environment variables (if deployed on Netlify)
- Any CI/CD environment variables

---

### Step 4: Update Google OAuth Consent Screen

**Why:** This controls the app name shown during Google Sign-in.

1. **Go to Google Cloud Console:**
   - Project: `weightlossprojectionlab-8b284`
   - Navigate to: **APIs & Services** → **OAuth consent screen**

2. **Update settings:**
   ```
   App name: WeightlossProjectionLab
   User support email: [your-email]
   Developer contact: [your-email]
   Application home page: https://weightlossprojectionlab.com
   Application privacy policy: https://weightlossprojectionlab.com/privacy
   Application terms of service: https://weightlossprojectionlab.com/terms
   Authorized domains: weightlossprojectionlab.com
   ```

3. **Update OAuth scopes (if needed):**
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`

4. **Save changes**

---

### Step 5: Update Google OAuth Client ID (Redirect URIs)

**Why:** OAuth requires exact redirect URIs to be whitelisted.

1. **Go to Google Cloud Console:**
   - Project: `weightlossprojectionlab-8b284`
   - Navigate to: **APIs & Services** → **Credentials**

2. **Find OAuth 2.0 Client ID:**
   - Click on your Web client

3. **Add Authorized redirect URIs:**
   ```
   https://auth.weightlossprojectionlab.com/__/auth/handler
   http://localhost:3000/__/auth/handler (for local dev)
   https://weightlossprojectionlab.com/__/auth/handler (production)
   ```

4. **Keep existing URIs:**
   - Don't remove `https://weightlossprojectionlab-8b284.firebaseapp.com/__/auth/handler`
   - This is used as fallback

5. **Save changes**

---

### Step 6: Update Netlify Environment Variables (If Deployed)

**Why:** Production build needs the new auth domain.

1. **Go to Netlify Dashboard:**
   - Site: `weightlossprojectionlab`
   - Navigate to: **Site settings** → **Environment variables**

2. **Update:**
   ```
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=auth.weightlossprojectionlab.com
   ```

3. **Trigger redeploy:**
   - Navigate to: **Deploys** → **Trigger deploy** → **Deploy site**

---

### Step 7: Test the Changes

#### Local Testing

1. **Update `.env.local`:**
   ```bash
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=auth.weightlossprojectionlab.com
   ```

2. **Restart dev server:**
   ```bash
   npm run dev
   ```

3. **Test Google Sign-in:**
   - Go to `http://localhost:3000/auth`
   - Click "Continue with Google"
   - **Verify consent screen shows:**
     - App name: "WeightlossProjectionLab"
     - Domain: "auth.weightlossprojectionlab.com"

#### Production Testing

1. **Deploy to Netlify:**
   ```bash
   git add .
   git commit -m "Update Firebase auth domain to custom domain"
   git push
   ```

2. **Test on production:**
   - Go to `https://weightlossprojectionlab.com/auth`
   - Click "Continue with Google"
   - **Verify same as local**

---

## DNS Configuration Example

**If using Netlify DNS:**

1. **Go to Netlify DNS settings**
2. **Add CNAME record:**
   ```
   Name: auth
   Type: CNAME
   Value: weightlossprojectionlab-8b284.web.app
   TTL: 3600
   ```

**If using Google Domains:**

1. **Go to Google Domains → DNS**
2. **Add custom resource record:**
   ```
   Name: auth
   Type: CNAME
   TTL: 1H
   Data: weightlossprojectionlab-8b284.web.app
   ```

**If using Cloudflare:**

1. **Go to Cloudflare → DNS**
2. **Add CNAME record:**
   ```
   Name: auth
   Type: CNAME
   Target: weightlossprojectionlab-8b284.web.app
   Proxy status: DNS only (gray cloud) - IMPORTANT!
   TTL: Auto
   ```

---

## Verification Checklist

- [ ] Custom domain added to Firebase Hosting
- [ ] DNS records added and propagated (check with `nslookup auth.weightlossprojectionlab.com`)
- [ ] Custom domain added to Firebase Auth authorized domains
- [ ] `.env.local` updated with new auth domain
- [ ] `.env.production` updated with new auth domain
- [ ] Netlify environment variables updated
- [ ] Google OAuth consent screen updated (app name)
- [ ] Google OAuth client redirect URIs updated
- [ ] Local testing passed (Google Sign-in works)
- [ ] Production testing passed (Google Sign-in works)

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause:** OAuth redirect URI not whitelisted

**Fix:**
1. Go to Google Cloud Console → Credentials
2. Add missing redirect URI:
   ```
   https://auth.weightlossprojectionlab.com/__/auth/handler
   ```

### Error: "auth/unauthorized-domain"

**Cause:** Domain not in Firebase Auth authorized domains

**Fix:**
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add `auth.weightlossprojectionlab.com`

### Error: "DNS_PROBE_FINISHED_NXDOMAIN"

**Cause:** DNS not configured or not propagated

**Fix:**
1. Check DNS records with `nslookup auth.weightlossprojectionlab.com`
2. Wait 24-48 hours for propagation
3. Clear browser DNS cache: `chrome://net-internals/#dns`

### Still Showing Old Domain?

**Cause:** Browser cache or old service worker

**Fix:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Try incognito mode
4. Check Network tab for `auth-domain` in Firebase config fetch

---

## What Happens After Setup?

### Google Sign-in Flow:

1. User clicks "Continue with Google"
2. **Browser shows:**
   ```
   Sign in with Google
   Continue to WeightlossProjectionLab
   auth.weightlossprojectionlab.com
   ```
3. User selects Google account
4. Redirects to: `https://auth.weightlossprojectionlab.com/__/auth/handler`
5. Firebase handles OAuth callback
6. Redirects back to your app: `https://weightlossprojectionlab.com/dashboard`

### Email Verification:

**Before:**
```
From: noreply@weightlossprojectionlab-8b284.firebaseapp.com
Link: https://weightlossprojectionlab-8b284.firebaseapp.com/__/auth/action?...
```

**After:**
```
From: noreply@auth.weightlossprojectionlab.com
Link: https://auth.weightlossprojectionlab.com/__/auth/action?...
```

---

## Cost

**Free!** Custom auth domains are included in Firebase's free tier.

---

## Timeline

- **DNS setup:** 5 minutes
- **Firebase configuration:** 10 minutes
- **Google OAuth update:** 5 minutes
- **DNS propagation:** 24-48 hours
- **Testing:** 10 minutes

**Total active time:** ~30 minutes
**Total wait time:** Up to 48 hours (DNS propagation)

---

## Quick Start (TL;DR)

```bash
# 1. Add DNS CNAME record
# Name: auth
# Value: weightlossprojectionlab-8b284.web.app

# 2. Add to Firebase Auth authorized domains
# auth.weightlossprojectionlab.com

# 3. Update .env.local
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=auth.weightlossprojectionlab.com

# 4. Update Google OAuth consent screen
# App name: WeightlossProjectionLab

# 5. Add OAuth redirect URI
# https://auth.weightlossprojectionlab.com/__/auth/handler

# 6. Restart dev server
npm run dev

# 7. Test Google Sign-in
# http://localhost:3000/auth
```

---

## References

- [Firebase Custom Auth Domain Docs](https://firebase.google.com/docs/auth/web/custom-domain)
- [Google OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent)
- [Firebase Hosting Custom Domain](https://firebase.google.com/docs/hosting/custom-domain)
