/**
 * Gamification System
 *
 * XP, levels, and badge management for the Weekly Missions Engine.
 * Handles progression, rewards, and user achievement tracking.
 */

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { Badge } from './missions'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserGamification {
  userId: string
  totalXP: number
  level: number
  badges: Badge[]
  currentStreak: number
  longestStreak: number
  lifetimeMissionsCompleted: number
  createdAt: string
  updatedAt: string
}

export interface XPTransaction {
  userId: string
  amount: number
  source: 'mission' | 'streak_bonus' | 'daily_login' | 'achievement'
  sourceId: string
  timestamp: string
}

// ============================================================================
// XP & LEVELING CONSTANTS
// ============================================================================

/**
 * XP required for each level (exponential progression)
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 250 XP
 * Level 4: 500 XP
 * Level 5: 1000 XP
 * etc.
 */
export const XP_PER_LEVEL = [
  0,     // Level 1
  100,   // Level 2
  250,   // Level 3
  500,   // Level 4
  1000,  // Level 5
  2000,  // Level 6
  3500,  // Level 7
  5500,  // Level 8
  8000,  // Level 9
  11000, // Level 10
  15000, // Level 11
  20000, // Level 12
  26000, // Level 13
  33000, // Level 14
  41000, // Level 15
  50000, // Level 16+
]

/**
 * Calculate level from total XP
 */
export function calculateLevel(totalXP: number): number {
  let level = 1
  for (let i = 0; i < XP_PER_LEVEL.length; i++) {
    if (totalXP >= XP_PER_LEVEL[i]) {
      level = i + 1
    } else {
      break
    }
  }
  return level
}

/**
 * Get XP required for next level
 */
export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= XP_PER_LEVEL.length) {
    // After max level, each level requires 10k more XP
    return XP_PER_LEVEL[XP_PER_LEVEL.length - 1] + (currentLevel - XP_PER_LEVEL.length + 1) * 10000
  }
  return XP_PER_LEVEL[currentLevel]
}

/**
 * Get XP progress to next level (0-100%)
 */
export function getXPProgress(totalXP: number): { current: number; required: number; percentage: number } {
  const currentLevel = calculateLevel(totalXP)
  const xpForCurrentLevel = currentLevel > 1 ? XP_PER_LEVEL[currentLevel - 2] : 0
  const xpForNextLevel = getXPForNextLevel(currentLevel)
  const xpInCurrentLevel = totalXP - xpForCurrentLevel
  const xpRequiredForLevel = xpForNextLevel - xpForCurrentLevel
  const percentage = Math.min(100, Math.round((xpInCurrentLevel / xpRequiredForLevel) * 100))

  return {
    current: xpInCurrentLevel,
    required: xpRequiredForLevel,
    percentage
  }
}

// ============================================================================
// FIREBASE OPERATIONS
// ============================================================================

/**
 * Get user's gamification profile
 */
export async function getUserGamification(userId: string): Promise<UserGamification | null> {
  try {
    const docRef = doc(db, 'gamification', userId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return docSnap.data() as UserGamification
    }
    return null
  } catch (error) {
    console.error('[Gamification] Error fetching user gamification:', error)
    return null
  }
}

/**
 * Initialize gamification profile for new user
 */
export async function initializeUserGamification(userId: string): Promise<UserGamification> {
  const newProfile: UserGamification = {
    userId,
    totalXP: 0,
    level: 1,
    badges: [],
    currentStreak: 0,
    longestStreak: 0,
    lifetimeMissionsCompleted: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  try {
    await setDoc(doc(db, 'gamification', userId), newProfile)
    console.log('[Gamification] Initialized profile for user:', userId)
    return newProfile
  } catch (error) {
    console.error('[Gamification] Error initializing gamification:', error)
    throw error
  }
}

/**
 * Get or create user gamification profile
 */
export async function getOrCreateUserGamification(userId: string): Promise<UserGamification> {
  let profile = await getUserGamification(userId)
  if (!profile) {
    profile = await initializeUserGamification(userId)
  }
  return profile
}

/**
 * Award XP to user
 */
export async function awardXP(
  userId: string,
  amount: number,
  source: XPTransaction['source'],
  sourceId: string
): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
  try {
    const profile = await getOrCreateUserGamification(userId)
    const oldLevel = profile.level
    const newXP = profile.totalXP + amount
    const newLevel = calculateLevel(newXP)
    const leveledUp = newLevel > oldLevel

    // Update user profile
    await updateDoc(doc(db, 'gamification', userId), {
      totalXP: newXP,
      level: newLevel,
      updatedAt: new Date().toISOString()
    })

    // Log XP transaction
    const transaction: XPTransaction = {
      userId,
      amount,
      source,
      sourceId,
      timestamp: new Date().toISOString()
    }

    await setDoc(doc(collection(db, 'xp_transactions')), transaction)

    console.log(`[Gamification] Awarded ${amount} XP to user ${userId} (${oldLevel} → ${newLevel})`)

    return { newXP, newLevel, leveledUp }
  } catch (error) {
    console.error('[Gamification] Error awarding XP:', error)
    throw error
  }
}

/**
 * Award badge to user
 */
export async function awardBadge(userId: string, badge: Badge): Promise<boolean> {
  try {
    const profile = await getOrCreateUserGamification(userId)

    // Check if user already has this badge
    if (profile.badges.some(b => b.id === badge.id)) {
      console.log('[Gamification] User already has badge:', badge.id)
      return false
    }

    // Add badge with unlock timestamp
    const badgeWithTimestamp: Badge = {
      ...badge,
      unlockedAt: new Date().toISOString()
    }

    await updateDoc(doc(db, 'gamification', userId), {
      badges: [...profile.badges, badgeWithTimestamp],
      updatedAt: new Date().toISOString()
    })

    console.log('[Gamification] Awarded badge to user:', badge.name)
    return true
  } catch (error) {
    console.error('[Gamification] Error awarding badge:', error)
    throw error
  }
}

/**
 * Update user streak
 */
export async function updateStreak(userId: string, newStreak: number): Promise<void> {
  try {
    const profile = await getOrCreateUserGamification(userId)
    const longestStreak = Math.max(profile.longestStreak, newStreak)

    await updateDoc(doc(db, 'gamification', userId), {
      currentStreak: newStreak,
      longestStreak,
      updatedAt: new Date().toISOString()
    })

    console.log('[Gamification] Updated streak for user:', userId, '→', newStreak)
  } catch (error) {
    console.error('[Gamification] Error updating streak:', error)
    throw error
  }
}

/**
 * Increment missions completed count
 */
export async function incrementMissionsCompleted(userId: string): Promise<void> {
  try {
    const profile = await getOrCreateUserGamification(userId)

    await updateDoc(doc(db, 'gamification', userId), {
      lifetimeMissionsCompleted: profile.lifetimeMissionsCompleted + 1,
      updatedAt: new Date().toISOString()
    })

    console.log('[Gamification] Incremented missions completed for user:', userId)
  } catch (error) {
    console.error('[Gamification] Error incrementing missions:', error)
    throw error
  }
}

// ============================================================================
// BADGE DEFINITIONS
// ============================================================================

export const ALL_BADGES: Badge[] = [
  // Mission-specific badges (awarded by missions)
  {
    id: 'protein_master',
    name: 'Protein Master',
    description: 'Hit protein goal 4 days in a row',
    icon: '💪',
    rarity: 'rare'
  },
  {
    id: 'home_chef',
    name: 'Home Chef',
    description: 'Cooked 2 recipes from the app',
    icon: '👨‍🍳',
    rarity: 'rare'
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Logged all meals for 7 consecutive days',
    icon: '🏆',
    rarity: 'epic'
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: '7-day logging streak',
    icon: '🔥',
    rarity: 'epic'
  },
  {
    id: 'master_chef',
    name: 'Master Chef',
    description: 'Cooked 5 recipes in one week',
    icon: '⭐',
    rarity: 'legendary'
  },

  // Level-based badges
  {
    id: 'level_5',
    name: 'Rising Star',
    description: 'Reached level 5',
    icon: '🌟',
    rarity: 'common'
  },
  {
    id: 'level_10',
    name: 'Dedicated Tracker',
    description: 'Reached level 10',
    icon: '💎',
    rarity: 'rare'
  },
  {
    id: 'level_15',
    name: 'Health Legend',
    description: 'Reached level 15',
    icon: '👑',
    rarity: 'legendary'
  },

  // Achievement badges
  {
    id: 'first_mission',
    name: 'Mission Starter',
    description: 'Completed your first mission',
    icon: '🎯',
    rarity: 'common'
  },
  {
    id: '10_missions',
    name: 'Mission Expert',
    description: 'Completed 10 missions',
    icon: '🏅',
    rarity: 'rare'
  },
  {
    id: '30_day_streak',
    name: 'Unstoppable',
    description: '30-day logging streak',
    icon: '🚀',
    rarity: 'legendary'
  }
]

/**
 * Check and award level-based badges
 */
export async function checkLevelBadges(userId: string, newLevel: number): Promise<Badge[]> {
  const badgesAwarded: Badge[] = []

  if (newLevel >= 5) {
    const badge = ALL_BADGES.find(b => b.id === 'level_5')
    if (badge && await awardBadge(userId, badge)) {
      badgesAwarded.push(badge)
    }
  }

  if (newLevel >= 10) {
    const badge = ALL_BADGES.find(b => b.id === 'level_10')
    if (badge && await awardBadge(userId, badge)) {
      badgesAwarded.push(badge)
    }
  }

  if (newLevel >= 15) {
    const badge = ALL_BADGES.find(b => b.id === 'level_15')
    if (badge && await awardBadge(userId, badge)) {
      badgesAwarded.push(badge)
    }
  }

  return badgesAwarded
}

/**
 * Check and award achievement badges
 */
export async function checkAchievementBadges(userId: string): Promise<Badge[]> {
  const badgesAwarded: Badge[] = []
  const profile = await getOrCreateUserGamification(userId)

  // First mission
  if (profile.lifetimeMissionsCompleted === 1) {
    const badge = ALL_BADGES.find(b => b.id === 'first_mission')
    if (badge && await awardBadge(userId, badge)) {
      badgesAwarded.push(badge)
    }
  }

  // 10 missions
  if (profile.lifetimeMissionsCompleted === 10) {
    const badge = ALL_BADGES.find(b => b.id === '10_missions')
    if (badge && await awardBadge(userId, badge)) {
      badgesAwarded.push(badge)
    }
  }

  // 30-day streak
  if (profile.currentStreak === 30) {
    const badge = ALL_BADGES.find(b => b.id === '30_day_streak')
    if (badge && await awardBadge(userId, badge)) {
      badgesAwarded.push(badge)
    }
  }

  return badgesAwarded
}
