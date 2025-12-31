/**
 * useFeedingSchedule Hook
 * Manage pet feeding schedule (when and how much to feed)
 */

'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  onSnapshot,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { FeedingSchedule } from '@/types/pet-feeding'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

interface UseFeedingScheduleOptions {
  userId: string
  petId: string
  autoFetch?: boolean
  realtime?: boolean
}

export function useFeedingSchedule({ userId, petId, autoFetch = true, realtime = false }: UseFeedingScheduleOptions) {
  const [schedule, setSchedule] = useState<FeedingSchedule | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch active feeding schedule
  const fetchSchedule = async () => {
    setLoading(true)
    setError(null)

    try {
      logger.debug('[useFeedingSchedule] Fetching feeding schedule', { userId, petId })

      const schedulesRef = collection(db, 'users', userId, 'patients', petId, 'feedingSchedule')
      const q = query(
        schedulesRef,
        where('isActive', '==', true),
        limit(1)
      )

      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        logger.debug('[useFeedingSchedule] No active schedule found')
        setSchedule(null)
        return null
      }

      const scheduleData = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as FeedingSchedule

      setSchedule(scheduleData)
      logger.debug('[useFeedingSchedule] Fetched schedule', { id: scheduleData.id })

      return scheduleData
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch feeding schedule')
      logger.error('[useFeedingSchedule] Error fetching schedule', error)
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Create feeding schedule
  const createSchedule = async (data: Omit<FeedingSchedule, 'id' | 'createdAt' | 'updatedAt' | 'petId' | 'createdBy' | 'isActive' | 'startedAt'>) => {
    try {
      logger.debug('[useFeedingSchedule] Creating feeding schedule', { petId })

      // Deactivate any existing active schedules
      await deactivateAllSchedules()

      const schedulesRef = collection(db, 'users', userId, 'patients', petId, 'feedingSchedule')
      const newDocRef = doc(schedulesRef)

      const newSchedule: Omit<FeedingSchedule, 'id'> = {
        ...data,
        petId,
        isActive: true,
        startedAt: new Date().toISOString(),
        createdBy: userId,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      }

      await setDoc(newDocRef, newSchedule)

      logger.info('[useFeedingSchedule] Schedule created', { id: newDocRef.id })
      toast.success('Feeding schedule created!')

      // Refresh
      await fetchSchedule()

      return { id: newDocRef.id, ...newSchedule } as FeedingSchedule
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create feeding schedule')
      logger.error('[useFeedingSchedule] Error creating schedule', error)
      toast.error('Failed to create schedule')
      throw error
    }
  }

  // Update feeding schedule
  const updateSchedule = async (id: string, updates: Partial<FeedingSchedule>) => {
    try {
      logger.debug('[useFeedingSchedule] Updating feeding schedule', { id, updates })

      const scheduleRef = doc(db, 'users', userId, 'patients', petId, 'feedingSchedule', id)

      await updateDoc(scheduleRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })

      logger.info('[useFeedingSchedule] Schedule updated', { id })
      toast.success('Feeding schedule updated')

      // Refresh
      await fetchSchedule()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update feeding schedule')
      logger.error('[useFeedingSchedule] Error updating schedule', error)
      toast.error('Failed to update schedule')
      throw error
    }
  }

  // Delete feeding schedule
  const deleteSchedule = async (id: string) => {
    try {
      logger.debug('[useFeedingSchedule] Deleting feeding schedule', { id })

      const scheduleRef = doc(db, 'users', userId, 'patients', petId, 'feedingSchedule', id)
      await deleteDoc(scheduleRef)

      logger.info('[useFeedingSchedule] Schedule deleted', { id })
      toast.success('Feeding schedule deleted')

      setSchedule(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete feeding schedule')
      logger.error('[useFeedingSchedule] Error deleting schedule', error)
      toast.error('Failed to delete schedule')
      throw error
    }
  }

  // Deactivate current schedule (when creating new one)
  const deactivateAllSchedules = async () => {
    try {
      const schedulesRef = collection(db, 'users', userId, 'patients', petId, 'feedingSchedule')
      const activeQuery = query(schedulesRef, where('isActive', '==', true))
      const activeSchedules = await getDocs(activeQuery)

      const batch: Promise<void>[] = []

      activeSchedules.docs.forEach(doc => {
        batch.push(
          updateDoc(doc.ref, {
            isActive: false,
            endedAt: new Date().toISOString(),
            updatedAt: serverTimestamp()
          })
        )
      })

      await Promise.all(batch)

      logger.debug('[useFeedingSchedule] Deactivated all schedules', { count: batch.length })
    } catch (err) {
      logger.error('[useFeedingSchedule] Error deactivating schedules', err)
      throw err
    }
  }

  // Helper: Get next scheduled feeding time
  const getNextFeedingTime = (): { time: string; isPast: boolean } | null => {
    if (!schedule) return null

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeMinutes = currentHour * 60 + currentMinute

    // Find next feeding time
    const sortedTimes = [...schedule.feedingTimes].sort()

    for (const time of sortedTimes) {
      const [hour, minute] = time.split(':').map(Number)
      const feedingTimeMinutes = hour * 60 + minute

      if (feedingTimeMinutes > currentTimeMinutes) {
        return { time, isPast: false }
      }
    }

    // If no future time today, return first time tomorrow
    return { time: sortedTimes[0], isPast: false }
  }

  // Helper: Calculate daily calories
  const calculateDailyCalories = async (): Promise<number> => {
    if (!schedule) return 0

    try {
      // Get primary food profile
      const foodRef = doc(db, 'users', userId, 'patients', petId, 'foodProfiles', schedule.primaryFoodId)
      const foodSnap = await getDocs(query(collection(db, 'users', userId, 'patients', petId, 'foodProfiles'), where('__name__', '==', schedule.primaryFoodId)))

      if (foodSnap.empty) return 0

      const food = foodSnap.docs[0].data()
      const caloriesPerServing = food.caloriesPerServing || 0
      const servingSize = food.servingSize || 1

      // Calculate servings per day
      const mealsPerDay = schedule.feedingTimes.length
      const servingsPerMeal = schedule.defaultPortionSize / servingSize
      const totalServingsPerDay = servingsPerMeal * mealsPerDay

      return caloriesPerServing * totalServingsPerDay
    } catch (err) {
      logger.error('[useFeedingSchedule] Error calculating daily calories', err)
      return 0
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && userId && petId) {
      fetchSchedule()
    }
  }, [userId, petId, autoFetch])

  // Real-time listener
  useEffect(() => {
    if (!realtime || !userId || !petId) return

    logger.debug('[useFeedingSchedule] Setting up real-time listener')

    const schedulesRef = collection(db, 'users', userId, 'patients', petId, 'feedingSchedule')
    const q = query(
      schedulesRef,
      where('isActive', '==', true),
      limit(1)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setSchedule(null)
          logger.debug('[useFeedingSchedule] Real-time: No active schedule')
          return
        }

        const scheduleData = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data()
        } as FeedingSchedule

        setSchedule(scheduleData)
        logger.debug('[useFeedingSchedule] Real-time update', { id: scheduleData.id })
      },
      (err) => {
        logger.error('[useFeedingSchedule] Real-time listener error', err)
        setError(err instanceof Error ? err : new Error('Real-time listener failed'))
      }
    )

    return () => {
      logger.debug('[useFeedingSchedule] Cleaning up real-time listener')
      unsubscribe()
    }
  }, [userId, petId, realtime])

  return {
    schedule,
    loading,
    error,
    fetchSchedule,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    getNextFeedingTime,
    calculateDailyCalories,
    refetch: fetchSchedule
  }
}
