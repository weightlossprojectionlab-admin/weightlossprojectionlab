# User Flow Integration - Complete System

> **Combining Onboarding + Feature Flows**
> Based on both flowchart screenshots

---

## Overview

The platform has **3 major user flows** that users access differently based on their **User Mode** from onboarding:

1. **Kitchen Flow** - Shopping & Inventory
2. **Care Circle Flow** - Family/Patient Management
3. **Meal Logging Flow** - Photo/Manual/Template logging

---

## Flow 1: Kitchen Flow (Shopping & Inventory)

### Trigger
- User clicks "Kitchen" tab (Single/Household mode)
- User clicks shopping list
- User scans barcode

### Flow Diagram
```
Kitchen Entry
  ↓
Shopping List ──────→ Scan Barcode
  ↓                        ↓
Add Items              Add Product
  ↓                        ↓
Categorize ←──────────────┘
  ↓
Purchase
  ↓
Move to Inventory
  ↓
Set Expiration
  ↓
Track Usage
  ↓
Recipe Suggestions (use before expires)
```

### Implementation

**Routes:**
- `/shopping` - Shopping list
- `/inventory` - Kitchen inventory
- `/recipes` (filtered by available ingredients)

**Monetization Triggers:**
- `shopping` - Soft gate for shopping features (Premium)
- `inventory` - Soft gate for inventory tracking (Premium)
- `recipes_limit` - Soft gate for full recipe library (Premium)

**Components:**
```typescript
// Shopping Flow
<BarcodeScanner /> → <CategoryConfirmModal /> → <ShoppingList />

// Purchase Flow
<PurchaseConfirmation /> → <ExpirationPicker /> → <InventoryList />

// Recipe Matching
<RecipeSuggestions inventory={expiringSoon} />
```

---

## Flow 2: Care Circle Flow (Family Management)

### Trigger
- User mode: Household or Caregiver
- User clicks "Family" or "Care Circle" tab
- Add patient from onboarding

### Flow Diagram
```
Care Circle Entry
  ↓
Dashboard (Patient List)
  ↓
Add Patient ──→ Scan Driver License
  ↓                     ↓
Manual Entry      Auto-fill Data
  ↓                     ↓
  └─────────────────────┘
  ↓
Select Patient
  ↓
  ├─→ Log (Meal/Weight/Steps/Vitals)
  ├─→ Medications
  ├─→ Appointments
  ├─→ Providers
  └─→ Documents
```

### Implementation

**Routes:**
- `/patients` - Patient/family list
- `/patients/new` - Add patient (with driver license scanner)
- `/patients/[id]` - Patient dashboard
- `/patients/[id]/family` - Family collaboration

**Monetization Triggers:**
- `add_second_member` - HARD BLOCK when adding 2nd patient (Family plan required)
- `medications` - Soft gate for medication tracking (Family)
- `appointments` - Soft gate for appointments (Family)
- `vitals` - Soft gate for vitals tracking (Family)

**Components:**
```typescript
// Add Patient Flow
<PatientForm /> + <DriverLicenseScanner /> → checkTrigger('add_second_member')

// Patient Dashboard
<PatientSelector /> → <PatientDetail>
  ├─ <MealLogForm patientId={id} />
  ├─ <WeightLogForm patientId={id} />
  ├─ <VitalLogForm patientId={id} />
  └─ <MedicationList patientId={id} />
```

---

## Flow 3: Meal Logging Flow

### Trigger
- User clicks "Log" tab
- Quick action from dashboard
- After cooking session

### Flow Diagram
```
Meal Logging Entry
  ↓
Choice: How to log?
  ├─→ Photo ──→ Take/Upload ──→ AI Analysis ──→ USDA Validation ──→ Review ──→ Save
  ├─→ Manual ──→ Enter Foods ──→ Search Nutrition ──→ Review ──→ Save
  └─→ Template ──→ Select Template ──→ Adjust ──→ Save
         ↓
    Save as Template?
         ↓
       [Yes/No]
```

### Implementation

**Routes:**
- `/log-meal` - Meal logging hub

**Meal Logging Modes (from onboarding):**
Users can select multiple options (multi-select):
- `photo` - Enable photo-based meal logging
- `manual` - Enable manual entry
- `both` - Enable both photo and manual logging
- `with_reminders` - Enable meal time notifications

**Examples:**
- User selects `['photo', 'with_reminders']` → Photo logging with reminders
- User selects `['both', 'with_reminders']` → Both methods with reminders
- User selects `['manual']` → Manual logging only, no reminders
- User selects all 4 options → All methods enabled with reminders

**Monetization Triggers:**
- `ai_meal_scan` - HARD BLOCK after 10 scans/month (Premium)

**Flow Logic:**
```typescript
// /log-meal/page.tsx

import { wantsPhotoLogging, wantsManualLogging, wantsReminders } from '@/lib/meal-logging-utils'

export default function LogMealPage() {
  const { config } = useUIConfig()
  const mealScanTrigger = useMonetizationTrigger('ai_meal_scan')

  // Get user's preferred logging mode from onboarding
  const loggingMode = config?.onboardingAnswers?.mealLoggingMode

  // Parse preferences
  const showPhoto = wantsPhotoLogging(loggingMode)
  const showManual = wantsManualLogging(loggingMode)
  const enableReminders = wantsReminders(loggingMode)

  async function handlePhotoLog(photo: File) {
    // Check AI scan limit
    const allowed = await mealScanTrigger.checkAndPrompt()
    if (!allowed) return

    // Proceed with AI scan
    const analysis = await analyzeMeal(photo)

    // USDA validation
    const validated = await validateWithUSDA(analysis)

    // Show review modal
    setAnalysis(validated)
  }

  function handleManualLog(foods: FoodItem[]) {
    // No trigger - manual is always free
    setAnalysis({ foodItems: foods, ... })
  }

  function handleTemplateLog(template: MealTemplate) {
    // No trigger - templates are always free
    setAnalysis(template.aiAnalysis)
  }

  // Enable meal reminders if user selected this option
  useEffect(() => {
    if (enableReminders) {
      scheduleMealReminders()
    }
  }, [enableReminders])

  return (
    <div>
      {/* Show options based on user preferences */}
      {showPhoto && <PhotoCapture onCapture={handlePhotoLog} />}
      {showManual && <ManualEntry onSubmit={handleManualLog} />}

      {/* Template library - always available */}
      <TemplateLibrary onSelect={handleTemplateLog} />

      {/* Reminder status */}
      {enableReminders && <ReminderStatusBadge />}

      {/* Upgrade modal */}
      <UpgradeModal {...mealScanTrigger} />
    </div>
  )
}
```

---

## Complete User Journey Map

### Single Mode Journey

```
New User
  ↓
/onboarding-v2
  ↓ (Answers "myself")
  ↓
User Mode: Single
  ↓
/dashboard (Default route)
  ↓
Bottom Nav: [Home, Log, Kitchen, Profile]
  ↓
Main Features:
  ├─ Weight Loss Tracking
  ├─ Meal Logging (Photo AI - 10 free/month)
  ├─ Step Tracking
  └─ Progress Charts

Gated Features (Premium):
  ├─ Unlimited AI Meal Scans → Upgrade Modal
  ├─ Full Recipe Library → Upgrade Modal
  ├─ Shopping List → Upgrade Modal
  └─ Kitchen Inventory → Upgrade Modal
```

---

### Household Mode Journey

```
New User
  ↓
/onboarding-v2
  ↓ (Answers "parent" or "partner")
  ↓
User Mode: Household
  ↓
Add Family Now? [Yes/No]
  ↓ Yes
/patients/new
  ↓
Add first family member (FREE)
  ↓
/dashboard (Default route)
  ↓
Bottom Nav: [Home, Log, Kitchen, Family]
  ↓
Main Features:
  ├─ All Single features
  ├─ 1 Family Member (FREE)
  ├─ Weight Loss Tracking
  └─ Meal Logging

Gated Features (Family):
  ├─ Add 2nd+ Patient → HARD BLOCK → Family Plan
  ├─ Medications → Upgrade Modal
  ├─ Appointments → Upgrade Modal
  ├─ Health Vitals → Upgrade Modal
  └─ Medical Documents → Upgrade Modal
```

---

### Caregiver Mode Journey

```
New User
  ↓
/onboarding-v2
  ↓ (Answers "caregiver")
  ↓
User Mode: Caregiver
  ↓
Add Family Now? [Yes]
  ↓ (Caregivers always need patients)
/patients/new
  ↓
Add first patient (FREE)
  ↓
/patients (Default route - Care Circle First!)
  ↓
Bottom Nav: [Family, Log, Home, Kitchen]
  ↓
Main Features:
  ├─ Patient Management
  ├─ Meal Logging (for patients)
  ├─ Medical tracking
  └─ 1 Patient (FREE)

Hidden Features (Caregiver doesn't track self):
  ├─ Personal Weight Loss
  ├─ Personal Progress Charts
  └─ Personal Missions/Groups

Gated Features (Family):
  ├─ Add 2nd+ Patient → HARD BLOCK → Family Plan
  ├─ Medications → Upgrade Modal
  ├─ Appointments → Upgrade Modal
  └─ Health Vitals → Upgrade Modal
```

---

## Feature Access Matrix

| Feature | Single (Free) | Single (Premium) | Household (Free) | Family Plan | Caregiver (Free) | Caregiver (Family) |
|---------|--------------|------------------|------------------|-------------|------------------|-------------------|
| **Weight Tracking** | ✅ | ✅ | ✅ | ✅ | ❌ (not for self) | ❌ |
| **Meal Logging** | ✅ (10 AI/mo) | ✅ (unlimited) | ✅ (10 AI/mo) | ✅ (unlimited) | ✅ (for patients) | ✅ (unlimited) |
| **Step Tracking** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Patients** | 0 | 0 | 1 | 10 | 1 | 10 |
| **Shopping List** | ❌ → Premium | ✅ | ❌ → Premium | ✅ | ❌ → Premium | ✅ |
| **Kitchen Inventory** | ❌ → Premium | ✅ | ❌ → Premium | ✅ | ❌ → Premium | ✅ |
| **Recipes** | 20 max → Premium | ✅ Unlimited | 20 max → Premium | ✅ Unlimited | 20 max → Premium | ✅ Unlimited |
| **Medications** | ❌ | ❌ | ❌ → Family | ✅ | ❌ → Family | ✅ |
| **Appointments** | ❌ | ❌ | ❌ → Family | ✅ | ❌ → Family | ✅ |
| **Health Vitals** | ❌ | ❌ | ❌ → Family | ✅ | ❌ → Family | ✅ |
| **Medical Docs** | ❌ | ❌ | ❌ → Family | ✅ | ❌ → Family | ✅ |
| **AI Coaching** | 5 msgs/day | 50 msgs/day | 5 msgs/day | Unlimited | ❌ | ❌ |
| **Missions/Groups** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## Routing Logic Implementation

```typescript
// lib/user-mode-router.ts

export function getDefaultRoute(
  userMode: UserMode,
  onboardingAnswers: OnboardingAnswers
): string {
  // Caregiver mode: always start at care circle
  if (userMode === 'caregiver') {
    return '/patients'
  }

  // If user chose to add family immediately
  if (onboardingAnswers.addFamilyNow) {
    return '/patients/new'
  }

  // Otherwise default to home
  return '/dashboard'
}

export function getBottomNavTabs(userMode: UserMode): TabConfig[] {
  const tabConfigs = {
    single: [
      { id: 'home', label: 'Home', href: '/dashboard', icon: 'home' },
      { id: 'log', label: 'Log', href: '/log-meal', icon: 'camera' },
      { id: 'kitchen', label: 'Kitchen', href: '/inventory', icon: 'archive' },
      { id: 'profile', label: 'Profile', href: '/profile', icon: 'user' }
    ],
    household: [
      { id: 'home', label: 'Home', href: '/dashboard', icon: 'home' },
      { id: 'log', label: 'Log', href: '/log-meal', icon: 'camera' },
      { id: 'kitchen', label: 'Kitchen', href: '/inventory', icon: 'archive' },
      { id: 'care_circle', label: 'Family', href: '/patients', icon: 'users' }
    ],
    caregiver: [
      { id: 'care_circle', label: 'Care', href: '/patients', icon: 'users' },
      { id: 'log', label: 'Log', href: '/log-meal', icon: 'camera' },
      { id: 'home', label: 'Home', href: '/dashboard', icon: 'home' },
      { id: 'kitchen', label: 'Medical', href: '/medical', icon: 'medical-bag' }
    ]
  }

  return tabConfigs[userMode]
}
```

---

## Monetization Decision Tree

```
User Action
  ↓
Check Current Plan
  ↓
  ├─ Free Plan
  │   ├─ Meal Scan? → Count this month
  │   │   ├─ < 10 → Allow
  │   │   └─ >= 10 → BLOCK → Premium Modal
  │   ├─ Add Patient? → Count patients
  │   │   ├─ 0 → Allow
  │   │   └─ >= 1 → BLOCK → Family Modal
  │   ├─ Shopping/Inventory? → BLOCK → Premium Modal
  │   └─ Medications/Appointments? → BLOCK → Family Modal
  │
  ├─ Premium Plan ($9.99/mo)
  │   ├─ Meal Scan? → Allow (unlimited)
  │   ├─ Add Patient? → Count patients
  │   │   ├─ 0 → Allow
  │   │   └─ >= 1 → BLOCK → Family Modal
  │   ├─ Shopping/Inventory? → Allow
  │   └─ Medications/Appointments? → BLOCK → Family Modal
  │
  └─ Family Plan ($19.99/mo)
      └─ ALL FEATURES → Allow (up to 10 patients)
```

---

## Testing Checklist

### User Flow Tests

**Single Mode:**
- [ ] Complete onboarding as "myself"
- [ ] Land on /dashboard
- [ ] See 4 tabs: Home, Log, Kitchen, Profile
- [ ] Shopping/Inventory links show upgrade modal
- [ ] Meal scan works (10 free)
- [ ] 11th meal scan shows upgrade modal (HARD BLOCK)

**Household Mode:**
- [ ] Complete onboarding as "parent"
- [ ] Choose "yes" to add family
- [ ] Land on /patients/new
- [ ] Add 1st patient (allowed - free)
- [ ] Try add 2nd patient → HARD BLOCK → Family upgrade modal
- [ ] See 4 tabs: Home, Log, Kitchen, Family
- [ ] Medications/Appointments show upgrade modal

**Caregiver Mode:**
- [ ] Complete onboarding as "caregiver"
- [ ] Must add patient (required)
- [ ] Land on /patients (not /dashboard)
- [ ] See 4 tabs: Care, Log, Home, Kitchen (Care first!)
- [ ] Personal weight loss hidden
- [ ] Missions/Groups hidden
- [ ] Medical features require Family plan

### Flow Tests

**Kitchen Flow:**
- [ ] /shopping → Barcode scan → Add to list → Purchase → Move to inventory
- [ ] Set expiration date
- [ ] Get recipe suggestions for expiring items

**Care Circle Flow:**
- [ ] /patients → Add patient → Driver license scan → Auto-fill
- [ ] Select patient → Log meal/weight/vitals
- [ ] Trigger appropriate monetization gates

**Meal Logging Flow:**
- [ ] Photo → AI scan → USDA validation → Save
- [ ] Manual → Search foods → Save
- [ ] Template → Select → Save
- [ ] Save as template option

---

## Summary

The complete user journey is now fully mapped:

1. **Onboarding** determines user mode (single/household/caregiver)
2. **Dynamic UI** shows different navigation/features per mode
3. **Feature Flows** (Kitchen, Care Circle, Meal Logging) integrate seamlessly
4. **Monetization** triggers at exact right moments
5. **Type Safety** throughout with TypeScript

All flows are implemented and ready to test!
