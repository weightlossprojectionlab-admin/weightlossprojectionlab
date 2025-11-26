# UNIFIED PRD Implementation Plan

> **Based on:** `docs/UNIFIED_PRD.json`
> **Goal:** Implement simplified, role-based onboarding with dynamic UI and event-driven monetization

---

## Analysis: Current vs PRD

### Current Onboarding (Heavy)
**6 detailed steps:**
1. About You (birthdate, gender, height)
2. Current State (weight, activity level)
3. Goals (target weight, timeline, weekly goal)
4. Daily Targets (auto-calculated)
5. Health Conditions (detailed questionnaires)
6. Meal Schedule & Notifications

**Problems:**
- Too many steps (high drop-off rate)
- One-size-fits-all (doesn't adapt to user needs)
- No role-based customization
- No dynamic feature discovery
- Monetization is fixed (not event-driven)

### PRD Onboarding (Smart)
**7 adaptive questions:**
1. **Role Selection** → Determines entire UX
2. **Goals** → Shows relevant features only
3. **Living Situation** → Household vs solo mode
4. **Food Management** → Kitchen features visibility
5. **Logging Preference** → Photo vs manual default
6. **Automation** → Reminder settings
7. **Family Setup** → Optional immediate add

**Benefits:**
- Faster (7 simple questions vs 6 complex steps)
- Adaptive UI (shows only what user needs)
- Role-based (myself/parent/partner/child/pet/caregiver)
- Event-driven upgrades (triggers when hitting limits)

---

## Implementation Phases

### Phase 1: Data Models & Types ✅

**1. Add new types to `types/index.ts`:**

```typescript
// User Modes (from PRD)
export type UserMode = 'single' | 'household' | 'caregiver'

// Role Selection
export type UserRole =
  | 'myself'
  | 'parent'
  | 'partner'
  | 'child'
  | 'pet'
  | 'multiple'
  | 'caregiver'

// Feature Preferences
export type FeaturePreference =
  | 'weight_loss'
  | 'meal_planning'
  | 'medical_tracking'
  | 'caregiving'
  | 'shopping_automation'
  | 'recipes'
  | 'fitness'
  | 'vitals'
  | 'medications'

// Household Type
export type HouseholdType =
  | 'alone'
  | 'partner'
  | 'family'
  | 'roommates'
  | 'dependents'

// Kitchen Mode
export type KitchenMode =
  | 'self'
  | 'others'
  | 'shared'
  | 'i_shop'
  | 'i_dont_shop'

// Meal Logging Mode
export type MealLoggingMode =
  | 'photo'
  | 'manual'
  | 'both'
  | 'with_reminders'

// Automation Level
export type AutomationLevel = 'yes' | 'no'

// Onboarding Data (PRD version)
export interface OnboardingAnswers {
  userMode: UserMode
  primaryRole: UserRole
  featurePreferences: FeaturePreference[]
  householdType: HouseholdType
  kitchenMode: KitchenMode
  mealLoggingMode: MealLoggingMode
  automationLevel: AutomationLevel
  addFamilyNow: boolean
  completedAt: Date
}

// Update UserPreferences to include onboarding answers
export interface UserPreferences {
  // ... existing fields
  onboardingAnswers?: OnboardingAnswers
  userMode?: UserMode  // Cached for quick access
}
```

---

### Phase 2: New Onboarding Component 🔨

**Create:** `app/onboarding-v2/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  UserMode,
  UserRole,
  OnboardingAnswers,
  FeaturePreference,
  HouseholdType,
  KitchenMode,
  MealLoggingMode,
  AutomationLevel
} from '@/types'

// Import PRD config
import prdConfig from '@/docs/UNIFIED_PRD.json'

export default function OnboardingV2Page() {
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({})

  const screens = prdConfig.onboarding.screens

  // Determine user mode from primary role
  function determineUserMode(role: UserRole): UserMode {
    if (role === 'myself') return 'single'
    if (role === 'caregiver') return 'caregiver'
    return 'household'
  }

  // Handle answer selection
  function handleAnswer(questionId: string, value: any) {
    const updatedAnswers = { ...answers, [questionId]: value }
    setAnswers(updatedAnswers)

    // Auto-determine user mode after role selection
    if (questionId === 'role_selection') {
      const mode = determineUserMode(value as UserRole)
      updatedAnswers.userMode = mode
    }

    // Move to next step
    setStep(step + 1)
  }

  // Check if screen should be visible
  function isScreenVisible(screen: any): boolean {
    if (!screen.visibleIf) return true

    // Parse simple conditionals (e.g., "userMode != 'myself'")
    // For now, handle the one case in PRD
    if (screen.visibleIf === "userMode != 'myself'") {
      return answers.userMode !== 'single'
    }

    return true
  }

  // Complete onboarding
  async function completeOnboarding() {
    if (!user) return

    const onboardingData: OnboardingAnswers = {
      userMode: answers.userMode!,
      primaryRole: answers.role_selection!,
      featurePreferences: answers.goals || [],
      householdType: answers.living_situation!,
      kitchenMode: answers.food_management!,
      mealLoggingMode: answers.logging_preference!,
      automationLevel: answers.automation!,
      addFamilyNow: answers.family_setup === 'yes',
      completedAt: new Date()
    }

    // Save to Firestore
    await setDoc(
      doc(db, 'users', user.uid),
      {
        preferences: {
          onboardingAnswers: onboardingData,
          userMode: onboardingData.userMode
        },
        profile: {
          onboardingCompleted: true,
          onboardingCompletedAt: new Date()
        }
      },
      { merge: true }
    )

    // Redirect based on user mode
    const tabs = prdConfig.onboarding.userModes[onboardingData.userMode].tabs
    const firstTab = tabs[0]

    if (onboardingData.addFamilyNow) {
      router.push('/patients/new')
    } else {
      router.push(`/${firstTab}`)
    }
  }

  // Get current screen
  const currentScreen = screens[step - 1]
  if (!currentScreen) {
    completeOnboarding()
    return <div>Completing setup...</div>
  }

  // Skip if not visible
  if (!isScreenVisible(currentScreen)) {
    setStep(step + 1)
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${(step / screens.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">{currentScreen.question}</h2>
          <p className="text-muted-foreground text-sm">
            Step {step} of {screens.length}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentScreen.options.map((option) => (
            <button
              key={option}
              onClick={() => handleAnswer(currentScreen.id, option)}
              className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-colors text-left"
            >
              <div className="font-medium capitalize">
                {option.replace(/_/g, ' ')}
              </div>
            </button>
          ))}
        </div>

        {/* Back button */}
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}
```

---

### Phase 3: Dynamic UI System 🎨

**Create:** `lib/user-mode-config.ts`

```typescript
import type { UserMode, FeaturePreference } from '@/types'

export interface UIConfig {
  tabs: Array<{
    id: string
    label: string
    href: string
    icon: string
  }>
  features: {
    [key: string]: boolean
  }
  defaultRoute: string
}

export function getUIConfig(
  userMode: UserMode,
  featurePreferences: FeaturePreference[]
): UIConfig {
  const baseConfigs: Record<UserMode, UIConfig> = {
    single: {
      tabs: [
        { id: 'home', label: 'Home', href: '/dashboard', icon: 'home' },
        { id: 'log', label: 'Log', href: '/log-meal', icon: 'camera' },
        { id: 'kitchen', label: 'Kitchen', href: '/inventory', icon: 'archive' },
        { id: 'profile', label: 'Profile', href: '/profile', icon: 'user' }
      ],
      features: {
        weightLoss: true,
        mealLogging: true,
        shopping: false,
        inventory: false,
        recipes: false,
        medical: false,
        family: false
      },
      defaultRoute: '/dashboard'
    },

    household: {
      tabs: [
        { id: 'home', label: 'Home', href: '/dashboard', icon: 'home' },
        { id: 'log', label: 'Log', href: '/log-meal', icon: 'camera' },
        { id: 'kitchen', label: 'Kitchen', href: '/inventory', icon: 'archive' },
        { id: 'care_circle', label: 'Family', href: '/patients', icon: 'users' }
      ],
      features: {
        weightLoss: true,
        mealLogging: true,
        shopping: true,
        inventory: true,
        recipes: true,
        medical: true,
        family: true
      },
      defaultRoute: '/dashboard'
    },

    caregiver: {
      tabs: [
        { id: 'care_circle', label: 'Care', href: '/patients', icon: 'users' },
        { id: 'log', label: 'Log', href: '/log-meal', icon: 'camera' },
        { id: 'home', label: 'Home', href: '/dashboard', icon: 'home' },
        { id: 'kitchen', label: 'Kitchen', href: '/medical', icon: 'medical' }
      ],
      features: {
        weightLoss: false,
        mealLogging: true,
        shopping: true,
        inventory: true,
        recipes: true,
        medical: true,
        family: true
      },
      defaultRoute: '/patients'
    }
  }

  const config = baseConfigs[userMode]

  // Enable features based on preferences
  featurePreferences.forEach(pref => {
    switch (pref) {
      case 'shopping_automation':
        config.features.shopping = true
        config.features.inventory = true
        break
      case 'recipes':
        config.features.recipes = true
        break
      case 'medical_tracking':
      case 'medications':
      case 'vitals':
        config.features.medical = true
        break
    }
  })

  return config
}

// Hook to use UI config
export function useUIConfig() {
  const { user } = useAuth()
  const [config, setConfig] = useState<UIConfig | null>(null)

  useEffect(() => {
    if (!user) return

    const fetchConfig = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const prefs = userDoc.data()?.preferences

      const mode = prefs?.userMode || 'single'
      const featurePrefs = prefs?.onboardingAnswers?.featurePreferences || []

      setConfig(getUIConfig(mode, featurePrefs))
    }

    fetchConfig()
  }, [user])

  return config
}
```

**Update:** `components/ui/BottomNav.tsx`

```typescript
import { useUIConfig } from '@/lib/user-mode-config'

export function BottomNav() {
  const config = useUIConfig()
  const pathname = usePathname()

  if (!config) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t">
      <div className="flex items-center justify-around h-16">
        {config.tabs.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={isActive ? 'text-primary' : 'text-muted-foreground'}
            >
              <Icon name={tab.icon} />
              <span className="text-xs">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
```

---

### Phase 4: Event-Driven Monetization 💰

**Create:** `lib/monetization-triggers.ts`

```typescript
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { UserSubscription } from '@/types'

export type TriggerType =
  | 'ai_meal_scan'
  | 'recipes_limit'
  | 'inventory'
  | 'shopping'
  | 'ai_chat_limit'
  | 'add_second_member'
  | 'medications'
  | 'appointments'
  | 'vitals'
  | 'add_five_members'
  | 'storage_limit'
  | 'ai_chat_unlimited'
  | 'medical_reports'

export type UpgradeTier = 'premium' | 'family' | 'familyPlus'

const TRIGGER_TO_TIER: Record<TriggerType, UpgradeTier> = {
  // Premium triggers
  ai_meal_scan: 'premium',
  recipes_limit: 'premium',
  inventory: 'premium',
  shopping: 'premium',
  ai_chat_limit: 'premium',

  // Family triggers
  add_second_member: 'family',
  medications: 'family',
  appointments: 'family',
  vitals: 'family',

  // Family+ triggers
  add_five_members: 'familyPlus',
  storage_limit: 'familyPlus',
  ai_chat_unlimited: 'familyPlus',
  medical_reports: 'familyPlus'
}

export interface UpgradePrompt {
  trigger: TriggerType
  tier: UpgradeTier
  title: string
  description: string
  features: string[]
  ctaText: string
}

export async function checkTrigger(
  userId: string,
  trigger: TriggerType
): Promise<UpgradePrompt | null> {
  // Get user subscription
  const userDoc = await getDoc(doc(db, 'users', userId))
  const subscription = userDoc.data()?.subscription as UserSubscription | undefined

  const requiredTier = TRIGGER_TO_TIER[trigger]

  // Check if user has required tier
  const currentPlan = subscription?.plan || 'free'

  const tierHierarchy = ['free', 'single', 'family']
  const currentTierIndex = tierHierarchy.indexOf(currentPlan)
  const requiredTierIndex = tierHierarchy.indexOf(
    requiredTier === 'premium' ? 'single' : requiredTier
  )

  // User already has required tier or higher
  if (currentTierIndex >= requiredTierIndex) {
    return null
  }

  // Return upgrade prompt
  return getUpgradePrompt(trigger, requiredTier)
}

function getUpgradePrompt(trigger: TriggerType, tier: UpgradeTier): UpgradePrompt {
  const prompts: Record<TriggerType, Omit<UpgradePrompt, 'trigger' | 'tier'>> = {
    ai_meal_scan: {
      title: 'Unlock AI Meal Analysis',
      description: 'Get instant nutrition info from meal photos with AI',
      features: [
        'Unlimited AI meal scans',
        'USDA-verified nutrition data',
        'Meal templates & history'
      ],
      ctaText: 'Upgrade to Premium'
    },
    recipes_limit: {
      title: 'Access Full Recipe Library',
      description: 'Unlock 1,000+ healthy recipes with step-by-step cooking',
      features: [
        'Unlimited recipe access',
        'Cooking timers & guides',
        'Save favorites'
      ],
      ctaText: 'Upgrade to Premium'
    },
    add_second_member: {
      title: 'Track Your Whole Family',
      description: 'Manage health for everyone in your household',
      features: [
        'Up to 10 family members',
        'Medical records & appointments',
        'Shared shopping lists',
        'Family collaboration'
      ],
      ctaText: 'Upgrade to Family Plan'
    },
    // ... add all other triggers
  }

  return {
    trigger,
    tier,
    ...prompts[trigger]
  }
}

// Usage hook
export function useMonetizationTrigger(trigger: TriggerType) {
  const { user } = useAuth()
  const [prompt, setPrompt] = useState<UpgradePrompt | null>(null)
  const [showModal, setShowModal] = useState(false)

  async function checkAndPrompt() {
    if (!user) return

    const upgradePrompt = await checkTrigger(user.uid, trigger)
    if (upgradePrompt) {
      setPrompt(upgradePrompt)
      setShowModal(true)
      return false // Block action
    }

    return true // Allow action
  }

  return {
    checkAndPrompt,
    prompt,
    showModal,
    setShowModal
  }
}
```

**Usage Example:**

```typescript
// In log-meal page
export default function LogMealPage() {
  const mealScanTrigger = useMonetizationTrigger('ai_meal_scan')

  async function handlePhotoCapture(photo: File) {
    // Check if user can use this feature
    const allowed = await mealScanTrigger.checkAndPrompt()

    if (!allowed) {
      // Show upgrade modal (already triggered)
      return
    }

    // Proceed with meal scan
    await analyzeMeal(photo)
  }

  return (
    <>
      <MealPhotoCapture onCapture={handlePhotoCapture} />

      {/* Upgrade Modal */}
      {mealScanTrigger.showModal && (
        <UpgradeModal
          prompt={mealScanTrigger.prompt}
          onClose={() => mealScanTrigger.setShowModal(false)}
        />
      )}
    </>
  )
}
```

---

## Implementation Checklist

### Phase 1: Data Models ✅
- [ ] Add new types to `types/index.ts`
- [ ] Update `UserPreferences` interface
- [ ] Create migration script for existing users

### Phase 2: New Onboarding 🔨
- [ ] Create `app/onboarding-v2/page.tsx`
- [ ] Test role-based flow
- [ ] Add multi-select support for goals
- [ ] Add conditional visibility logic
- [ ] Test all 7 questions

### Phase 3: Dynamic UI 🎨
- [ ] Create `lib/user-mode-config.ts`
- [ ] Update `BottomNav.tsx` to use dynamic config
- [ ] Update `AppMenu.tsx` for dynamic menu
- [ ] Test single/household/caregiver modes
- [ ] Add feature flag checks throughout app

### Phase 4: Monetization 💰
- [ ] Create `lib/monetization-triggers.ts`
- [ ] Create `components/UpgradeModal.tsx`
- [ ] Add triggers to key features:
  - [ ] Meal scan (ai_meal_scan)
  - [ ] Recipe access (recipes_limit)
  - [ ] Add 2nd patient (add_second_member)
  - [ ] Medications (medications)
  - [ ] Shopping list (shopping)
  - [ ] Inventory (inventory)
- [ ] Test trigger → modal → upgrade flow
- [ ] Add analytics tracking

### Phase 5: Migration 🔄
- [ ] Create data migration script
- [ ] A/B test old vs new onboarding
- [ ] Collect metrics (completion rate, time, etc.)
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Deprecate old onboarding

---

## Migration Strategy

### Existing Users
```typescript
// lib/migrations/onboarding-v2.ts

export async function migrateToOnboardingV2(userId: string) {
  const userDoc = await getDoc(doc(db, 'users', userId))
  const data = userDoc.data()

  // Infer user mode from existing data
  const patientCount = data?.patients?.length || 0
  const userMode: UserMode = patientCount > 1 ? 'household' : 'single'

  // Infer feature preferences from usage
  const featurePreferences: FeaturePreference[] = ['weight_loss']
  if (data?.mealLogs?.length > 0) featurePreferences.push('meal_planning')
  if (data?.shoppingList?.length > 0) featurePreferences.push('shopping_automation')
  if (data?.appointments?.length > 0) featurePreferences.push('medical_tracking')

  // Create onboarding answers
  const onboardingAnswers: OnboardingAnswers = {
    userMode,
    primaryRole: userMode === 'household' ? 'multiple' : 'myself',
    featurePreferences,
    householdType: userMode === 'household' ? 'family' : 'alone',
    kitchenMode: 'self',
    mealLoggingMode: 'both',
    automationLevel: data?.preferences?.notifications ? 'yes' : 'no',
    addFamilyNow: false,
    completedAt: new Date()
  }

  // Save
  await setDoc(
    doc(db, 'users', userId),
    {
      preferences: {
        onboardingAnswers,
        userMode
      }
    },
    { merge: true }
  )
}
```

---

## Success Metrics

### Onboarding Completion Rate
- **Current (6-step):** ~65% (estimated)
- **Target (7-question):** >85%

### Time to Complete
- **Current:** ~8-12 minutes
- **Target:** <3 minutes

### Feature Discovery
- **Current:** Users don't know what features exist
- **Target:** 80% of users activate at least 3 features in first week

### Monetization Conversion
- **Current:** No paywall (all free)
- **Target:**
  - 15% free → premium (meal scan trigger)
  - 25% free → family (add 2nd patient trigger)

---

## Next Steps

1. **Review this plan** - Approve/modify approach
2. **Phase 1** - Add types (1 day)
3. **Phase 2** - Build new onboarding (2-3 days)
4. **Phase 3** - Dynamic UI (2 days)
5. **Phase 4** - Monetization (3 days)
6. **Phase 5** - Test & migrate (1 week)

**Total estimated time:** 2-3 weeks

---

Ready to start implementation?
