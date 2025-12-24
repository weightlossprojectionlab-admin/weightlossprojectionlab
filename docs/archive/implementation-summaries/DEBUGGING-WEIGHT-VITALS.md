# Debugging Weight Vitals Not Showing

## Problem
Weight is entered in the wizard but doesn't appear in "Today's Vitals" or weight trends chart.

## Root Cause Analysis

### Issue #1: Permission Blocking (FIXED)
**Problem:** Barbara Rice (and other caregivers) did not have `logVitals` permission enabled.
**Status:** ✅ Code fixed - new caregivers will have permission by default
**Action Needed:** Enable permission for existing caregivers

### Issue #2: Weight Transformation (FIXED)
**Problem:** Weight was in wizard UI but not being sent to API
**Status:** ✅ Fixed in `lib/vitals-wizard-transform.ts` (lines 124-135)
**Action Needed:** None - code is deployed

### Issue #3: No Historical Data
**Problem:** Weight vitals weren't saved before the fix, so no data exists
**Status:** ⚠️ Expected behavior - data only appears after fix is deployed
**Action Needed:** Test with fresh weight entry after deployment

## Step-by-Step Debugging

### Step 1: Verify Barbara Has Permission

**Option A: Via Firebase Console**
1. Open Firebase Console → Firestore
2. Search for Barbara Rice in `familyMembers` collection group
3. Check `permissions.logVitals` field
4. If `false` or missing, set to `true`

**Option B: Via UI (Recommended)**
1. Log in as patient account owner
2. Go to Family Settings
3. Find Barbara Rice
4. Edit Permissions → Enable "Log Vital Signs"
5. Save

**Option C: Run Migration Script** (requires Firebase credentials)
```bash
npx tsx scripts/fix-caregiver-logvitals-permissions.ts --dry-run
npx tsx scripts/fix-caregiver-logvitals-permissions.ts
```

### Step 2: Test Vitals Logging

1. Log in as Barbara Rice (or any caregiver)
2. Navigate to patient page
3. Open browser Developer Console (F12)
4. Go to Network tab
5. Click "Log Vitals" button
6. Enter weight (e.g., 180 lbs) + other vitals
7. Submit wizard

**Watch for:**
- POST request to `/api/patients/{id}/vitals`
- Response status:
  - ✅ **200 OK** - Success! Data saved
  - ❌ **403 Forbidden** - Permission still missing
  - ❌ **401 Unauthorized** - Auth issue
  - ❌ **400 Bad Request** - Validation error
  - ❌ **500 Internal Server Error** - Server error

### Step 3: Verify Weight Was Saved

**In Browser Console:**
```javascript
// Check the vitals array
console.log('All vitals:', vitals)
console.log('Weight vitals:', vitals.filter(v => v.type === 'weight'))
console.log('Today vitals:', vitals.filter(v => {
  const today = new Date()
  today.setHours(0,0,0,0)
  const vitalDate = new Date(v.recordedAt)
  vitalDate.setHours(0,0,0,0)
  return vitalDate.getTime() === today.getTime()
}))
```

**Expected Output:**
- If weight was saved: Array with weight objects
- If not saved: Empty array or no weight objects

### Step 4: Check Display Components

If weight data exists but doesn't display:

**Check DailyVitalsSummary:**
```javascript
// In browser console
const today = new Date()
today.setHours(0,0,0,0)
const todayVitals = vitals.filter(v => {
  const vitalDate = new Date(v.recordedAt)
  vitalDate.setHours(0,0,0,0)
  return vitalDate.getTime() === today.getTime()
})
console.log('Today vitals for display:', todayVitals)
console.log('Weight in today vitals:', todayVitals.find(v => v.type === 'weight'))
```

**Check if refetch was called:**
- Weight won't show if vitals array wasn't refreshed after save
- Look for "[PatientDetail] Vitals saved successfully" in console
- Verify page refetched data after wizard closed

### Step 5: Check Weight Trends

Weight trend chart queries weight vitals specifically:

**In Browser Console:**
```javascript
// Check all weight vitals (not just today)
const weightVitals = vitals.filter(v => v.type === 'weight')
console.log('All weight vitals:', weightVitals)
console.log('Weight count:', weightVitals.length)

// Check date range
if (weightVitals.length > 0) {
  console.log('Earliest:', new Date(weightVitals[weightVitals.length - 1].recordedAt))
  console.log('Latest:', new Date(weightVitals[0].recordedAt))
}
```

## Common Issues & Solutions

### Issue: "403 Forbidden" when logging vitals
**Cause:** `logVitals` permission not enabled
**Solution:** Follow Step 1 above to enable permission

### Issue: Weight saved but doesn't show in Today's Vitals
**Cause:** Date mismatch or display filter issue
**Solution:** Check browser console logs from Step 4

### Issue: Weight doesn't show in trends chart
**Cause:** No historical weight data OR chart not querying correctly
**Solution:**
- Verify weight vitals exist (Step 5)
- Check VitalTrendChart component is rendering
- Ensure weight is selected in trends dropdown

### Issue: Wizard completes but no data in Firebase
**Cause:** API error or network failure
**Solution:**
- Check Network tab for failed requests
- Look for error messages in browser console
- Check server logs for API errors

## Verification Checklist

- [ ] Barbara Rice has `logVitals: true` permission
- [ ] Wizard includes weight step (180 lbs example)
- [ ] POST to `/api/patients/{id}/vitals` returns 200 OK
- [ ] Response includes weight vital with type: 'weight'
- [ ] Browser console shows weight in vitals array
- [ ] Today's Vitals section shows weight card
- [ ] Weight trend chart has data points
- [ ] Weight dropdown appears in trends selector

## Files Modified in Fix

1. `lib/vitals-wizard-transform.ts` (lines 21, 32, 124-135, 153)
   - Added weight to WizardVitalData interface
   - Added weight to VitalSignInput type
   - Added weight transformation logic
   - Added weight to validation check

2. `components/wizards/SupervisedVitalsWizard.tsx`
   - Added weight step to wizard flow
   - Added weight to confirmation screen
   - Added weight to schedule display

3. `app/patients/[patientId]/page.tsx` (line 1999)
   - Added refetch() after saving vitals

4. `lib/validations/medical.ts` (Permission defaults)
5. `components/family/InviteModal.tsx` (Permission defaults)
6. `components/family/EditMemberModal.tsx` (Permission defaults)

## Expected Behavior After Fix

1. **New Caregivers:** Automatically have `logVitals: true`
2. **Weight in Wizard:** Weight step appears between blood sugar and review
3. **Weight Saving:** Weight vital saved to Firestore with type: 'weight'
4. **Weight Display:** Weight card appears in Today's Vitals (blue theme)
5. **Weight Trends:** Weight data appears in trends chart
6. **Refetch:** Vitals refresh immediately after save

## Support

If issues persist after following this guide:
1. Check server logs for detailed error messages
2. Verify Firebase security rules (though API uses Admin SDK)
3. Ensure user auth token is valid
4. Check network connectivity
5. Review browser console for JavaScript errors
