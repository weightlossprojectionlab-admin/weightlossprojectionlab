# Subscription System Testing Plan

## Overview
This document provides a comprehensive manual testing plan for the subscription system implementation. Follow these steps to verify all features, limits, and enforcement logic work correctly.

---

## Prerequisites

### 1. Start Development Server
```bash
npm run dev
```
Navigate to http://localhost:3000

### 2. Test Account Setup
- Use a development/test Firebase account
- Have the ability to modify user subscription data in Firestore
- Or use the SubscriptionSimulator component (if available in dev mode)

---

## Test Plan

### Phase 1: Visual Display Testing

#### Test 1.1: PlanBadge Tooltip Display
**Location:** `/patients` or `/profile`

**Steps:**
1. Navigate to the patients page
2. Locate the PlanBadge component showing your current plan
3. Hover over the plan badge

**Expected Results:**
- ✅ Tooltip appears showing seat and caregiver limits
- ✅ Format: "{X} seats • {Y} caregivers"
- ✅ For Family Premium: "Unlimited seats • Unlimited caregivers" (NOT "999 seats • 999 caregivers")

**Test Cases:**
| Plan | Expected Tooltip |
|------|------------------|
| Free Trial | 1 seats • 0 caregivers |
| Single User | 1 seats • 2 caregivers |
| Family Basic | 5 seats • 5 caregivers |
| Family Plus | 10 seats • 10 caregivers |
| Family Premium | Unlimited seats • Unlimited caregivers |

---

#### Test 1.2: Plan Information Display
**Location:** `/patients`

**Steps:**
1. Navigate to patients page
2. Look for the "Member Limit Indicator" section

**Expected Results:**
- ✅ Shows current seat usage: "X of Y"
- ✅ Shows PlanBadge with correct plan name
- ✅ Progress bar displays correct percentage
- ✅ Color coding:
  - Green: 0-79% usage
  - Yellow: 80-99% usage
  - Red: 100% usage

---

### Phase 2: Seat Limit Enforcement

#### Test 2.1: Add Family Member - Within Limit
**Location:** `/patients`

**Setup:** Have a plan with available seats (e.g., Family Basic with 2/5 used)

**Steps:**
1. Navigate to patients page
2. Click "Add Member" button

**Expected Results:**
- ✅ Button is enabled and clickable
- ✅ Redirects to `/patients/new`
- ✅ Can successfully create a new family member

---

#### Test 2.2: Add Family Member - At Limit
**Location:** `/patients`

**Setup:** Have a plan at seat limit (e.g., Single User with 1/1 used)

**Steps:**
1. Navigate to patients page
2. Look for add member button

**Expected Results:**
- ✅ Button changes to "🔒 Upgrade to Add More"
- ✅ Button has yellow/warning styling
- ✅ Clicking button shows UpgradeModal
- ✅ Cannot navigate to `/patients/new` directly

---

#### Test 2.3: Different Plan Tiers
**Setup:** Test each plan tier

| Plan | Max Seats | Test Scenario |
|------|-----------|---------------|
| Free Trial | 1 | Should show upgrade at 1 seat |
| Single User | 1 | Should show upgrade at 1 seat |
| Family Basic | 5 | Should allow up to 5 seats |
| Family Plus | 10 | Should allow up to 10 seats |
| Family Premium | 999 | Should allow unlimited seats |

**Steps:**
1. For each plan, add family members up to the limit
2. Verify enforcement triggers at correct count
3. Verify progress bar shows correct percentage

**Expected Results:**
- ✅ Each plan enforces its specific limit correctly
- ✅ Family Premium never shows "at limit" state

---

### Phase 3: Caregiver Limit Enforcement

#### Test 3.1: Invite External Caregiver - Within Limit
**Location:** `/households` or caregiver invitation flow

**Setup:** Have a plan with available caregiver slots (e.g., Single User with 0/2 used)

**Steps:**
1. Navigate to caregiver invitation page
2. Attempt to invite an external caregiver

**Expected Results:**
- ✅ Invitation form is accessible
- ✅ Shows remaining caregiver slots: "X of Y"
- ✅ Can successfully send invitation

---

#### Test 3.2: Invite External Caregiver - At Limit
**Location:** `/households` or caregiver invitation flow

**Setup:** Have a plan at caregiver limit (e.g., Free Trial with 0/0 - no caregivers allowed)

**Steps:**
1. Navigate to caregiver invitation page
2. Look for invitation option

**Expected Results:**
- ✅ Shows "You've reached your external caregiver limit"
- ✅ Suggests upgrading to add more caregivers
- ✅ Invitation form is disabled or shows upgrade prompt

---

#### Test 3.3: InvitationTypeModal Display
**Location:** Wherever InvitationTypeModal is used

**Setup:** Test with different usage levels

**Scenario 1: Both Options Available**
- Family Basic plan: 2/5 seats, 1/5 caregivers

**Expected Results:**
- ✅ Both "Family Member" and "External Caregiver" cards are enabled
- ✅ Shows usage counters correctly
- ✅ No error messages displayed

**Scenario 2: Family Member Limit Reached**
- Single User plan: 1/1 seats, 0/2 caregivers

**Expected Results:**
- ✅ "Family Member" card is disabled with opacity
- ✅ Shows error: "You've reached your seat limit. Upgrade your plan to add more family members."
- ✅ "External Caregiver" card remains enabled
- ✅ Seat counter shows: "1 / 1" in red

**Scenario 3: Caregiver Limit Reached**
- Single User plan: 1/1 seats, 2/2 caregivers

**Expected Results:**
- ✅ "Family Member" card is disabled
- ✅ "External Caregiver" card is disabled with opacity
- ✅ Shows error: "You've reached your external caregiver limit. Upgrade your plan to add more."
- ✅ Caregiver counter shows: "2 / 2" in red

**Scenario 4: Premium Unlimited**
- Family Premium plan: 15/999 seats, 8/999 caregivers

**Expected Results:**
- ✅ Both cards enabled
- ✅ Shows "15 / Unlimited" for seats (NOT "15 / 999")
- ✅ Shows "8 / Unlimited" for caregivers (NOT "8 / 999")

---

### Phase 4: Feature Gate Testing

#### Test 4.1: Basic Features (All Plans)
**Features to test:**
- Meal logging
- Weight tracking
- Recipe search
- Progress charts

**Steps:**
1. Test with Free Trial account
2. Verify all basic features are accessible

**Expected Results:**
- ✅ All basic tracking features work
- ✅ No upgrade prompts for basic features

---

#### Test 4.2: Medical Features (Single User+)
**Features to test:**
- Appointments
- Medications
- Vitals tracking
- Providers

**Setup:** Test with both Free Trial and Single User plans

**Expected Results:**
- ✅ Free Trial: Medical features should be available (verify with stakeholder)
- ✅ Single User: All medical features accessible
- ✅ No upgrade prompts for Single User accessing medical features

---

#### Test 4.3: Family Features (Family Plans Only)
**Features to test:**
- Family health dashboard
- Multiple patient tracking
- Household management
- Family meal planning

**Setup:** Test with Single User vs Family Basic plans

**Expected Results:**
- ✅ Single User: Shows upgrade prompt for family features
- ✅ Family Basic/Plus/Premium: Full access to family features
- ✅ Gallery page shows family member dropdown for family plans only

---

#### Test 4.4: Enhanced AI Coaching (Family Plus+)
**Features to test:**
- Enhanced AI coaching
- Predictive analytics

**Setup:** Test with Family Basic vs Family Plus

**Expected Results:**
- ✅ Family Basic: Shows upgrade prompt
- ✅ Family Plus/Premium: Full access to enhanced AI

---

#### Test 4.5: Premium Features (Family Premium Only)
**Features to test:**
- White-glove service
- Data export
- API access
- Custom reports
- Early access features

**Setup:** Test with Family Plus vs Family Premium

**Expected Results:**
- ✅ Family Plus: Shows upgrade prompt for premium features
- ✅ Family Premium: Full access to all premium features

---

### Phase 5: Plan Change Validation

#### Test 5.1: Upgrade (Always Allowed)
**Setup:** Start with Single User plan

**Steps:**
1. Navigate to subscription settings
2. Select Family Basic upgrade
3. Complete upgrade process

**Expected Results:**
- ✅ Upgrade proceeds without blockers
- ✅ No validation errors
- ✅ New limits take effect immediately

---

#### Test 5.2: Downgrade - Blocked by Seats
**Setup:**
- Current: Family Plus (8 seats in use, 3 caregivers)
- Target: Family Basic (limit: 5 seats, 5 caregivers)

**Steps:**
1. Navigate to subscription settings
2. Attempt to downgrade to Family Basic

**Expected Results:**
- ✅ Shows blocker message: "Cannot downgrade: You have 8 seats but Family Basic allows only 5"
- ✅ Suggests: "Remove 3 family members to continue"
- ✅ Downgrade button is disabled until seats reduced

---

#### Test 5.3: Downgrade - Blocked by Caregivers
**Setup:**
- Current: Family Plus (3 seats, 8 caregivers)
- Target: Family Basic (limit: 5 seats, 5 caregivers)

**Steps:**
1. Attempt to downgrade to Family Basic

**Expected Results:**
- ✅ Shows blocker: "You have 8 external caregivers but Family Basic allows only 5"
- ✅ Suggests: "Remove 3 external caregivers to continue"
- ✅ Downgrade blocked until caregivers reduced

---

#### Test 5.4: Downgrade - Blocked by Multiple Constraints
**Setup:**
- Current: Family Premium (12 seats, 15 caregivers)
- Target: Single User (limit: 1 seat, 2 caregivers)

**Steps:**
1. Attempt to downgrade to Single User

**Expected Results:**
- ✅ Shows both blockers in message
- ✅ Lists both suggestions
- ✅ Clearly explains what needs to be removed

---

#### Test 5.5: Downgrade - Successful
**Setup:**
- Current: Family Basic (3 seats, 2 caregivers)
- Target: Single User
- Action: First remove 2 family members

**Steps:**
1. Remove excess family members
2. Attempt downgrade again

**Expected Results:**
- ✅ Validation passes
- ✅ Downgrade proceeds
- ✅ New limits enforced immediately

---

### Phase 6: Edge Cases & Error Handling

#### Test 6.1: Undefined/Null Subscription
**Setup:** Clear subscription data in Firestore (simulate new user)

**Steps:**
1. Navigate to patients page
2. Check PlanBadge rendering

**Expected Results:**
- ✅ No crashes or runtime errors
- ✅ Defaults to safe fallback values
- ✅ Shows "0 seats • 0 caregivers" or prompts to setup subscription

---

#### Test 6.2: Corrupted Limit Data
**Setup:** Set maxSeats or maxExternalCaregivers to undefined in Firestore

**Steps:**
1. Navigate to pages using these limits
2. Verify no crashes

**Expected Results:**
- ✅ formatSeatLimit() returns "0" for undefined
- ✅ formatCaregiverLimit() returns "0" for undefined
- ✅ No TypeErrors thrown

---

#### Test 6.3: Expired Subscription
**Setup:** Set subscription.status = 'expired'

**Steps:**
1. Navigate to patients page
2. Attempt to add family member
3. Attempt to invite caregiver

**Expected Results:**
- ✅ All gated features show upgrade/renewal prompt
- ✅ Cannot add seats or caregivers
- ✅ Existing data remains accessible in read-only mode

---

#### Test 6.4: Trialing Subscription
**Setup:** Set subscription.status = 'trialing'

**Steps:**
1. Check PlanBadge display
2. Verify feature access

**Expected Results:**
- ✅ Shows "⏰ Trial" badge
- ✅ All plan features are accessible during trial
- ✅ Trial status is clearly visible

---

### Phase 7: Cross-Browser & Responsiveness

#### Test 7.1: Mobile Display
**Devices:** iPhone, Android

**Steps:**
1. Navigate to `/patients` on mobile
2. Check PlanBadge tooltip
3. Test member limit indicator

**Expected Results:**
- ✅ Tooltip works on tap/touch
- ✅ Progress bar displays correctly
- ✅ InvitationTypeModal is responsive
- ✅ Buttons are properly sized for touch

---

#### Test 7.2: Desktop Browsers
**Browsers:** Chrome, Firefox, Safari, Edge

**Steps:**
1. Test PlanBadge hover on each browser
2. Verify modals display correctly
3. Check enforcement UI

**Expected Results:**
- ✅ Consistent styling across browsers
- ✅ Tooltips render properly
- ✅ No layout breaks

---

## Automated Test Checklist

### Unit Tests to Create

```typescript
// lib/subscription-utils.test.ts
describe('formatSeatLimit', () => {
  test('formats normal limits', () => {
    expect(formatSeatLimit(5)).toBe('5')
  })

  test('shows Unlimited for 999', () => {
    expect(formatSeatLimit(999)).toBe('Unlimited')
  })

  test('handles undefined', () => {
    expect(formatSeatLimit(undefined)).toBe('0')
  })
})

// lib/feature-gates.test.ts
describe('canAccessFeature', () => {
  test('Free Trial has basic features', () => {
    const user = createMockUser({ plan: 'free' })
    expect(canAccessFeature(user, 'meal-logging')).toBe(true)
  })

  test('Single User cannot access family dashboard', () => {
    const user = createMockUser({ plan: 'single' })
    expect(canAccessFeature(user, 'family-health-dashboard')).toBe(false)
  })
})

// lib/subscription-enforcement.test.ts
describe('validateDowngrade', () => {
  test('blocks downgrade with excess seats', () => {
    const user = createMockUser({ plan: 'family_plus' })
    const result = validateDowngrade(user, 'family_basic', 8, 2)

    expect(result.allowed).toBe(false)
    expect(result.blockers?.seats).toBeDefined()
    expect(result.suggestions).toContain('Remove 3 family members to continue')
  })
})
```

---

## Test Results Template

### Test Execution Record

**Date:** _____________
**Tester:** _____________
**Environment:** Development / Staging / Production

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | PlanBadge Tooltip | ⬜ Pass ⬜ Fail | |
| 1.2 | Plan Info Display | ⬜ Pass ⬜ Fail | |
| 2.1 | Add Member Within Limit | ⬜ Pass ⬜ Fail | |
| 2.2 | Add Member At Limit | ⬜ Pass ⬜ Fail | |
| 2.3 | Different Plan Tiers | ⬜ Pass ⬜ Fail | |
| 3.1 | Invite Caregiver Within Limit | ⬜ Pass ⬜ Fail | |
| 3.2 | Invite Caregiver At Limit | ⬜ Pass ⬜ Fail | |
| 3.3 | InvitationTypeModal | ⬜ Pass ⬜ Fail | |
| 4.1 | Basic Features | ⬜ Pass ⬜ Fail | |
| 4.2 | Medical Features | ⬜ Pass ⬜ Fail | |
| 4.3 | Family Features | ⬜ Pass ⬜ Fail | |
| 4.4 | Enhanced AI | ⬜ Pass ⬜ Fail | |
| 4.5 | Premium Features | ⬜ Pass ⬜ Fail | |
| 5.1 | Upgrade | ⬜ Pass ⬜ Fail | |
| 5.2 | Downgrade - Seats Block | ⬜ Pass ⬜ Fail | |
| 5.3 | Downgrade - Caregivers Block | ⬜ Pass ⬜ Fail | |
| 5.4 | Downgrade - Multiple Blocks | ⬜ Pass ⬜ Fail | |
| 5.5 | Downgrade - Success | ⬜ Pass ⬜ Fail | |
| 6.1 | Undefined Subscription | ⬜ Pass ⬜ Fail | |
| 6.2 | Corrupted Data | ⬜ Pass ⬜ Fail | |
| 6.3 | Expired Subscription | ⬜ Pass ⬜ Fail | |
| 6.4 | Trialing Subscription | ⬜ Pass ⬜ Fail | |
| 7.1 | Mobile Display | ⬜ Pass ⬜ Fail | |
| 7.2 | Desktop Browsers | ⬜ Pass ⬜ Fail | |

### Issues Found

| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
| | | High/Med/Low | Open/Fixed |

### Overall Assessment

**Summary:**

**Blockers:**

**Recommendations:**

---

## Quick Reference: Plan Limits

| Plan | Price | Seats | Caregivers |
|------|-------|-------|------------|
| Free Trial | $0 | 1 | 0 |
| Single User | $9.99/mo | 1 | 2 |
| Family Basic | $19.99/mo | 5 | 5 |
| Family Plus | $29.99/mo | 10 | 10 |
| Family Premium | $39.99/mo | Unlimited (999) | Unlimited (999) |

---

**Version:** 1.0.0
**Last Updated:** 2025-12-17
