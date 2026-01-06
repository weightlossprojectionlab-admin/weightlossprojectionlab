# Hybrid Feature Gating Implementation Guide

## Overview

The hybrid feature gating system combines **subscription-based access control** with **preference-based filtering** to ensure users only see features they:
1. **Have subscription access to** (plan tier allows it)
2. **Actually want to use** (expressed interest during onboarding)

## Problem Solved

**Before:**
- User selects "Weight Loss" during onboarding
- Dashboard shows Medical Records, Appointments, Medications
- User confused: "Why am I seeing this? I didn't ask for it"

**After:**
- User selects "Weight Loss" during onboarding
- Dashboard shows Weight Tracking, Meal Logging, Progress Charts
- Medical features hidden unless user selected "Medical Tracking" goal
- Clean, focused UX aligned with user intent

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Feature Request                         │
│           (e.g., "Show Appointments")                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Hybrid Feature Gate Check                      │
│                                                          │
│  Step 1: Check Subscription Access                      │
│  ├─ Does user's plan tier allow this feature?          │
│  └─ [useFeatureGate] → canAccess: boolean              │
│                                                          │
│  Step 2: Check Preference Filter                        │
│  ├─ Did user select a goal that includes this feature?  │
│  └─ [shouldShowFeatureByPreference] → show: boolean    │
│                                                          │
│  Step 3: Combine Results                                │
│  └─ shouldShow = canAccess && userWantsIt               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Render Decision                         │
│                                                          │
│  ✅ shouldShow = true → Render feature                  │
│  ❌ shouldShow = false → Hide from navigation           │
│  🔒 canAccess = false → Show upgrade prompt             │
└─────────────────────────────────────────────────────────┘
```

## Key Files

### 1. `lib/feature-preference-gate.ts`
**Purpose:** Maps onboarding goals to technical features

```typescript
export const PREFERENCE_TO_FEATURES: Record<FeaturePreference, string[]> = {
  weight_loss: ['weight-tracking', 'meal-logging', 'progress-charts', ...],
  medical_tracking: ['appointments', 'medications', 'vitals-tracking', ...],
  // ...
}

export function shouldShowFeatureByPreference(
  feature: string,
  userPreferences: FeaturePreference[]
): boolean
```

### 2. `hooks/useHybridFeatureGate.ts`
**Purpose:** React hook combining subscription + preference checks

```typescript
export function useHybridFeatureGate(feature: string): HybridFeatureGateResult {
  // Returns:
  // - canAccess: subscription allows?
  // - hiddenByPreference: user didn't select this goal?
  // - shouldShow: combine both checks
  // - requiresUpgrade: what plan needed?
  // - requiredPreferences: what goals unlock this?
}
```

## Usage Examples

### Example 1: Hide Navigation Items

**Before:**
```tsx
// app/dashboard/page.tsx
<nav>
  <Link href="/appointments">Appointments</Link>
  <Link href="/medications">Medications</Link>
  <Link href="/vitals">Vitals</Link>
</nav>
```

**After:**
```tsx
// app/dashboard/page.tsx
import { useVisibleFeatures } from '@/hooks/useHybridFeatureGate'

const navFeatures = useVisibleFeatures([
  'appointments',
  'medications',
  'vitals',
])

<nav>
  {navFeatures.includes('appointments') && (
    <Link href="/appointments">Appointments</Link>
  )}
  {navFeatures.includes('medications') && (
    <Link href="/medications">Medications</Link>
  )}
  {navFeatures.includes('vitals') && (
    <Link href="/vitals">Vitals</Link>
  )}
</nav>
```

### Example 2: Conditional Dashboard Widgets

```tsx
// app/dashboard/page.tsx
import { useHybridFeatureGate } from '@/hooks/useHybridFeatureGate'

export default function DashboardPage() {
  const weightGate = useHybridFeatureGate('weight-tracking')
  const mealsGate = useHybridFeatureGate('meal-logging')
  const vitalsGate = useHybridFeatureGate('vitals-tracking')
  const apptGate = useHybridFeatureGate('appointments')

  return (
    <div className="dashboard-grid">
      {/* Weight widget - only if user wants it */}
      {weightGate.shouldShow && <WeightProgressWidget />}

      {/* Meals widget - only if user wants it */}
      {mealsGate.shouldShow && <MealGalleryWidget />}

      {/* Vitals widget - only if user wants it */}
      {vitalsGate.shouldShow && vitalsGate.canAccess && (
        <VitalsTrackingWidget />
      )}

      {/* Appointments - show upgrade if locked */}
      {apptGate.shouldShow && !apptGate.canAccess && (
        <UpgradePrompt suggestedPlan={apptGate.suggestedPlan} />
      )}
    </div>
  )
}
```

### Example 3: Feature Discovery Upsell

```tsx
// components/FeatureDiscovery.tsx
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { getHiddenFeaturesByPreference } from '@/lib/feature-preference-gate'

export function FeatureDiscovery() {
  const userPrefs = useUserPreferences()
  const hiddenFeatures = getHiddenFeaturesByPreference(userPrefs.featurePreferences)

  if (hiddenFeatures.includes('vitals-tracking')) {
    return (
      <div className="upsell-card">
        <h3>📊 Track Your Vital Signs</h3>
        <p>Monitor blood pressure, glucose, and more!</p>
        <button onClick={() => router.push('/onboarding')}>
          Enable Vital Tracking
        </button>
      </div>
    )
  }

  return null
}
```

## Migration Strategy

### Phase 1: Profile Page (✅ DONE)
- ✅ Filter reminder sections by preferences
- ✅ Add upsell cards for hidden features
- ✅ Backward compatible (show all if no preferences)

### Phase 2: Dashboard (NEXT)
1. Import `useVisibleFeatures` hook
2. Filter widget rendering based on preferences
3. Reorder widgets by user's top preference
4. Test with different preference combinations

### Phase 3: Navigation & Routing
1. Filter sidebar/menu items
2. Hide routes user didn't select
3. Add "Discover More Features" section

### Phase 4: API & Data Fetching
1. Only fetch data for features user wants
2. Reduce initial load time
3. Improve performance

## Backward Compatibility

**Critical:** All filtering includes backward compatibility:

```typescript
// If user has NO preferences (legacy users, incomplete onboarding)
if (userPreferences.length === 0) {
  return true // Show ALL features (old behavior)
}
```

This ensures:
- ✅ Existing users see no changes
- ✅ Users who skip onboarding get full access
- ✅ Only users who complete onboarding get filtered UX

## Testing Checklist

### Scenario 1: New User - Weight Loss Only
- [ ] Onboarding: select "Weight Loss"
- [ ] Dashboard shows: Weight widget, Meal widget, Progress charts
- [ ] Dashboard hides: Medical records, Appointments, Vitals
- [ ] Profile shows: Weight reminders only
- [ ] Profile shows: Upsell cards for hidden features

### Scenario 2: New User - Medical Tracking Only
- [ ] Onboarding: select "Medical Tracking"
- [ ] Dashboard shows: Appointments, Medications, Vitals
- [ ] Dashboard hides: Weight tracking (unless also selected)
- [ ] Profile shows: Vital reminders, Medication reminders
- [ ] Navigation shows: Medical features only

### Scenario 3: New User - Multiple Goals
- [ ] Onboarding: select "Weight Loss" + "Medical Tracking"
- [ ] Dashboard shows: Weight + Meals + Medical widgets
- [ ] Profile shows: All relevant reminder sections
- [ ] Navigation shows: Combined features

### Scenario 4: Legacy User (No Preferences)
- [ ] Dashboard shows: ALL features (backward compat)
- [ ] Profile shows: ALL reminder sections
- [ ] No filtering applied
- [ ] User can update preferences in settings

## PRD Alignment

From `docs/UNIFIED_PRD.json`:

```json
{
  "planRequirements": {
    "weight_loss": ["free", "single", "single_plus", "family_basic", "family_plus", "family_premium"],
    "medical_tracking": ["single_plus", "family_basic", "family_plus", "family_premium"],
    "vitals": ["single_plus", "family_basic", "family_plus", "family_premium"]
  }
}
```

**Hybrid Gate Check:**
1. Check `planRequirements` → Does plan allow feature?
2. Check `featurePreferences` → Did user select goal?
3. Both must be true to show feature

## Benefits

### For Users
- ✅ **Cleaner UI** - Only see what they want
- ✅ **Less confusion** - No irrelevant features
- ✅ **Faster onboarding** - Focused experience
- ✅ **Better discovery** - Contextual upsells

### For Business
- ✅ **Higher engagement** - Users see relevant features
- ✅ **Better conversion** - Targeted upsells
- ✅ **Reduced churn** - Less overwhelming
- ✅ **Data-driven** - Track feature preferences

### For Development
- ✅ **Modular** - Easy to add new features
- ✅ **Testable** - Clear feature mappings
- ✅ **Maintainable** - Centralized configuration
- ✅ **Backward compatible** - No breaking changes

## Next Steps

1. **Review this guide** - Understand architecture
2. **Test profile page** - Verify reminder filtering works
3. **Plan dashboard refactor** - Apply hybrid gates to widgets
4. **Update navigation** - Filter menu items
5. **Add feature discovery** - Show upsells for hidden features
6. **Performance testing** - Measure improvements

## Questions?

- How do we handle users who change preferences later?
  → Allow preference updates in settings, re-filter UI dynamically

- What if user has Family Plus but only selected "Weight Loss"?
  → They still have subscription access to all features, but UI hides irrelevant ones. They can enable more features anytime in settings.

- How do we encourage feature discovery?
  → Show contextual upsell cards (already implemented in profile page)

- What about pet features?
  → Pet features are always shown when managing pet profiles (separate logic)
