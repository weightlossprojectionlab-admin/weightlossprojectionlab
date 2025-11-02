'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import {
  Mission,
  UserMission,
  getWeeklyMissions,
  getCurrentWeek,
  getWeekIdentifier,
  calculateMissionProgress,
  isMissionComplete,
  MealLog,
  WeightLog,
  RecipeCompletion
} from '@/lib/missions'
import {
  UserGamification,
  getOrCreateUserGamification,
  awardXP,
  awardBadge,
  incrementMissionsCompleted,
  checkLevelBadges,
  checkAchievementBadges
} from '@/lib/gamification'
import toast from 'react-hot-toast'

export interface MissionProgress extends Mission {
  userMissionId?: string
  missionId?: string
  progress: number
  targetProgress: number
  completed: boolean
  status: 'active' | 'completed' | 'expired'
  completedAt?: string
  expiresAt?: string
  xpAwarded: boolean
}

export interface MissionsState {
  missions: MissionProgress[]
  gamification: UserGamification | null
  loading: boolean
  error: string | null
}

/**
 * Hook to manage user missions and gamification
 */
export function useMissions(userId: string | undefined) {
  const [missions, setMissions] = useState<MissionProgress[]>([])
  const [gamification, setGamification] = useState<UserGamification | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load missions for current week
   */
  const loadMissions = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get or create gamification profile
      const gamificationData = await getOrCreateUserGamification(userId)
      setGamification(gamificationData)

      // Get missions for user's level
      const weeklyMissions = getWeeklyMissions(gamificationData.level)
      const weekId = getWeekIdentifier()

      // Fetch user missions from Firestore
      const userMissionsQuery = query(
        collection(db, 'user_missions'),
        where('userId', '==', userId),
        where('weekStart', '==', weekId)
      )

      const userMissionsSnap = await getDocs(userMissionsQuery)
      const userMissionsMap = new Map<string, UserMission>()

      userMissionsSnap.forEach(doc => {
        const data = doc.data() as UserMission
        userMissionsMap.set(data.missionId, data)
      })

      // Initialize missions that don't exist yet
      for (const mission of weeklyMissions) {
        if (!userMissionsMap.has(mission.id)) {
          const newUserMission: UserMission = {
            userId,
            missionId: mission.id,
            weekStart: weekId,
            progress: 0,
            completed: false,
            xpAwarded: false,
            createdAt: new Date().toISOString()
          }

          const docRef = doc(collection(db, 'user_missions'))
          await setDoc(docRef, newUserMission)
          userMissionsMap.set(mission.id, newUserMission)
        }
      }

      // Calculate current progress for each mission
      await updateMissionProgress()
    } catch (err) {
      logger.error('[useMissions] Error loading missions:', err as Error)
      setError(err instanceof Error ? err.message : 'Failed to load missions')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Update progress for all missions based on current user activity
   */
  const updateMissionProgress = async () => {
    if (!userId) return

    try {
      const weekId = getWeekIdentifier()
      const weekStart = getCurrentWeek().start

      // Fetch user activity data for the week
      const [meals, weightLogs, recipes] = await Promise.all([
        fetchUserMeals(userId, weekStart),
        fetchUserWeightLogs(userId, weekStart),
        fetchUserRecipes(userId, weekStart)
      ])

      // Get user missions
      const userMissionsQuery = query(
        collection(db, 'user_missions'),
        where('userId', '==', userId),
        where('weekStart', '==', weekId)
      )

      const userMissionsSnap = await getDocs(userMissionsQuery)
      const updatedMissions: MissionProgress[] = []

      for (const docSnap of userMissionsSnap.docs) {
        const userMission = docSnap.data() as UserMission
        const mission = getWeeklyMissions(gamification?.level ?? 1).find(m => m.id === userMission.missionId)

        if (!mission) continue

        // Calculate current progress
        const progress = calculateMissionProgress(mission, meals, weightLogs, recipes, weekStart)
        const completed = isMissionComplete(mission, progress)

        // Update progress in Firestore if changed
        if (progress !== userMission.progress || (completed && !userMission.completed)) {
          const updateData: Partial<UserMission> = {
            progress
          }

          // If just completed, award rewards
          if (completed && !userMission.completed) {
            updateData.completed = true
            updateData.completedAt = new Date().toISOString()

            // Award XP and badge
            await completeMission(userId, mission, docSnap.id)
          }

          await updateDoc(docSnap.ref, updateData)

          updatedMissions.push({
            ...mission,
            userMissionId: docSnap.id,
            missionId: mission.id,
            progress,
            targetProgress: mission.criteria.target,
            completed: updateData.completed ?? userMission.completed,
            status: (updateData.completed ?? userMission.completed) ? 'completed' : 'active',
            completedAt: updateData.completedAt ?? userMission.completedAt,
            expiresAt: undefined,
            xpAwarded: userMission.xpAwarded
          })
        } else {
          updatedMissions.push({
            ...mission,
            userMissionId: docSnap.id,
            missionId: mission.id,
            progress: userMission.progress,
            targetProgress: mission.criteria.target,
            completed: userMission.completed,
            status: userMission.completed ? 'completed' : 'active',
            completedAt: userMission.completedAt,
            expiresAt: undefined,
            xpAwarded: userMission.xpAwarded
          })
        }
      }

      setMissions(updatedMissions)
    } catch (err) {
      logger.error('[useMissions] Error updating mission progress:', err as Error)
    }
  }

  /**
   * Complete a mission and award rewards
   */
  const completeMission = async (userId: string, mission: Mission, userMissionId: string) => {
    try {
      // Award XP
      const { newXP, newLevel, leveledUp } = await awardXP(userId, mission.xpReward, 'mission', mission.id)

      // Award mission badge if exists
      if (mission.badgeReward) {
        const awarded = await awardBadge(userId, mission.badgeReward)
        if (awarded) {
          toast.success(`🎖️ Badge unlocked: ${mission.badgeReward.name}!`, { duration: 5000 })
        }
      }

      // Increment missions completed
      await incrementMissionsCompleted(userId)

      // Check for level badges
      if (leveledUp) {
        const levelBadges = await checkLevelBadges(userId, newLevel)
        levelBadges.forEach(badge => {
          toast.success(`🎖️ Badge unlocked: ${badge.name}!`, { duration: 5000 })
        })
        toast.success(`🎉 Level Up! You're now level ${newLevel}!`, { duration: 5000 })
      }

      // Check for achievement badges
      const achievementBadges = await checkAchievementBadges(userId)
      achievementBadges.forEach(badge => {
        toast.success(`🎖️ Badge unlocked: ${badge.name}!`, { duration: 5000 })
      })

      // Mark XP as awarded
      await updateDoc(doc(db, 'user_missions', userMissionId), {
        xpAwarded: true
      })

      // Update gamification state
      const updatedGamification = await getOrCreateUserGamification(userId)
      setGamification(updatedGamification)

      toast.success(`✅ Mission Complete! +${mission.xpReward} XP`, { duration: 4000 })

      logger.debug('[useMissions] Mission completed:', { title: mission.title })
    } catch (err) {
      logger.error('[useMissions] Error completing mission:', err as Error)
    }
  }

  /**
   * Manually check progress (call after user actions like logging meal)
   */
  const checkProgress = async () => {
    await updateMissionProgress()
  }

  // Load missions on mount
  useEffect(() => {
    loadMissions()
  }, [userId])

  // Fetch gamification data with SWR (15min cache - changes rarely)
  const { data: gamificationData, mutate: refreshGamification } = useSWR(
    userId ? ['gamification', userId] : null,
    async () => {
      const snapshot = await getDoc(doc(db, 'gamification', userId!))
      if (snapshot.exists()) {
        return snapshot.data() as UserGamification
      }
      return null
    },
    {
      revalidateOnFocus: false, // Gamification changes rarely, don't auto-refresh
      revalidateOnReconnect: false,
      dedupingInterval: 15 * 60 * 1000, // 15 minutes
      refreshInterval: 0
    }
  )

  // Update state when SWR data changes
  useEffect(() => {
    if (gamificationData) {
      setGamification(gamificationData)
    }
  }, [gamificationData])

  return {
    missions,
    gamification,
    loading,
    error,
    refreshMissions: loadMissions,
    refreshGamification, // Expose refresh for manual updates (e.g., after level up)
    checkProgress
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch user meals for the week
 */
async function fetchUserMeals(userId: string, weekStart: Date): Promise<MealLog[]> {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const mealsQuery = query(
    collection(db, 'meals'),
    where('userId', '==', userId),
    where('loggedAt', '>=', weekStart.toISOString()),
    where('loggedAt', '<=', weekEnd.toISOString())
  )

  const mealsSnap = await getDocs(mealsQuery)
  return mealsSnap.docs.map(doc => {
    const data = doc.data()
    return {
      mealType: data.mealType,
      loggedAt: data.loggedAt,
      aiAnalysis: data.aiAnalysis
    } as MealLog
  })
}

/**
 * Fetch user weight logs for the week
 */
async function fetchUserWeightLogs(userId: string, weekStart: Date): Promise<WeightLog[]> {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const weightsQuery = query(
    collection(db, 'weight_logs'),
    where('userId', '==', userId),
    where('loggedAt', '>=', weekStart.toISOString()),
    where('loggedAt', '<=', weekEnd.toISOString())
  )

  const weightsSnap = await getDocs(weightsQuery)
  return weightsSnap.docs.map(doc => {
    const data = doc.data()
    return {
      weight: data.weight,
      loggedAt: data.loggedAt
    } as WeightLog
  })
}

/**
 * Fetch user recipe completions for the week
 */
async function fetchUserRecipes(userId: string, weekStart: Date): Promise<RecipeCompletion[]> {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const recipesQuery = query(
    collection(db, 'recipe_completions'),
    where('userId', '==', userId),
    where('completedAt', '>=', weekStart.toISOString()),
    where('completedAt', '<=', weekEnd.toISOString())
  )

  const recipesSnap = await getDocs(recipesQuery)
  return recipesSnap.docs.map(doc => {
    const data = doc.data()
    return {
      recipeId: data.recipeId,
      completedAt: data.completedAt
    } as RecipeCompletion
  })
}
