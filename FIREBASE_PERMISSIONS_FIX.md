# Firebase Permissions Error - Root Cause Analysis & Fix

## Problem Summary
Admin dashboard showing "Error Loading Stats - Missing or insufficient permissions" despite:
- User authenticated with email: `weightlossprojectionlab@gmail.com`
- Email hardcoded in Firestore rules `isSuperAdmin()` function
- Firestore rules deployed successfully

## Root Cause Analysis

### 1. Missing Custom Claims (PRIMARY ISSUE)
**The user's ID token had no custom claims set.**

When examining the Firebase Auth export:
```json
{
  "localId": "Y8wSTgymg3YXWU94iJVjzoGxsMI2",
  "email": "weightlossprojectionlab@gmail.com",
  "customAttributes": "{}"  // ← EMPTY!
}
```

**Why this matters:**
- Firestore security rules execute on the server using the **ID token** sent with each request
- The ID token contains `request.auth.token.email` and custom claims like `request.auth.token.admin`
- Even though the email matches the hardcoded whitelist in rules, **Firebase Auth tokens cache the email and claims**
- Without custom claims, `request.auth.token.admin == true` evaluates to `false`

### 2. How Firestore Rules Evaluate

The `isAdmin()` function in `firestore.rules` checks:
```javascript
function isAdmin() {
  return isAuthenticated() &&
         (isSuperAdmin() ||
          request.auth.token.admin == true);  // ← This was failing
}

function isSuperAdmin() {
  return isAuthenticated() &&
         (request.auth.token.email == 'perriceconsulting@gmail.com' ||
          request.auth.token.email == 'weightlossprojectionlab@gmail.com');
}
```

**Problem:** The email check in `isSuperAdmin()` should have worked, BUT:
- There was a typo in `lib/admin-auth.ts`: `'weigthlossprojectionlab@gmail.com'` (missing 's')
- This typo meant the backend admin verification also failed
- Frontend was getting 403 errors from backend API routes

### 3. Token Refresh Mechanism
Firebase Auth tokens have these characteristics:
- Issued on sign-in with a 1-hour expiration
- Cached in browser local storage
- **Do NOT automatically update when custom claims change**
- User must sign out + sign in to get new claims

## The Solution

### Step 1: Set Custom Claims (COMPLETED ✅)
```bash
node scripts/set-admin-claims.js
```

This script set the following claims for both admin emails:
- `admin: true`
- `role: 'admin'`
- `moderator: true`
- `support: true`

### Step 2: Fix Typo in admin-auth.ts (COMPLETED ✅)
Changed:
```typescript
'weigthlossprojectionlab@gmail.com'  // ❌ WRONG
```
To:
```typescript
'weightlossprojectionlab@gmail.com'  // ✅ CORRECT
```

### Step 3: User Must Sign Out + Sign In (USER ACTION REQUIRED ⚠️)
**CRITICAL:** The user must:
1. Sign out of the application
2. Clear browser cache/cookies (optional but recommended)
3. Sign back in

Only then will the new custom claims be included in the ID token.

## Verification

Run the diagnostic script to verify claims:
```bash
node scripts/diagnose-firebase-auth.js weightlossprojectionlab@gmail.com
```

Expected output:
```
🏷️  Custom Claims:
{
  "admin": true,
  "role": "admin",
  "moderator": true,
  "support": true
}
```

## Why the Email Check Wasn't Sufficient

Even though `firestore.rules` has the email hardcoded, there were multiple issues:

1. **Backend API Routes Use Different Logic**
   - API routes in `app/api/admin/*` call `verifyAdminAuth()` from `lib/admin-auth.ts`
   - This function had the typo: `'weigthlossprojectionlab@gmail.com'`
   - So backend rejected the admin even though Firestore rules would have allowed it

2. **Custom Claims Are Best Practice**
   - Email-based checks are fragile (typos, case sensitivity)
   - Custom claims are cryptographically signed in the token
   - No database query needed for verification
   - Consistent across all Firebase services

3. **Token Lifecycle**
   - Old tokens persist for 1 hour after claims are set
   - Sign-out forces immediate token invalidation
   - Sign-in generates new token with updated claims

## Additional Files Created

1. **scripts/set-admin-claims.js**
   - Sets admin claims for super admin emails
   - Run after adding new admin users

2. **scripts/diagnose-firebase-auth.js**
   - Diagnostic tool to inspect user tokens and claims
   - Helps debug permission issues

## Testing the Fix

After the user signs out and back in:

1. Check browser console - should see no 403 errors
2. Admin dashboard stats should load successfully
3. All admin collections should be accessible:
   - ✅ `users` collection (list query)
   - ✅ `dispute_cases` collection (list query)
   - ✅ `recipes` collection
   - ✅ `publicRecipes` collection (with moderator check)
   - ✅ `ai_decision_logs` collection

## Future Prevention

1. **Always set custom claims for new admins:**
   ```bash
   node scripts/set-admin-claims.js
   ```

2. **Use TypeScript constants for emails:**
   ```typescript
   const SUPER_ADMIN_EMAILS = [
     'perriceconsulting@gmail.com',
     'weightlossprojectionlab@gmail.com'
   ] as const;
   ```

3. **Add unit tests for admin auth logic**

4. **Document the sign-out requirement** when claims change

## Summary

| Issue | Root Cause | Fix | Status |
|-------|------------|-----|--------|
| Missing custom claims | Never set after user creation | `set-admin-claims.js` | ✅ Fixed |
| Email typo in backend | Copy-paste error | Corrected in `admin-auth.ts` | ✅ Fixed |
| Old token cached | Firebase Auth behavior | User must sign out/in | ⚠️ User Action Required |

**Next Step:** User must sign out and sign back in for changes to take effect.
