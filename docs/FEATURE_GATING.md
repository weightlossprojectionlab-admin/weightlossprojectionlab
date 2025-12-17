# Feature Gating System

Complete guide to the subscription-based feature gating system in WLPL.

## Overview

The feature gating system controls access to features based on user subscription tiers. It provides:
- ✅ Declarative feature access control
- ✅ Automatic upgrade prompts for locked features
- ✅ Seat limit enforcement
- ✅ Development mode simulation
- ✅ Admin bypass

## Subscription Tiers

### Free (Trial)
- **Duration**: 14 days
- **Seats**: 1 family member
- **External Caregivers**: 0
- **Features**: All basic features (meal logging, weight tracking, inventory, etc.)

### Single User
- **Price**: $9.99/month or $99/year (17% off)
- **Seats**: 1 family member
- **External Caregivers**: 2
- **Features**:
  - All basic features
  - Medical appointments
  - Medications tracking
  - Vitals tracking
  - Healthcare providers

### Family Basic
- **Price**: $19.99/month or $199/year (17% off)
- **Seats**: 5 family members
- **External Caregivers**: 5
- **Features**:
  - All Single User features
  - Multiple patients
  - Pet tracking
  - Family directory
  - Household management
  - Shared shopping
  - Family meal planning

### Family Plus ⭐ Most Popular
- **Price**: $29.99/month or $299/year (17% off)
- **Seats**: 10 family members
- **External Caregivers**: 10
- **Features**:
  - All Family Basic features
  - Advanced analytics
  - Health insights
  - Trend analysis
  - Predictive AI
  - Priority support

### Family Premium 💎 Best Value
- **Price**: $39.99/month or $399/year (17% off)
- **Seats**: Unlimited
- **External Caregivers**: Unlimited
- **Features**:
  - All Family Plus features
  - White-glove support
  - Early access to features
  - Custom reports
  - Data export
  - API access

## Feature Categories

### Basic Features (All Plans)
Available to all users including free trial:
- `meal-logging` - Log meals with photos or manual entry
- `weight-tracking` - Track weight over time
- `step-tracking` - Daily step tracking
- `photo-logging` - Photo-based meal logging
- `basic-recipes` - Access to recipe library
- `recipe-search` - Search recipes
- `meal-gallery` - View meal history
- `basic-ai-coaching` - Basic AI recommendations
- `meal-recognition` - AI meal photo recognition
- `inventory-management` - Track pantry items
- `barcode-scanning` - Scan product barcodes
- `pantry-tracking` - Track pantry inventory
- `weight-history` - View weight history
- `progress-charts` - Basic progress charts
- `basic-dashboard` - Dashboard overview
- `profile-settings` - User profile settings
- `preferences` - User preferences
- `notifications` - Push notifications

### Single User+ Features
Requires Single User or higher:
- `appointments` - Medical appointments
- `medications` - Medication tracking
- `vitals-tracking` - Vital signs tracking
- `providers` - Healthcare providers
- `medical-records` - Medical record management
- `external-caregivers` - Add external caregivers
- `caregiver-invites` - Invite caregivers

### Family Plans Only
Requires Family Basic, Plus, or Premium:
- `multiple-patients` - Add multiple family members
- `patient-management` - Manage family members
- `family-directory` - Family member directory
- `household-management` - Household features
- `pet-tracking` - Track pets
- `role-management` - Manage family roles
- `shared-shopping` - Shared shopping lists
- `family-meal-planning` - Family meal plans

### Family Plus+ Features
Requires Family Plus or Premium:
- `advanced-analytics` - Advanced health analytics
- `health-insights` - AI health insights
- `trend-analysis` - Trend analysis
- `predictive-ai` - Predictive health AI

### Family Premium Only
Requires Family Premium:
- `priority-support` - Priority customer support
- `white-glove-service` - White-glove service
- `early-access` - Early feature access
- `custom-reports` - Custom health reports
- `data-export` - Export all data
- `api-access` - API access

## Usage Guide

### 1. Using the `useFeatureGate` Hook

Check if a user can access a feature:

```tsx
import { useFeatureGate } from '@/hooks/useFeatureGate'

function MyComponent() {
  const { canAccess, loading, requiresUpgrade, suggestedPlan } = useFeatureGate('appointments')

  if (loading) return <LoadingSpinner />

  if (!canAccess) {
    return <UpgradePrompt
      feature="appointments"
      suggestedPlan={suggestedPlan}
    />
  }

  return <AppointmentScheduler />
}
```

### 2. Using the `FeatureGate` Component

Wrap content that requires specific features:

```tsx
import { FeatureGate } from '@/components/subscription'

export default function AppointmentsPage() {
  return (
    <FeatureGate
      feature="appointments"
      featureName="Medical Appointments"
    >
      <AppointmentScheduler />
    </FeatureGate>
  )
}
```

With custom fallback:

```tsx
<FeatureGate
  feature="advanced-analytics"
  fallback={
    <div>
      <h2>Advanced Analytics</h2>
      <p>Upgrade to Family Plus to unlock advanced analytics</p>
      <UpgradeButton />
    </div>
  }
>
  <AdvancedAnalyticsDashboard />
</FeatureGate>
```

With badge-only mode (shows content but with upgrade badge):

```tsx
<FeatureGate
  feature="advanced-analytics"
  showBadgeOnly={true}
>
  <AnalyticsDashboard />
</FeatureGate>
```

### 3. Using the `UpgradePrompt` Component

Show inline upgrade prompts:

```tsx
import { UpgradePrompt } from '@/components/subscription'

// Card variant (default)
<UpgradePrompt
  feature="advanced-analytics"
  featureName="Advanced Health Analytics"
  icon="📊"
  suggestedPlan="family_plus"
/>

// Banner variant
<UpgradePrompt
  feature="advanced-analytics"
  variant="banner"
  message="Get deeper insights into your health trends"
  suggestedPlan="family_plus"
/>

// Inline variant
<UpgradePrompt
  feature="advanced-analytics"
  variant="inline"
  size="sm"
/>
```

### 4. Checking Multiple Features

Check access to multiple features at once:

```tsx
import { useFeatureGates } from '@/hooks/useFeatureGate'

function Dashboard() {
  const access = useFeatureGates([
    'appointments',
    'medications',
    'advanced-analytics'
  ])

  return (
    <div>
      {access['appointments'].canAccess && <AppointmentsWidget />}
      {access['medications'].canAccess && <MedicationsWidget />}
      {access['advanced-analytics'].canAccess && <AnalyticsWidget />}
    </div>
  )
}
```

### 5. Enforcing Seat Limits

Check if user can add more patients:

```tsx
import { usePatientLimit } from '@/hooks/usePatientLimit'

function AddPatientButton() {
  const patientCount = 5 // Current patient count
  const { canAdd, current, max, percentage } = usePatientLimit(patientCount)

  if (!canAdd) {
    return (
      <div>
        <p>You've reached your limit ({current}/{max} seats)</p>
        <UpgradeButton suggestedPlan="family_plus" />
      </div>
    )
  }

  return <Link href="/patients/new">Add Family Member</Link>
}
```

### 6. Server-Side Feature Checks

Check features in API routes:

```typescript
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { canAccessFeature } from '@/lib/feature-gates'

export async function POST(request: NextRequest) {
  // Authenticate user
  const token = request.headers.get('Authorization')?.substring(7)
  const decodedToken = await adminAuth.verifyIdToken(token)
  const userId = decodedToken.uid

  // Get user from database
  const userDoc = await adminDb.collection('users').doc(userId).get()
  const user = userDoc.data()

  // Check feature access
  if (!canAccessFeature(user, 'advanced-analytics')) {
    return NextResponse.json(
      { error: 'This feature requires Family Plus or higher' },
      { status: 403 }
    )
  }

  // Feature is accessible, proceed
  // ...
}
```

## Development Mode

### Subscription Simulation

Test different subscription tiers without payment:

1. Open browser console
2. Use the `SubscriptionSimulator` component (visible in dev mode)
3. Or programmatically:

```javascript
import { setSimulatedSubscription } from '@/lib/feature-gates'

// Simulate Family Plus
setSimulatedSubscription({
  plan: 'family_plus',
  billingInterval: 'monthly',
  status: 'active',
  maxSeats: 10,
  currentSeats: 5,
  maxExternalCaregivers: 10,
  currentExternalCaregivers: 2,
  maxPatients: 10,
  currentPeriodStart: new Date(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
})

// Clear simulation
setSimulatedSubscription(null)
```

### Admin Override

Admins automatically get full access to all features:

```typescript
// lib/feature-gates.ts
export const ADMIN_EMAILS = ['admin:weightlossprojectionlab@gmail.com']
```

Add your email with `admin:` prefix to get full access.

## Implementation Examples

### Example 1: Patient Creation Page

```tsx
// app/patients/new/page.tsx
import { FeatureGate } from '@/components/subscription'

export default function NewPatientPage() {
  return (
    <AuthGuard>
      <FeatureGate
        feature="multiple-patients"
        featureName="Family Member Management"
      >
        <FamilyMemberOnboardingWizard />
      </FeatureGate>
    </AuthGuard>
  )
}
```

### Example 2: Appointments Page

```tsx
// app/appointments/new/page.tsx
import { FeatureGate } from '@/components/subscription'

export default function NewAppointmentPage() {
  return (
    <AuthGuard>
      <FeatureGate
        feature="appointments"
        featureName="Medical Appointments"
      >
        <AppointmentScheduler />
      </FeatureGate>
    </AuthGuard>
  )
}
```

### Example 3: Advanced Analytics Dashboard

```tsx
// app/analytics/page.tsx
import { useFeatureGate } from '@/hooks/useFeatureGate'
import { UpgradePrompt } from '@/components/subscription'

export default function AnalyticsPage() {
  const { canAccess, suggestedPlan } = useFeatureGate('advanced-analytics')

  return (
    <div>
      <h1>Health Analytics</h1>

      {/* Basic analytics - always visible */}
      <BasicAnalyticsWidget />

      {/* Advanced analytics - gated */}
      {canAccess ? (
        <AdvancedAnalyticsWidget />
      ) : (
        <UpgradePrompt
          feature="advanced-analytics"
          featureName="Advanced Health Analytics"
          icon="📊"
          message="Unlock predictive health insights and trend analysis"
          suggestedPlan={suggestedPlan}
          variant="banner"
        />
      )}
    </div>
  )
}
```

## API Reference

### `useFeatureGate(feature: string)`

Returns:
```typescript
{
  canAccess: boolean           // Whether user can access feature
  hasFeature: boolean          // Legacy alias for canAccess
  loading: boolean             // Whether data is loading
  requiresUpgrade: {           // What upgrade is required
    type: 'plan' | 'addon' | 'none'
    plan?: 'single' | 'family'
    addon?: string
  }
  currentPlan: SubscriptionPlan | null  // User's current plan
  suggestedPlan?: SubscriptionPlan      // Suggested plan to upgrade to
}
```

### `useFeatureGates(features: string[])`

Returns object mapping feature names to `FeatureGateResult`.

### `canAccessFeature(user: User | null, feature: string): boolean`

Server-side function to check feature access.

### `getPatientLimitInfo(user: User | null, currentPatientCount: number)`

Returns:
```typescript
{
  current: number    // Current patient count
  max: number        // Maximum allowed patients
  canAdd: boolean    // Whether user can add more patients
  percentage: number // Usage percentage (0-100)
}
```

## Testing

1. **Dev Mode Simulation**: Use `SubscriptionSimulator` component
2. **Test Cards**: Use Stripe test cards (e.g., `4242 4242 4242 4242`)
3. **Webhook Testing**: Use Stripe CLI for local webhook testing
4. **Admin Testing**: Add email to `ADMIN_EMAILS` for full access

## Troubleshooting

### Feature still locked after upgrade
- Check webhook is configured correctly
- Verify Stripe subscription status
- Check user's subscription in Firestore
- Clear localStorage simulation if in dev mode

### Subscription not syncing
- Verify webhook secret is correct
- Check webhook events in Stripe Dashboard
- Ensure all 8 price IDs are configured
- Check server logs for webhook errors

### Dev simulation not working
- Ensure `NODE_ENV=development`
- Check browser console for errors
- Verify `setSimulatedSubscription` is called
- Try refreshing the page

## Best Practices

1. ✅ **Always wrap paid features** in `FeatureGate` components
2. ✅ **Provide clear upgrade messaging** with feature benefits
3. ✅ **Show upgrade prompts early** before user hits limits
4. ✅ **Test all subscription tiers** before production
5. ✅ **Handle edge cases** like expired/cancelled subscriptions
6. ✅ **Log feature access denials** for analytics
7. ✅ **Use suggestedPlan** to guide users to appropriate tier
8. ✅ **Provide graceful fallbacks** for locked features

## Related Files

- `lib/feature-gates.ts` - Core feature gating logic
- `hooks/useFeatureGate.ts` - Feature gate hook
- `hooks/useSubscription.ts` - Subscription hook
- `hooks/usePatientLimit.ts` - Patient limit hook
- `components/subscription/FeatureGate.tsx` - Feature gate component
- `components/subscription/UpgradePrompt.tsx` - Upgrade prompt component
- `components/subscription/FeatureLockedState.tsx` - Locked state component
- `components/subscription/UpgradeModal.tsx` - Upgrade modal
- `app/api/webhooks/stripe/route.ts` - Stripe webhook handler
- `types/index.ts` - Subscription types
