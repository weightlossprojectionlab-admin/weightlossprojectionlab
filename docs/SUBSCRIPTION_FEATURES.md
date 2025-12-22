# Subscription Features & Plan Documentation

This document provides comprehensive documentation for the subscription plan system, feature gates, and tier-based access control.

## Table of Contents

1. [Subscription Plans](#subscription-plans)
2. [Feature Gates](#feature-gates)
3. [Seat & Caregiver Limits](#seat--caregiver-limits)
4. [Implementation Guide](#implementation-guide)
5. [Testing](#testing)
6. [FAQ](#faq)

---

## Subscription Plans

### Plan Tiers

| Plan | Price | Seats | Caregivers | Key Features |
|------|-------|-------|------------|--------------|
| **Free Trial** | $0 | 1 | 0 | 14-day trial, basic features |
| **Single User** | $9.99/mo | 1 | 2 | Individual health tracking |
| **Family Basic** | $19.99/mo | 5 | 5 | Multi-person tracking, family dashboard |
| **Family Plus** | $29.99/mo | 10 | 10 | Advanced analytics, enhanced AI |
| **Family Premium** | $39.99/mo | Unlimited | Unlimited | All features, white-glove support |

### Annual Pricing

All plans offer 17% savings with annual billing:
- Single User: $99/year (save $20.88)
- Family Basic: $199/year (save $40.88)
- Family Plus: $299/year (save $60.88)
- Family Premium: $399/year (save $80.88)

---

## Feature Gates

### Basic Features (All Plans)

Available to all active subscriptions (including Free Trial):

- **Core Tracking**
  - `meal-logging` - Log meals with photos
  - `weight-tracking` - Track weight changes
  - `step-tracking` - Monitor daily steps
  - `photo-logging` - Upload and store meal photos

- **Basic Content**
  - `basic-recipes` - Access recipe database
  - `recipe-search` - Search recipes
  - `meal-gallery` - View meal photo gallery

- **Basic AI**
  - `basic-ai-coaching` - AI-powered nutrition analysis
  - `meal-recognition` - Automatic meal identification from photos

- **Inventory**
  - `inventory-management` - Manage pantry items
  - `barcode-scanning` - Scan product barcodes
  - `pantry-tracking` - Track pantry inventory

- **Progress**
  - `weight-history` - View weight history
  - `progress-charts` - Basic charts and graphs
  - `basic-dashboard` - Personal dashboard

### Single User Plan Features

Everything in Basic Features, plus:

- **Medical Tracking**
  - `appointments` - Schedule and track appointments
  - `medications` - Medication tracking and reminders
  - `vitals-tracking` - Track blood pressure, blood sugar, etc.
  - `providers` - Healthcare provider directory
  - `medical-records` - Store medical documents

- **Caregiver Access**
  - `external-caregivers` - Invite up to 2 professional caregivers
  - `caregiver-invites` - Send caregiver invitation links

### Family Basic Features

Everything in Single User, plus:

- **Multi-Person Management**
  - `multiple-patients` - Track up to 5 family members
  - `pet-tracking` - Track pet health
  - `patient-management` - Manage family member profiles
  - `family-directory` - Family member directory

- **Family Features**
  - `household-management` - Household-wide settings
  - `family-health-dashboard` - Unified family health view
  - `role-management` - Assign roles and permissions
  - `shared-shopping` - Shared shopping lists
  - `family-meal-planning` - Family meal planning

### Family Plus Features

Everything in Family Basic, plus:

- **Advanced Analytics**
  - `advanced-analytics` - Deep health insights
  - `health-insights` - Personalized health recommendations
  - `trend-analysis` - Long-term trend analysis
  - `predictive-ai` - AI-powered predictions

- **Enhanced AI**
  - `enhanced-ai-coaching` - Advanced AI coaching
  - Premium AI-powered meal plans

- **Support**
  - `priority-support` - Priority customer support

### Family Premium Features

Everything in Family Plus, plus:

- **Premium Support**
  - `white-glove-service` - Dedicated support representative
  - White-glove onboarding

- **Advanced Features**
  - `early-access` - Beta features and early access
  - `data-export` - Export all your data
  - `api-access` - API access for integrations
  - `custom-reports` - Custom health reports

- **Unlimited Resources**
  - Unlimited family member seats
  - Unlimited external caregivers

---

## Seat & Caregiver Limits

### Seat Limits (Family Members)

| Plan | Limit | Code Value |
|------|-------|------------|
| Free Trial | 1 | `1` |
| Single User | 1 | `1` |
| Family Basic | 5 | `5` |
| Family Plus | 10 | `10` |
| Family Premium | Unlimited | `999` |

**Note:** In code, "Unlimited" is represented as `999` to simplify validation logic.

### Caregiver Limits (External Caregivers)

| Plan | Limit | Code Value |
|------|-------|------------|
| Free Trial | 0 | `0` |
| Single User | 2 | `2` |
| Family Basic | 5 | `5` |
| Family Plus | 10 | `10` |
| Family Premium | Unlimited | `999` |

**Important:** External caregivers are non-billable professional caregivers (nurses, doctors, etc.), not family members.

---

## Implementation Guide

### Checking Feature Access

```typescript
import { canAccessFeature } from '@/lib/feature-gates'

// Check if user has access to a feature
if (canAccessFeature(user, 'enhanced-ai-coaching')) {
  // Show premium AI features
}
```

### Checking Seat Limits

```typescript
import { canAddPatient, getPatientLimitInfo } from '@/lib/feature-gates'

// Check if can add another family member
const canAdd = canAddPatient(user, currentPatientCount)

// Get detailed limit info
const info = getPatientLimitInfo(user, currentPatientCount)
console.log(info.current)      // Current seats used
console.log(info.max)          // Maximum seats allowed
console.log(info.percentage)   // Utilization percentage
```

### Checking Caregiver Limits

```typescript
import { canAddExternalCaregiver, getCaregiverLimitInfo } from '@/lib/feature-gates'

// Check if can add another caregiver
const canAdd = canAddExternalCaregiver(user, currentCaregiverCount)

// Get detailed limit info
const info = getCaregiverLimitInfo(user, currentCaregiverCount)
console.log(info.current)      // Current caregivers
console.log(info.max)          // Maximum allowed
console.log(info.isUnlimited)  // true for premium plans
console.log(info.remaining)    // Slots remaining
```

### Display Formatting

```typescript
import { formatSeatLimit, formatCaregiverLimit, getPlanLimits } from '@/lib/subscription-utils'

// Format individual limits
formatSeatLimit(10)    // "10"
formatSeatLimit(999)   // "Unlimited"

// Get formatted plan limits
const limits = getPlanLimits('family_premium')
console.log(limits.seats)       // "Unlimited"
console.log(limits.caregivers)  // "Unlimited"
```

### Marketing Feature Mapping

```typescript
import { hasMarketingFeature } from '@/lib/feature-mapping'

// Check using marketing feature names (from pricing page)
if (hasMarketingFeature(user, 'enhanced-ai-coaching')) {
  // User has Family Plus or Premium
}

if (hasMarketingFeature(user, 'family-health-dashboard')) {
  // User has Family Basic, Plus, or Premium
}
```

### Downgrade Validation

```typescript
import { validateDowngrade } from '@/lib/subscription-enforcement'

// Validate if user can downgrade
const result = validateDowngrade(
  user,
  'family_basic',  // Target plan
  currentSeats,
  currentCaregivers
)

if (!result.allowed) {
  console.log(result.message)      // "Cannot downgrade: you have 8 seats..."
  console.log(result.suggestions)  // ["Remove 3 family members to continue"]

  // Show blockers
  if (result.blockers?.seats) {
    console.log('Seat blocker:', result.blockers.seats.excess, 'seats over limit')
  }
}
```

### Analytics Tracking

```typescript
import { trackFeatureAccess, trackSeatUtilization } from '@/lib/analytics/subscription-analytics'

// Track when user tries to access a gated feature
trackFeatureAccess({
  userId: user.id,
  feature: 'enhanced-ai-coaching',
  plan: user.subscription.plan,
  accessGranted: false,
  timestamp: new Date(),
  upgradePromptShown: true
})

// Track seat usage changes
trackSeatUtilization({
  userId: user.id,
  plan: user.subscription.plan,
  action: 'seat-added',
  currentSeats: 5,
  maxSeats: 10,
  utilizationPercentage: 50,
  timestamp: new Date()
})
```

---

## Testing

### Using the Subscription Simulator

The SubscriptionSimulator component (available in development mode) allows testing all plans:

1. **Open Dev Tools** - Click the purple "🔧 Dev Tools" button in bottom-left corner
2. **Select Plan** - Choose from dropdown:
   - Free Trial
   - Single User
   - Family Basic
   - Family Plus
   - Family Premium
   - Admin (Full Access)
3. **Test Features** - Navigate to different pages and verify feature access
4. **Reset** - Select "Real Subscription" to return to your actual plan

### Manual Testing Checklist

- [ ] **Free Trial**
  - ✓ Can access basic features
  - ✓ Cannot add family members
  - ✓ Cannot invite caregivers
  - ✓ Cannot access advanced analytics

- [ ] **Single User**
  - ✓ Can access medical features
  - ✓ Can invite up to 2 caregivers
  - ✓ Cannot add family members
  - ✓ Cannot access family dashboard

- [ ] **Family Basic**
  - ✓ Can add up to 5 family members
  - ✓ Can invite up to 5 caregivers
  - ✓ Can access family dashboard
  - ✓ Cannot access enhanced AI coaching

- [ ] **Family Plus**
  - ✓ Can add up to 10 family members
  - ✓ Can invite up to 10 caregivers
  - ✓ Can access advanced analytics
  - ✓ Can access enhanced AI coaching

- [ ] **Family Premium**
  - ✓ "Unlimited" displays correctly (not "999")
  - ✓ Can add unlimited family members
  - ✓ Can invite unlimited caregivers
  - ✓ Can access all premium features

### Automated Tests

```typescript
// Example test cases
describe('Subscription Feature Gates', () => {
  test('Single User cannot access family dashboard', () => {
    const user = createMockUser({ plan: 'single' })
    expect(canAccessFeature(user, 'family-health-dashboard')).toBe(false)
  })

  test('Family Plus can access enhanced AI coaching', () => {
    const user = createMockUser({ plan: 'family_plus' })
    expect(canAccessFeature(user, 'enhanced-ai-coaching')).toBe(true)
  })

  test('Cannot add 6th member to Family Basic', () => {
    const user = createMockUser({ plan: 'family_basic' })
    expect(canAddPatient(user, 5)).toBe(false)
  })

  test('Family Premium shows Unlimited seats', () => {
    const limits = getPlanLimits('family_premium')
    expect(limits.seats).toBe('Unlimited')
    expect(limits.caregivers).toBe('Unlimited')
  })
})
```

---

## FAQ

### Q: What happens when a subscription expires?

A: When `subscription.status` is `'expired'` or `'canceled'`:
- User loses access to ALL gated features (including basic features)
- Cannot add family members or caregivers
- Existing data remains accessible in read-only mode

### Q: Can users downgrade if they have too many seats?

A: No. The `validateDowngrade()` function prevents downgrades that would exceed the target plan's limits. Users must first remove excess family members or caregivers.

### Q: How are admin users handled?

A: Admin users (listed in `ADMIN_EMAILS`) automatically get `FULL_ACCESS_SUBSCRIPTION` which grants access to all features regardless of their actual plan.

### Q: What's the difference between seats and caregivers?

A:
- **Seats** = Billable family members tracked in the system (people whose health you're monitoring)
- **Caregivers** = Non-billable external professionals invited to help (nurses, doctors, etc.)

### Q: How do I add a new feature gate?

A:
1. Add technical feature to `PLAN_FEATURES` in `lib/feature-gates.ts`
2. Add marketing name to `MARKETING_TO_TECHNICAL_FEATURES` in `lib/feature-mapping.ts`
3. Add description to `MARKETING_FEATURE_DESCRIPTIONS`
4. Use `canAccessFeature()` to gate the feature in UI

### Q: Can I simulate subscriptions in production?

A: No. The `SubscriptionSimulator` only works in development mode (`NODE_ENV === 'development'`) or for admin users. Normal users always see their real subscription.

### Q: How do I display "Unlimited" instead of "999"?

A: Always use the display helper functions:
```typescript
import { formatSeatLimit, formatCaregiverLimit } from '@/lib/subscription-utils'

// ✅ Correct - shows "Unlimited"
formatSeatLimit(subscription.maxSeats)

// ❌ Incorrect - shows "999"
subscription.maxSeats.toString()
```

### Q: Where is pricing stored?

A: Pricing is defined in `types/index.ts`:
```typescript
export const SUBSCRIPTION_PRICING = {
  single: { monthly: 999, yearly: 9900 },         // $9.99/mo, $99/yr
  family_basic: { monthly: 1999, yearly: 19900 }, // $19.99/mo, $199/yr
  // ... etc
}
```

Prices are in **cents** to avoid floating-point precision issues.

---

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `types/index.ts` | Plan types, pricing, limits |
| `lib/feature-gates.ts` | Feature gating logic |
| `lib/subscription-utils.ts` | Display helpers |
| `lib/feature-mapping.ts` | Marketing ↔ Technical mapping |
| `lib/subscription-enforcement.ts` | Downgrade validation |
| `lib/analytics/subscription-analytics.ts` | Analytics tracking |
| `components/dev/SubscriptionSimulator.tsx` | Dev testing tool |

### Common Patterns

```typescript
// ✅ Check feature access
if (canAccessFeature(user, 'enhanced-ai-coaching')) { }

// ✅ Check seat limit
if (canAddPatient(user, currentPatientCount)) { }

// ✅ Format limits for display
const limits = getPlanLimits(plan)
<span>{limits.seats} seats</span>

// ✅ Validate downgrade
const result = validateDowngrade(user, targetPlan, seats, caregivers)
if (!result.allowed) { showError(result.message) }

// ✅ Check marketing feature
if (hasMarketingFeature(user, 'family-health-dashboard')) { }
```

---

**Last Updated:** 2025-12-17
**Version:** 1.0.0
