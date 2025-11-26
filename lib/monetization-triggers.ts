/**
 * Event-Driven Monetization System (UNIFIED PRD)
 *
 * Triggers upgrade prompts when users hit feature limits
 * Based on docs/UNIFIED_PRD.json monetization.triggers
 */

import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import type { UserSubscription } from '@/types'

// Import PRD config
import prdConfig from '@/docs/UNIFIED_PRD.json'

export type TriggerType =
  // Premium triggers
  | 'ai_meal_scan'
  | 'recipes_limit'
  | 'inventory'
  | 'shopping'
  | 'ai_chat_limit'
  // Family triggers
  | 'add_second_member'
  | 'medications'
  | 'appointments'
  | 'vitals'
  // Family+ triggers
  | 'add_five_members'
  | 'storage_limit'
  | 'ai_chat_unlimited'
  | 'medical_reports'

export type UpgradeTier = 'premium' | 'family' | 'familyPlus'

// Map triggers to tiers (from PRD)
const TRIGGER_TO_TIER: Record<TriggerType, UpgradeTier> = {
  // Premium
  ai_meal_scan: 'premium',
  recipes_limit: 'premium',
  inventory: 'premium',
  shopping: 'premium',
  ai_chat_limit: 'premium',

  // Family
  add_second_member: 'family',
  medications: 'family',
  appointments: 'family',
  vitals: 'family',

  // Family+
  add_five_members: 'familyPlus',
  storage_limit: 'familyPlus',
  ai_chat_unlimited: 'familyPlus',
  medical_reports: 'familyPlus'
}

// Free tier limits
const FREE_LIMITS = {
  mealScansPerMonth: 10,
  recipesViewable: 20,
  patients: 1,
  aiChatMessagesPerDay: 5,
  storageGB: 1
}

// Single/Premium tier limits
const PREMIUM_LIMITS = {
  mealScansPerMonth: Infinity,
  recipesViewable: Infinity,
  patients: 1, // Still 1 patient
  aiChatMessagesPerDay: 50,
  storageGB: 5
}

// Family tier limits
const FAMILY_LIMITS = {
  mealScansPerMonth: Infinity,
  recipesViewable: Infinity,
  patients: 10,
  aiChatMessagesPerDay: 100,
  storageGB: 10
}

export interface UpgradePrompt {
  trigger: TriggerType
  tier: UpgradeTier
  title: string
  description: string
  features: string[]
  pricing?: {
    plan: string
    price: string
    period: string
  }
  ctaText: string
  urgency: 'soft' | 'hard' // soft = can dismiss, hard = must upgrade
}

/**
 * Check if user has hit a trigger limit
 * Returns UpgradePrompt if upgrade is needed, null if user can proceed
 */
export async function checkTrigger(
  userId: string,
  trigger: TriggerType
): Promise<UpgradePrompt | null> {
  // Get user subscription
  const userDoc = await getDoc(doc(db, 'users', userId))
  const subscription = userDoc.data()?.subscription as UserSubscription | undefined

  const currentPlan = subscription?.plan || 'free'
  const requiredTier = TRIGGER_TO_TIER[trigger]

  // Check tier hierarchy
  const tierHierarchy = ['free', 'single', 'family']
  const planToTier: Record<string, string> = {
    free: 'free',
    single: 'premium',
    family: 'family'
  }

  const currentTierIndex = tierHierarchy.indexOf(currentPlan)
  const requiredTierIndex = tierHierarchy.indexOf(
    requiredTier === 'premium' ? 'single' :
    requiredTier === 'familyPlus' ? 'family' :
    requiredTier
  )

  // User already has required tier or higher
  if (currentTierIndex >= requiredTierIndex && requiredTier !== 'familyPlus') {
    return null
  }

  // Check specific trigger limits
  const needsUpgrade = await checkSpecificLimit(userId, trigger, currentPlan)

  if (!needsUpgrade) {
    return null
  }

  // Return upgrade prompt
  return getUpgradePrompt(trigger, requiredTier, currentPlan)
}

/**
 * Check specific limits for a trigger
 */
async function checkSpecificLimit(
  userId: string,
  trigger: TriggerType,
  currentPlan: string
): Promise<boolean> {
  const limits = currentPlan === 'free' ? FREE_LIMITS : PREMIUM_LIMITS

  switch (trigger) {
    case 'ai_meal_scan': {
      // Check meal scans this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const mealLogsRef = collection(db, 'meal-logs')
      const q = query(
        mealLogsRef,
        where('userId', '==', userId),
        where('dataSource', '==', 'ai-vision'),
        where('loggedAt', '>=', startOfMonth)
      )
      const snapshot = await getDocs(q)

      return snapshot.size >= limits.mealScansPerMonth
    }

    case 'add_second_member': {
      // Check patient count
      const patientsRef = collection(db, 'patients')
      const q = query(patientsRef, where('userId', '==', userId))
      const snapshot = await getDocs(q)

      return snapshot.size >= limits.patients
    }

    case 'add_five_members': {
      // Check if approaching family plan limit
      const patientsRef = collection(db, 'patients')
      const q = query(patientsRef, where('userId', '==', userId))
      const snapshot = await getDocs(q)

      return snapshot.size >= 5
    }

    // For feature gates (not usage-based), always trigger if plan is insufficient
    case 'recipes_limit':
    case 'inventory':
    case 'shopping':
    case 'medications':
    case 'appointments':
    case 'vitals':
    case 'medical_reports':
      return true

    default:
      return false
  }
}

/**
 * Get upgrade prompt for a trigger
 */
function getUpgradePrompt(
  trigger: TriggerType,
  tier: UpgradeTier,
  currentPlan: string
): UpgradePrompt {
  const prompts: Record<TriggerType, Omit<UpgradePrompt, 'trigger' | 'tier'>> = {
    ai_meal_scan: {
      title: currentPlan === 'free' ? 'Meal Scan Limit Reached' : 'Unlock Unlimited AI Scans',
      description: currentPlan === 'free'
        ? "You've used all 10 free AI meal scans this month. Upgrade for unlimited!"
        : 'Get instant nutrition info from meal photos with unlimited AI scans',
      features: [
        '∞ Unlimited AI meal scans',
        '✓ USDA-verified nutrition data',
        '✓ Meal templates & history',
        '✓ Advanced meal insights'
      ],
      pricing: {
        plan: 'Premium',
        price: '$9.99',
        period: 'month'
      },
      ctaText: 'Upgrade to Premium',
      urgency: 'hard' // Hard block - can't scan without upgrade
    },

    recipes_limit: {
      title: 'Unlock Full Recipe Library',
      description: 'Access 1,000+ healthy recipes with step-by-step cooking guides',
      features: [
        '∞ Unlimited recipe access',
        '⏱️ Cooking timers & step guides',
        '❤️ Save unlimited favorites',
        '🛒 Auto-generate shopping lists'
      ],
      pricing: {
        plan: 'Premium',
        price: '$9.99',
        period: 'month'
      },
      ctaText: 'Upgrade Now',
      urgency: 'soft' // Can view 20 free recipes
    },

    inventory: {
      title: 'Smart Kitchen Management',
      description: 'Track your inventory, reduce waste, and never forget what you have',
      features: [
        '📦 Track all pantry items',
        '📅 Expiration date alerts',
        '📊 Waste reduction analytics',
        '🍽️ Recipe suggestions from inventory'
      ],
      pricing: {
        plan: 'Premium',
        price: '$9.99',
        period: 'month'
      },
      ctaText: 'Unlock Kitchen Features',
      urgency: 'soft'
    },

    shopping: {
      title: 'Smart Shopping Lists',
      description: 'Automated shopping lists with barcode scanning and price tracking',
      features: [
        '📸 Barcode scanner',
        '🛒 Auto-categorize items',
        '💰 Price tracking',
        '👨‍👩‍👧 Share with family'
      ],
      pricing: {
        plan: 'Premium',
        price: '$9.99',
        period: 'month'
      },
      ctaText: 'Get Shopping Features',
      urgency: 'soft'
    },

    ai_chat_limit: {
      title: 'Daily AI Chat Limit Reached',
      description: "You've used all 5 free AI coach messages today. Upgrade for more!",
      features: [
        '💬 50 messages/day (Premium)',
        '∞ Unlimited messages (Family+)',
        '🧠 Personalized coaching',
        '📈 Progress tracking'
      ],
      pricing: {
        plan: 'Premium',
        price: '$9.99',
        period: 'month'
      },
      ctaText: 'Upgrade for More Chats',
      urgency: 'hard'
    },

    add_second_member: {
      title: 'Track Your Whole Family',
      description: 'Manage health for everyone in your household with Family Plan',
      features: [
        '👨‍👩‍👧‍👦 Up to 10 family members',
        '🏥 Medical records & appointments',
        '🛒 Shared shopping lists',
        '👥 Family collaboration & permissions'
      ],
      pricing: {
        plan: 'Family',
        price: '$19.99',
        period: 'month'
      },
      ctaText: 'Upgrade to Family Plan',
      urgency: 'hard' // Can't add 2nd patient without upgrade
    },

    medications: {
      title: 'Medication Management',
      description: 'Track medications for your family with advanced features',
      features: [
        '💊 Scan prescriptions with OCR',
        '⏰ Medication reminders',
        '⚠️ Drug interaction alerts',
        '📊 Medication adherence tracking'
      ],
      pricing: {
        plan: 'Family',
        price: '$19.99',
        period: 'month'
      },
      ctaText: 'Upgrade for Medications',
      urgency: 'soft'
    },

    appointments: {
      title: 'Healthcare Appointments',
      description: 'Manage doctor appointments for your whole family',
      features: [
        '📅 Schedule & track appointments',
        '🤖 AI appointment recommendations',
        '🚗 Driver assignment & reminders',
        '📍 Provider directory'
      ],
      pricing: {
        plan: 'Family',
        price: '$19.99',
        period: 'month'
      },
      ctaText: 'Unlock Appointments',
      urgency: 'soft'
    },

    vitals: {
      title: 'Health Vitals Tracking',
      description: 'Monitor blood pressure, blood sugar, and more for your family',
      features: [
        '❤️ Blood pressure tracking',
        '🩸 Blood sugar logs',
        '🫁 Pulse oximeter support',
        '📈 Trend analysis & alerts'
      ],
      pricing: {
        plan: 'Family',
        price: '$19.99',
        period: 'month'
      },
      ctaText: 'Get Vitals Tracking',
      urgency: 'soft'
    },

    add_five_members: {
      title: 'Expand Your Care Circle',
      description: 'Track more than 5 family members? We\'ve got you covered!',
      features: [
        '👨‍👩‍👧‍👦 Up to 10 family members',
        '📊 Advanced analytics for all',
        '🤖 AI coaching for everyone',
        '☁️ 10GB storage'
      ],
      pricing: {
        plan: 'Family',
        price: '$19.99',
        period: 'month'
      },
      ctaText: 'Already on Family Plan',
      urgency: 'soft' // Informational - Family plan already supports 10
    },

    storage_limit: {
      title: 'Storage Almost Full',
      description: "You're approaching your 1GB storage limit. Upgrade for more space!",
      features: [
        '☁️ 5GB storage (Premium)',
        '☁️ 10GB storage (Family)',
        '📸 Unlimited meal photos',
        '📄 Medical document storage'
      ],
      pricing: {
        plan: 'Premium',
        price: '$9.99',
        period: 'month'
      },
      ctaText: 'Get More Storage',
      urgency: 'soft'
    },

    ai_chat_unlimited: {
      title: 'Unlimited AI Coaching',
      description: 'Get unlimited AI coach messages for your whole family',
      features: [
        '∞ Unlimited AI messages',
        '👨‍👩‍👧 AI coaching for all members',
        '📊 Advanced health insights',
        '🎯 Personalized recommendations'
      ],
      pricing: {
        plan: 'Family',
        price: '$19.99',
        period: 'month'
      },
      ctaText: 'Upgrade to Family',
      urgency: 'soft'
    },

    medical_reports: {
      title: 'Medical Reports & Export',
      description: 'Generate comprehensive health reports for doctor visits',
      features: [
        '📋 Printable medical reports',
        '📊 Health data export (CSV, PDF)',
        '🏥 Share with providers',
        '📈 Trend analysis reports'
      ],
      pricing: {
        plan: 'Family',
        price: '$19.99',
        period: 'month'
      },
      ctaText: 'Get Medical Reports',
      urgency: 'soft'
    }
  }

  return {
    trigger,
    tier,
    ...prompts[trigger]
  }
}

/**
 * Log trigger event for analytics
 */
export async function logTriggerEvent(
  userId: string,
  trigger: TriggerType,
  action: 'shown' | 'dismissed' | 'upgraded'
) {
  // TODO: Integrate with analytics service
  console.log('[Monetization]', { userId, trigger, action, timestamp: new Date() })
}
