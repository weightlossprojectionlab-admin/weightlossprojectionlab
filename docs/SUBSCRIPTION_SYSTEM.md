# Subscription System Implementation

## Overview

This document describes the subscription-based feature gating system implemented for the Wellness Projection Lab application. The system supports flexible monetization with multiple plan tiers and feature add-ons, along with admin override and development simulation capabilities.

## Architecture

### Subscription Model

**Base Plans:**
- **Free/Trial**: 14-day trial, 1 "self" patient, basic features
- **Single User**: 1 "self" patient, core features (paid)
- **Family Plan**: Multiple patients (up to 10), core features (paid)

**Feature Add-ons:**
- **Family Features**: Advanced tracking, sharing, analytics, AI coaching
  - Can be purchased standalone for Single User plans
  - Automatically included in Family Plan pricing

### User Journey Examples

1. **Single → Single + Family Features**
   - User stays on Single User plan (1 patient)
   - Purchases "Family Features" add-on
   - Gets advanced features without multi-patient management

2. **Single → Family Plan**
   - User converts to Family Plan
   - Can now add spouse, kids, pets
   - Gets multi-patient management

3. **Single + Family Features → Family Plan**
   - User already has Family Features
   - Upgrades to Family Plan (keeps features)
   - Now can add additional patients

## Implementation

### 1. Type Definitions (`types/index.ts`)

```typescript
export interface UserSubscription {
  // Base plan tier
  plan: 'free' | 'single' | 'family'

  // Feature add-ons
  addons: {
    familyFeatures: boolean
  }

  // Status
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'
  currentPeriodStart: Date
  currentPeriodEnd: Date | null  // null = no expiration (grandfathered)
  trialEndsAt?: Date

  // Limits
  maxPatients: number  // 1 for single, 10 for family, 999 for admin

  // Payment integration (future)
  stripeSubscriptionId?: string
  stripePriceId?: string
  addonSubscriptionIds?: Record<string, string>
}
```

### 2. Feature Gates System (`lib/feature-gates.ts`)

**Admin Override:**
- Email: `admin:weightlossprojectionlab@gmail.com`
- Gets full access to all features automatically
- No limits on patient creation

**Feature Categories:**

```typescript
// Plan-gated features (require specific plan tier)
PLAN_FEATURES = {
  'multiple-patients': ['family'],
  'patient-management': ['family']
}

// Addon-gated features (require specific addon)
ADDON_FEATURES = {
  'advanced-analytics': 'familyFeatures',
  'family-sharing': 'familyFeatures',
  'enhanced-ai-coaching': 'familyFeatures',
  'health-insights': 'familyFeatures',
  'data-export': 'familyFeatures'
}

// Basic features (available to all paid/trial plans)
BASIC_FEATURES = [
  'meal-logging',
  'weight-tracking',
  'step-tracking',
  'basic-recipes',
  'basic-ai-coaching'
]
```

**Core Functions:**
- `getUserSubscription(user)` - Get subscription with admin/dev overrides
- `canAccessFeature(user, feature)` - Check feature access
- `canAddPatient(user, currentCount)` - Check patient limit
- `getRequiredUpgrade(feature)` - Get upgrade requirements

### 3. React Hooks

**`useSubscription()`**
```typescript
const { subscription, loading, isAdmin, plan, status, addons } = useSubscription()
```

**`useFeatureGate(feature)`**
```typescript
const { hasFeature, loading, requiredUpgrade } = useFeatureGate('advanced-analytics')
```

**`usePatientLimit(currentCount)`**
```typescript
const { current, max, canAdd, percentage, loading } = usePatientLimit(patientCount)
```

### 4. Development Simulation

**SubscriptionSimulator Component** (`components/dev/SubscriptionSimulator.tsx`)
- Only visible in development mode or for admin users
- Floating widget in bottom-right corner
- Dropdown to select simulated subscription states
- Real-time UI updates when simulation changes

**Available Presets:**
- Free Trial
- Single User
- Single + Family Features
- Family Plan
- Family + Features
- Admin (Full Access)

**Usage:**
1. Click "🔧 Dev Tools" button
2. Select a preset from dropdown
3. Test feature gates and patient limits
4. Reset to real subscription when done

### 5. API Integration

**Patient Creation API** (`app/api/patients/route.ts`)
- Checks subscription before creating patient
- Returns 403 error if limit exceeded
- Error response includes upgrade suggestion

```typescript
{
  error: 'PATIENT_LIMIT_REACHED',
  message: 'You have reached your patient limit. Upgrade to Family Plan...',
  current: 1,
  max: 1,
  suggestedUpgrade: 'family'
}
```

### 6. UI Components

**`PlanBadge`** - Display current plan with visual styling
```tsx
<PlanBadge
  plan={subscription.plan}
  addons={subscription.addons}
  status={subscription.status}
  size="md"
/>
```

**`FeatureLockedState`** - Show locked feature with upgrade prompt
```tsx
<FeatureLockedState
  feature="Advanced Analytics"
  requiredUpgrade={requiredUpgrade}
  onUpgrade={() => setShowUpgradeModal(true)}
/>
```

**`UpgradeModal`** - Plan comparison and upgrade options
```tsx
<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  currentPlan={subscription.plan}
  suggestedUpgrade="addon"
/>
```

## Testing

### Admin Testing
- Login as `admin:weightlossprojectionlab@gmail.com`
- ✅ Full access to all features
- ✅ No limits on patient creation
- ✅ Can see SubscriptionSimulator in production

### Development Testing
1. Open SubscriptionSimulator widget
2. Select different subscription states
3. Verify feature gates show/hide correctly
4. Test patient creation limits
5. Verify upgrade prompts display
6. Test with different user scenarios

### Test Checklist
- [ ] Free trial shows 1 patient limit
- [ ] Single User shows 1 patient limit
- [ ] Single + Features shows advanced features with 1 patient limit
- [ ] Family Plan shows 10 patient limit
- [ ] Family + Features shows all features with 10 patients
- [ ] Admin bypass works (999 patients, all features)
- [ ] Upgrade prompts show when limits hit
- [ ] Feature locked states display correctly

## Migration

### Existing Users
All existing users will be grandfathered with full access:
- Determine plan based on current patient count:
  - 0-1 patients → Single User
  - 2+ patients → Family Plan
- Grant Family Features addon to all
- Set status to 'active'
- Set no expiration date

Script: `scripts/add-subscription-field.ts`

### New Users
- Start with Free trial (14 days)
- 1 patient maximum
- No family features
- Must upgrade after trial

## Future Enhancements

### Payment Integration (Stripe)
- Add Stripe subscription creation
- Handle webhook events
- Process upgrades/downgrades
- Manage billing cycles

### Additional Add-ons
- Premium AI Coaching
- Advanced Nutrition Analysis
- Health Report Generation
- Data Export
- API Access

### Features to Gate
- Advanced analytics dashboards
- Family data sharing
- Health insights
- PDF report generation
- Calendar integrations
- Medication tracking (advanced)

## Files Modified/Created

### New Files
1. `lib/feature-gates.ts` - Core feature gating logic
2. `hooks/useSubscription.ts` - Subscription hook
3. `hooks/useFeatureGate.ts` - Feature access hook
4. `hooks/usePatientLimit.ts` - Patient limit hook
5. `components/dev/SubscriptionSimulator.tsx` - Dev tool
6. `components/subscription/PlanBadge.tsx` - Plan display
7. `components/subscription/FeatureLockedState.tsx` - Locked feature UI
8. `components/subscription/UpgradeModal.tsx` - Upgrade UI
9. `scripts/add-subscription-field.ts` - Migration script (pending)

### Modified Files
1. `types/index.ts` - Added UserSubscription interface
2. `app/api/patients/route.ts` - Added patient limit checks

### Pending Updates
1. `app/patients/page.tsx` - Add feature gates + simulator
2. `app/profile/page.tsx` - Add subscription section
3. Patient detail pages - Conditional feature display
4. Dashboard - Feature gates for advanced sections

## Notes

- Admin email is hardcoded for now (secure in production)
- Dev simulation uses localStorage (client-side only)
- All subscription checks respect admin override
- Feature gates automatically update when simulation changes
- No payment processing yet (infrastructure ready)
