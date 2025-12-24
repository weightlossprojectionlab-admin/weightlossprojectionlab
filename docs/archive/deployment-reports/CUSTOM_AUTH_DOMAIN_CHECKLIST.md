# Custom Auth Domain Setup - Quick Checklist ✅

**Goal:** Show "WeightlossProjectionLab" in Google Sign-in (not "weightlossprojectionlab-8b284.firebaseapp.com")

---

## 📋 Step-by-Step Checklist

### 1️⃣ DNS Configuration (Your Domain Registrar)

- [ ] **Add CNAME record:**
  ```
  Name: auth
  Type: CNAME
  Value: weightlossprojectionlab-8b284.web.app
  TTL: 3600 (or 1 hour)
  ```

- [ ] **Verify DNS propagation:**
  ```bash
  nslookup auth.weightlossprojectionlab.com
  # Should return: weightlossprojectionlab-8b284.web.app
  ```

**Where to do this:**
- If using **Netlify DNS**: Netlify Dashboard → Domain settings → DNS records
- If using **Google Domains**: Google Domains → DNS → Custom resource records
- If using **Cloudflare**: Cloudflare → DNS → Add record

**Wait time:** 5 minutes - 48 hours (usually <1 hour)

---

### 2️⃣ Firebase Hosting (Firebase Console)

- [ ] **Add custom domain:**
  1. Go to: [Firebase Console](https://console.firebase.google.com/) → `weightlossprojectionlab-8b284`
  2. Navigate to: **Hosting** → **Add custom domain**
  3. Enter: `auth.weightlossprojectionlab.com`
  4. Follow verification steps (should auto-verify if DNS is correct)

---

### 3️⃣ Firebase Auth (Firebase Console)

- [ ] **Add to authorized domains:**
  1. Go to: **Authentication** → **Settings** → **Authorized domains**
  2. Click: **Add domain**
  3. Enter: `auth.weightlossprojectionlab.com`
  4. Save

**Verify list includes:**
- ✅ `localhost`
- ✅ `weightlossprojectionlab-8b284.firebaseapp.com`
- ✅ `weightlossprojectionlab.com`
- ✅ `auth.weightlossprojectionlab.com` ← NEW!

---

### 4️⃣ Google OAuth Consent Screen (Google Cloud Console)

- [ ] **Update app name:**
  1. Go to: [Google Cloud Console](https://console.cloud.google.com/) → `weightlossprojectionlab-8b284`
  2. Navigate to: **APIs & Services** → **OAuth consent screen**
  3. Click: **EDIT APP**
  4. Update:
     ```
     App name: WeightlossProjectionLab
     User support email: perriceconsulting@gmail.com
     App logo: (optional - upload logo)
     Application home page: https://weightlossprojectionlab.com
     Application privacy policy: https://weightlossprojectionlab.com/privacy
     Application terms of service: https://weightlossprojectionlab.com/terms
     ```
  5. Click: **SAVE AND CONTINUE**

---

### 5️⃣ Google OAuth Client ID (Google Cloud Console)

- [ ] **Update redirect URIs:**
  1. Stay in **Google Cloud Console**
  2. Navigate to: **APIs & Services** → **Credentials**
  3. Find: **Web client** (OAuth 2.0 Client ID)
  4. Click: **Edit**
  5. **Authorized redirect URIs** - ADD these:
     ```
     https://auth.weightlossprojectionlab.com/__/auth/handler
     http://localhost:3000/__/auth/handler
     https://weightlossprojectionlab.com/__/auth/handler
     ```
  6. **Keep existing:** `https://weightlossprojectionlab-8b284.firebaseapp.com/__/auth/handler`
  7. Click: **SAVE**

---

### 6️⃣ Update Local Environment (Your Code)

- [ ] **Backup current `.env.local`:**
  ```bash
  cp .env.local .env.local.backup
  ```

- [ ] **Update auth domain:**
  ```bash
  # Open .env.local and change line 3:
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=auth.weightlossprojectionlab.com
  ```

  **OR use prepared file:**
  ```bash
  cp .env.local.custom-domain .env.local
  ```

- [ ] **Restart dev server:**
  ```bash
  # Kill old server (Ctrl+C)
  npm run dev
  ```

---

### 7️⃣ Test Locally

- [ ] **Open browser:**
  ```
  http://localhost:3000/auth
  ```

- [ ] **Click "Continue with Google"**

- [ ] **Verify consent screen shows:**
  - ✅ App name: "WeightlossProjectionLab"
  - ✅ Domain: "auth.weightlossprojectionlab.com" (not the long Firebase one)
  - ✅ Sign-in works without errors

- [ ] **Check browser console:**
  - No CORS errors
  - No redirect_uri_mismatch errors

---

### 8️⃣ Update Production Environment (Netlify)

- [ ] **Update Netlify environment variables:**
  1. Go to: [Netlify Dashboard](https://app.netlify.com/)
  2. Select: `weightlossprojectionlab` site
  3. Navigate to: **Site settings** → **Environment variables**
  4. Find: `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  5. Edit: Change to `auth.weightlossprojectionlab.com`
  6. Click: **Save**

- [ ] **Update `.env.production`:**
  ```bash
  # In your code, update line 3:
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=auth.weightlossprojectionlab.com
  ```

- [ ] **Commit and deploy:**
  ```bash
  git add .env.production
  git commit -m "Update Firebase auth domain to custom domain"
  git push
  ```

- [ ] **Trigger Netlify deploy:**
  - Should auto-deploy on push
  - OR manually: Netlify Dashboard → **Deploys** → **Trigger deploy**

---

### 9️⃣ Test Production

- [ ] **Open production site:**
  ```
  https://weightlossprojectionlab.com/auth
  ```

- [ ] **Click "Continue with Google"**

- [ ] **Verify same as local:**
  - ✅ App name: "WeightlossProjectionLab"
  - ✅ Domain: "auth.weightlossprojectionlab.com"
  - ✅ Sign-in works

---

## 🚨 Common Errors & Fixes

### Error: "redirect_uri_mismatch"

**Fix:** Add redirect URI to Google OAuth client:
```
https://auth.weightlossprojectionlab.com/__/auth/handler
```

### Error: "auth/unauthorized-domain"

**Fix:** Add `auth.weightlossprojectionlab.com` to Firebase Auth authorized domains

### Error: DNS not resolving

**Fix:** Wait for DNS propagation (up to 48 hours), then check:
```bash
nslookup auth.weightlossprojectionlab.com
```

### Still showing old domain?

**Fix:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Try incognito mode

---

## 📊 What Success Looks Like

### Before:
```
Sign in with Google
Continue to weightlossprojectionlab-8b284.firebaseapp.com
weightlossprojectionlab-8b284.firebaseapp.com
```

### After:
```
Sign in with Google
Continue to WeightlossProjectionLab
auth.weightlossprojectionlab.com
```

---

## 🔄 Rollback (If Needed)

If something breaks:

```bash
# Restore old config
cp .env.local.backup .env.local

# Restart server
npm run dev
```

---

## ⏱️ Time Estimate

- DNS setup: 5 minutes
- Firebase config: 10 minutes
- Google OAuth update: 5 minutes
- Code changes: 2 minutes
- Testing: 10 minutes
- **Total: ~30 minutes** (+ DNS propagation wait time)

---

## 📞 Need Help?

**Full documentation:** `docs/CUSTOM_AUTH_DOMAIN_SETUP.md`

**Firebase Auth Docs:** https://firebase.google.com/docs/auth/web/custom-domain
