# Deployment Guide: Bulk Clear Permissions & Shopping Session Protection

## 📋 Pre-Deployment Checklist

- ✅ Firestore Security Rules updated (`firestore.rules`)
- ✅ Firestore Indexes configured (`firestore.indexes.json`)
- ✅ All source files created/updated
- ✅ TypeScript compiles without errors

## 🚀 Deployment Steps

### Step 1: Authenticate with Firebase

Open a terminal and run:

```bash
firebase login
```

This will open a browser window for authentication.

### Step 2: Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

**Expected Output:**
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project/overview
```

**What this does:**
- Updates security rules for `shopping_sessions` collection
- Updates security rules for `bulk_operation_audit_logs` collection
- Enforces role-based permissions on bulk operations

### Step 3: Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

**Expected Output:**
```
✔ Deploy complete!
```

**What this does:**
- Creates composite index for: `householdId + status + lastActivityAt`
- Creates composite index for: `userId + status + startedAt`
- Creates composite index for: `status + lastActivityAt`
- Creates composite index for: `performedBy + timestamp`
- Creates composite index for: `householdId + operation + timestamp`

**Note:** Indexes may take 5-15 minutes to build. You'll receive an email when complete.

### Alternative: Firebase Console Deployment

If CLI deployment fails, use the Firebase Console:

#### Deploy Rules via Console:

1. Go to https://console.firebase.google.com
2. Select your project
3. Click **Firestore Database** → **Rules**
4. Copy entire contents from `firestore.rules`
5. Paste into the editor
6. Click **Publish**

#### Create Indexes via Console:

1. In Firestore Database, click **Indexes** tab
2. When you run queries, Firebase will automatically prompt to create missing indexes
3. Click the auto-generated links to create them
4. Or manually add indexes from `firestore.indexes.json`

## ✅ Verification Steps

### 1. Verify Rules Deployment

```bash
firebase firestore:rules:get
```

Check that the output includes the new rules for `shopping_sessions` and `bulk_operation_audit_logs`.

### 2. Verify Indexes Status

Go to Firebase Console → Firestore Database → Indexes

You should see:
- ✅ `shopping_sessions` indexes (3 total)
- ✅ `bulk_operation_audit_logs` indexes (2 total)

Status should show "Enabled" (may show "Building" initially).

### 3. Test in Browser Console

Open your app in the browser and run:

```javascript
// Check if firebase is available
console.log('Firebase initialized:', !!firebase);

// Try to read shopping sessions (should work)
const sessionsRef = firebase.firestore().collection('shopping_sessions');
sessionsRef.limit(1).get()
  .then(() => console.log('✅ Can read shopping_sessions'))
  .catch(err => console.error('❌ Cannot read:', err));
```

## 🧪 Testing the Implementation

### Test 1: Permission Blocking (Caregiver Role)

**Setup:**
1. Login as a user with **caregiver** role (not owner/primary_caregiver)
2. Navigate to `/shopping`
3. Add some items to the list
4. Click "Clear List" button

**Expected Result:**
```
🔒 Permission Required

Only the household owner or primary caregiver can clear the entire shopping list.

Your role: Caregiver
Required: Owner or Primary Caregiver
```

✅ **Pass:** Modal appears, bulk clear is blocked
❌ **Fail:** List clears without permission check

### Test 2: Session Blocking (Active Shopping)

**Setup:**
1. Login as User A (owner/primary_caregiver)
2. Click on a shopping list item to start sequential shopping flow
3. Scan a barcode (this starts a session)
4. **In another browser/tab**, login as User B (owner/primary_caregiver)
5. Try to click "Clear List"

**Expected Result:**
```
🛒 Someone is Shopping

[User A Name] is currently at the store scanning items.

Clearing the list now could disrupt their shopping session.
```

✅ **Pass:** Modal appears, bulk clear is blocked
❌ **Fail:** List clears despite active session

### Test 3: Individual Operations Still Work

**Setup:**
1. With User A still shopping (active session)
2. As User B, try to:
   - Add a new item
   - Remove an individual item
   - Mark an item as purchased

**Expected Result:**
✅ **Pass:** All individual operations work normally
❌ **Fail:** Individual operations are blocked

### Test 4: Session Expiry

**Setup:**
1. Start shopping session
2. Wait 3 minutes without any activity
3. Try to bulk clear as another user

**Expected Result:**
✅ **Pass:** Session expires, bulk clear is allowed
❌ **Fail:** Session stays active indefinitely

### Test 5: Session End on Complete

**Setup:**
1. Start shopping session
2. Scan some items
3. Complete the purchase flow
4. Try to bulk clear as another user

**Expected Result:**
✅ **Pass:** Session ends, bulk clear is allowed immediately
❌ **Fail:** Session remains active after completion

## 📊 Monitoring & Analytics

### Check Active Sessions

In Firestore Console, navigate to `shopping_sessions` collection:

**Healthy State:**
- Sessions have `status: 'active'` only during actual shopping
- `lastActivityAt` is recent (< 30 seconds old)
- Sessions transition to `completed` after shopping

**Warning Signs:**
- Many sessions with `status: 'active'` but old `lastActivityAt` (> 5 min)
- Sessions stuck in `paused` state
- Zero sessions created (feature not being used)

### Check Audit Logs

Navigate to `bulk_operation_audit_logs` collection:

Each log should contain:
- `performedBy`: User ID who attempted operation
- `operation`: 'clear_list' or 'batch_discard'
- `success`: true/false
- `permissionCheckResult`: Details about why blocked/allowed
- `timestamp`: When it happened

### Query Examples

**Find all blocked operations:**
```javascript
db.collection('bulk_operation_audit_logs')
  .where('success', '==', false)
  .orderBy('timestamp', 'desc')
  .limit(10)
  .get()
```

**Find active sessions by household:**
```javascript
db.collection('shopping_sessions')
  .where('householdId', '==', 'USER_ID')
  .where('status', '==', 'active')
  .get()
```

## 🐛 Troubleshooting

### Issue: "Missing or insufficient permissions" error

**Cause:** Firestore Security Rules not deployed or incorrect

**Fix:**
```bash
firebase deploy --only firestore:rules
```

Verify in Firebase Console → Firestore → Rules

### Issue: "The query requires an index" error

**Cause:** Composite indexes not created

**Fix:**
1. Click the link in the error message (Firebase auto-generates index creation link)
2. Or manually deploy: `firebase deploy --only firestore:indexes`
3. Wait 5-15 minutes for indexes to build

### Issue: Sessions never expire

**Cause:** Missing Cloud Function for cleanup (optional enhancement)

**Workaround:**
- Sessions auto-expire based on `expiresAt` field (2 hours max)
- Manual cleanup: Delete old sessions from Firestore Console

### Issue: Permission modal doesn't show

**Cause:** Missing imports or error not caught

**Check:**
1. Browser console for JavaScript errors
2. Verify `BlockedOperationModal` is imported in `app/shopping/page.tsx`
3. Verify `BulkOperationBlockedError` is caught in try/catch

**Fix:**
```typescript
import { BlockedOperationModal } from '@/components/shopping/BlockedOperationModal'
import { BulkOperationBlockedError } from '@/lib/permissions-guard'
```

### Issue: Build errors after deployment

**Cause:** TypeScript type mismatches

**Fix:**
```bash
npm run build
```

Check for any TypeScript errors and fix before deploying

## 🔄 Rollback Procedure

If you need to rollback the changes:

### Option 1: Git Revert

```bash
git log --oneline -10  # Find commit hash before changes
git revert <commit-hash>
git push
```

### Option 2: Manual Rollback

1. **Remove permission checks from `lib/shopping-operations.ts`:**
   - Remove `verifyBulkOperationPermission` calls
   - Remove `BulkOperationBlockedError` throws

2. **Restore old Firestore Rules:**
   ```bash
   git checkout HEAD~1 firestore.rules
   firebase deploy --only firestore:rules
   ```

3. **Remove new UI components:**
   - Delete `BlockedOperationModal` usage from pages
   - App will function as before (no permission checks)

## 📈 Success Metrics

After 1 week of deployment, check:

- ✅ **< 5% false positive rate** (legitimate users blocked incorrectly)
- ✅ **> 80% adoption rate** (shopping sessions being created)
- ✅ **Zero unauthorized bulk deletions** (audit logs show only owner/primary_caregiver)
- ✅ **< 1% stuck sessions** (sessions properly expiring)

## 🎯 Next Steps (Future Enhancements)

Once core functionality is stable:

1. **Add Cloud Function for session cleanup**
   - Runs hourly
   - Marks stale sessions as expired
   - Prevents orphaned sessions

2. **Add push notifications**
   - Notify active shopper when list is cleared
   - "Your shopping list was cleared by [Name]"

3. **Add session restore capability**
   - Cache last 30 minutes of session data
   - Restore if accidentally cleared

4. **Analytics dashboard**
   - Session duration trends
   - Permission denial frequency
   - Most common blocking scenarios

---

## ✨ Deployment Complete!

Once you've completed all steps above, the bulk clear permissions and shopping session protection system is fully deployed and operational!

**Questions or Issues?**
Check the troubleshooting section or review the implementation files.
