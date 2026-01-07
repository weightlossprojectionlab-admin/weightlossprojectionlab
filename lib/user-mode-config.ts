/**
 * Dynamic UI Configuration based on User Mode (UNIFIED PRD)
 *
 * Adapts navigation, features, and routing based on user's onboarding answers
 */

import type { UserMode, FeaturePreference } from '@/types'
import prdConfig from '@/docs/UNIFIED_PRD.json'

export interface TabConfig {
  id: string
  label: string
  href: string
  icon: string
  priority: number // Lower = higher priority (for ordering)
}

export interface UIConfig {
  userMode: UserMode
  tabs: TabConfig[]
  features: {
    weightLoss: boolean
    mealLogging: boolean
    shopping: boolean
    inventory: boolean
    recipes: boolean
    medical: boolean
    family: boolean
    coaching: boolean
    missions: boolean
    groups: boolean
  }
  defaultRoute: string
  hiddenRoutes?: string[] // Routes to hide in navigation
}

/**
 * Get UI configuration for a user based on their mode and preferences
 */
export function getUIConfig(
  userMode: UserMode,
  featurePreferences: FeaturePreference[] = []
): UIConfig {
  // Base configurations from PRD
  const baseTabs: Record<UserMode, string[]> = {
    single: prdConfig.onboarding.userModes.single.tabs,
    household: prdConfig.onboarding.userModes.household.tabs,
    caregiver: prdConfig.onboarding.userModes.caregiver.tabs
  }

  // Map tab IDs to full config
  const tabMapping: Record<string, TabConfig> = {
    home: {
      id: 'home',
      label: 'Home',
      href: '/dashboard',
      icon: 'home',
      priority: 1
    },
    log: {
      id: 'log',
      label: 'Log',
      href: '/log-meal',
      icon: 'camera',
      priority: 2
    },
    kitchen: {
      id: 'kitchen',
      label: 'Kitchen',
      href: '/inventory',
      icon: 'archive',
      priority: 3
    },
    profile: {
      id: 'profile',
      label: 'Profile',
      href: '/profile',
      icon: 'user',
      priority: 4
    },
    care_circle: {
      id: 'care_circle',
      label: 'Family',
      href: '/patients',
      icon: 'users',
      priority: 0 // Highest priority for caregivers
    }
  }

  // Get base tabs for this mode
  const modeTabs = baseTabs[userMode]
  const tabs = modeTabs
    .map(tabId => tabMapping[tabId])
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority)

  // Base features by mode
  const baseFeatures: Record<UserMode, UIConfig['features']> = {
    single: {
      weightLoss: true,
      mealLogging: true,
      shopping: false,
      inventory: false,
      recipes: false,
      medical: false,
      family: false,
      coaching: false,
      missions: true,
      groups: true
    },
    household: {
      weightLoss: true,
      mealLogging: true,
      shopping: true,
      inventory: true,
      recipes: true,
      medical: true,
      family: true,
      coaching: true,
      missions: true,
      groups: true
    },
    caregiver: {
      weightLoss: false, // Caregivers track others, not themselves
      mealLogging: true,
      shopping: true,
      inventory: true,
      recipes: true,
      medical: true,
      family: true,
      coaching: false,
      missions: false,
      groups: false
    }
  }

  const features = { ...baseFeatures[userMode] }

  // Enable features based on preferences
  featurePreferences.forEach(pref => {
    switch (pref) {
      case 'body_fitness':
        features.weightLoss = true
        features.missions = true
        features.groups = true
        break
      case 'nutrition_kitchen':
        features.mealLogging = true
        features.recipes = true
        features.shopping = true
        features.inventory = true
        break
      case 'health_medical':
        features.medical = true
        break
      case 'caregiving':
        features.family = true
        features.medical = true
        break
    }
  })

  // Default routes by mode
  const defaultRoutes: Record<UserMode, string> = {
    single: '/dashboard',
    household: '/dashboard',
    caregiver: '/patients'
  }

  return {
    userMode,
    tabs,
    features,
    defaultRoute: defaultRoutes[userMode],
    hiddenRoutes: getHiddenRoutes(userMode, features)
  }
}

/**
 * Determine which routes should be hidden from navigation
 */
function getHiddenRoutes(userMode: UserMode, features: UIConfig['features']): string[] {
  const hidden: string[] = []

  // Hide features that are disabled
  if (!features.shopping) hidden.push('/shopping')
  if (!features.inventory) hidden.push('/inventory')
  if (!features.recipes) hidden.push('/recipes', '/discover')
  if (!features.medical) hidden.push('/medical', '/medications', '/appointments', '/providers')
  if (!features.family) hidden.push('/patients', '/family')
  if (!features.missions) hidden.push('/missions')
  if (!features.groups) hidden.push('/groups')
  if (!features.coaching) hidden.push('/coaching')

  // Caregiver mode: hide personal weight loss features
  if (userMode === 'caregiver') {
    hidden.push('/log-weight', '/log-steps', '/weight-history', '/progress')
  }

  return hidden
}

/**
 * Check if a feature is enabled for the user
 */
export function isFeatureEnabled(
  config: UIConfig | null,
  feature: keyof UIConfig['features']
): boolean {
  if (!config) return false
  return config.features[feature]
}

/**
 * Check if a route should be visible in navigation
 */
export function isRouteVisible(config: UIConfig | null, route: string): boolean {
  if (!config) return true
  return !config.hiddenRoutes?.some(hidden => route.startsWith(hidden))
}

/**
 * Get tab label override for specific modes
 * Example: "Kitchen" → "Medical" for caregiver mode
 */
export function getTabLabel(tabId: string, userMode: UserMode): string {
  if (userMode === 'caregiver' && tabId === 'kitchen') {
    return 'Medical'
  }
  return tabId.replace('_', ' ')
}
