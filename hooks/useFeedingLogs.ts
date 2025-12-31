/**
 * useFeedingLogs Hook
 * Manage daily feeding logs (compliance tracking)
 */

'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  onSnapshot,
  serverTimestamp,
  limit
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { FeedingLog, QuickFeedingStatus } from '@/types/pet-feeding'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

interface UseFeedingLogsOptions {
  userId: string
  petId: string
  date?: Date // Filter by specific date
  autoFetch?: boolean
  realtime?: boolean
}

export function useFeedingLogs({ userId, petId, date, autoFetch = true, realtime = false }: UseFeedingLogsOptions) {
  const [feedingLogs, setFeedingLogs] = useState<FeedingLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch feeding logs
  const fetchFeedingLogs = async (filterDate?: Date) => {
    setLoading(true)
    setError(null)

    try {
      const targetDate = filterDate || date || new Date()
      const dateStart = startOfDay(targetDate).toISOString()
      const dateEnd = endOfDay(targetDate).toISOString()

      logger.debug('[useFeedingLogs] Fetching feeding logs', { userId, petId, dateStart, dateEnd })

      const logsRef = collection(db, 'users', userId, 'patients', petId, 'feedingLogs')
      const q = query(
        logsRef,
        where('scheduledFor', '>=', dateStart),
        where('scheduledFor', '<=', dateEnd),
        orderBy('scheduledFor', 'asc')
      )

      const snapshot = await getDocs(q)
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedingLog[]

      setFeedingLogs(logs)
      logger.debug('[useFeedingLogs] Fetched feeding logs', { count: logs.length })

      return logs
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch feeding logs')
      logger.error('[useFeedingLogs] Error fetching logs', error)
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Create feeding log
  const createFeedingLog = async (data: Omit<FeedingLog, 'id' | 'createdAt' | 'updatedAt' | 'petId'>) => {
    try {
      logger.debug('[useFeedingLogs] Creating feeding log', { petId, scheduledFor: data.scheduledFor })

      const logsRef = collection(db, 'users', userId, 'patients', petId, 'feedingLogs')
      const newDocRef = doc(logsRef)

      const newLog: Omit<FeedingLog, 'id'> = {
        ...data,
        petId,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      }

      await setDoc(newDocRef, newLog)

      logger.info('[useFeedingLogs] Feeding log created', { id: newDocRef.id })
      toast.success('Feeding logged!')

      // Refresh
      await fetchFeedingLogs()

      return { id: newDocRef.id, ...newLog } as FeedingLog
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create feeding log')
      logger.error('[useFeedingLogs] Error creating log', error)
      toast.error('Failed to log feeding')
      throw error
    }
  }

  // Quick log feeding (mark as fed with current time)
  const quickLogFeeding = async (
    scheduledFor: string,
    foodProfileId: string,
    portionSize: number,
    portionUnit: string,
    appetiteLevel: 'ate-all' | 'ate-most' | 'ate-some' | 'ate-little' | 'refused',
    fedBy: string,
    fedByName?: string
  ) => {
    try {
      const now = new Date().toISOString()
      const scheduledDate = format(new Date(scheduledFor), 'yyyy-MM-dd')
      const scheduledTime = format(new Date(scheduledFor), 'HH:mm')

      const feedingLog: Omit<FeedingLog, 'id' | 'createdAt' | 'updatedAt' | 'petId'> = {
        scheduledFor,
        scheduledDate,
        scheduledTime,
        fedAt: now,
        status: 'fed',
        appetiteLevel,
        foodProfileId,
        portionSize,
        portionUnit,
        fedBy,
        fedByName,
        wasTreat: false,
        wasTableFood: false,
        medicationHidden: false,
        vomitedAfter: false,
        diarrheaAfter: false
      }

      return await createFeedingLog(feedingLog)
    } catch (err) {
      logger.error('[useFeedingLogs] Error in quick log', err)
      throw err
    }
  }

  // Update feeding log
  const updateFeedingLog = async (id: string, updates: Partial<FeedingLog>) => {
    try {
      logger.debug('[useFeedingLogs] Updating feeding log', { id, updates })

      const logRef = doc(db, 'users', userId, 'patients', petId, 'feedingLogs', id)

      await updateDoc(logRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })

      logger.info('[useFeedingLogs] Feeding log updated', { id })
      toast.success('Feeding log updated')

      // Refresh
      await fetchFeedingLogs()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update feeding log')
      logger.error('[useFeedingLogs] Error updating log', error)
      toast.error('Failed to update log')
      throw error
    }
  }

  // Delete feeding log
  const deleteFeedingLog = async (id: string) => {
    try {
      logger.debug('[useFeedingLogs] Deleting feeding log', { id })

      const logRef = doc(db, 'users', userId, 'patients', petId, 'feedingLogs', id)
      await deleteDoc(logRef)

      logger.info('[useFeedingLogs] Feeding log deleted', { id })
      toast.success('Feeding log deleted')

      // Refresh
      await fetchFeedingLogs()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete feeding log')
      logger.error('[useFeedingLogs] Error deleting log', error)
      toast.error('Failed to delete log')
      throw error
    }
  }

  // Get today's feeding status (for quick view)
  const getTodayFeedingStatus = async (): Promise<QuickFeedingStatus[]> => {
    try {
      const today = new Date()
      const dateStart = startOfDay(today).toISOString()
      const dateEnd = endOfDay(today).toISOString()

      const logsRef = collection(db, 'users', userId, 'patients', petId, 'feedingLogs')
      const q = query(
        logsRef,
        where('scheduledFor', '>=', dateStart),
        where('scheduledFor', '<=', dateEnd),
        orderBy('scheduledFor', 'asc')
      )

      const snapshot = await getDocs(q)
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedingLog[]

      const now = new Date()

      return logs.map(log => {
        const scheduledTime = new Date(log.scheduledFor)
        const isPast = scheduledTime < now

        return {
          scheduledFor: log.scheduledFor,
          scheduledTime: log.scheduledTime,
          status: log.status,
          isPast,
          canLogNow: isPast && log.status === 'pending',
          foodName: '', // Will be populated by component from foodProfileId
          portionSize: log.portionSize,
          portionUnit: log.portionUnit
        }
      })
    } catch (err) {
      logger.error('[useFeedingLogs] Error getting today status', err)
      return []
    }
  }

  // Get appetite trend (last N days)
  const getAppetiteTrend = async (days: number = 7): Promise<{ date: string; avgAppetite: number; mealsCount: number }[]> => {
    try {
      const endDate = new Date()
      const startDate = subDays(endDate, days)

      const logsRef = collection(db, 'users', userId, 'patients', petId, 'feedingLogs')
      const q = query(
        logsRef,
        where('scheduledFor', '>=', startDate.toISOString()),
        where('scheduledFor', '<=', endDate.toISOString())
      )

      const snapshot = await getDocs(q)
      // Filter for 'fed' status in memory to avoid compound index
      const logs = snapshot.docs
        .map(doc => doc.data() as FeedingLog)
        .filter(log => log.status === 'fed')
        .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))

      // Group by date
      const byDate: Record<string, { appetites: number[]; count: number }> = {}

      logs.forEach(log => {
        if (!log.appetiteLevel) return

        const date = log.scheduledDate

        // Convert appetite level to percentage
        const appetiteMap: Record<string, number> = {
          'ate-all': 100,
          'ate-most': 75,
          'ate-some': 50,
          'ate-little': 25,
          'refused': 0
        }

        const appetiteValue = appetiteMap[log.appetiteLevel] || 0

        if (!byDate[date]) {
          byDate[date] = { appetites: [], count: 0 }
        }

        byDate[date].appetites.push(appetiteValue)
        byDate[date].count++
      })

      // Calculate averages
      return Object.entries(byDate).map(([date, data]) => ({
        date,
        avgAppetite: data.appetites.reduce((a, b) => a + b, 0) / data.appetites.length,
        mealsCount: data.count
      })).sort((a, b) => a.date.localeCompare(b.date))
    } catch (err) {
      logger.error('[useFeedingLogs] Error getting appetite trend', err)
      return []
    }
  }

  // Calculate compliance rate
  const getComplianceRate = async (days: number = 7): Promise<{ rate: number; totalMeals: number; fedMeals: number }> => {
    try {
      const endDate = new Date()
      const startDate = subDays(endDate, days)

      const logsRef = collection(db, 'users', userId, 'patients', petId, 'feedingLogs')
      const q = query(
        logsRef,
        where('scheduledFor', '>=', startDate.toISOString()),
        where('scheduledFor', '<=', endDate.toISOString()),
        orderBy('scheduledFor', 'asc')
      )

      const snapshot = await getDocs(q)
      const logs = snapshot.docs.map(doc => doc.data()) as FeedingLog[]

      const totalMeals = logs.length
      const fedMeals = logs.filter(log => log.status === 'fed').length

      const rate = totalMeals > 0 ? (fedMeals / totalMeals) * 100 : 0

      return { rate, totalMeals, fedMeals }
    } catch (err) {
      logger.error('[useFeedingLogs] Error getting compliance rate', err)
      return { rate: 0, totalMeals: 0, fedMeals: 0 }
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && userId && petId) {
      fetchFeedingLogs()
    }
  }, [userId, petId, date, autoFetch])

  // Real-time listener
  useEffect(() => {
    if (!realtime || !userId || !petId) return

    const targetDate = date || new Date()
    // Use date string to prevent infinite loops (Date objects always new)
    const dateKey = targetDate.toDateString()
    const dateStart = startOfDay(targetDate).toISOString()
    const dateEnd = endOfDay(targetDate).toISOString()

    logger.debug('[useFeedingLogs] Setting up real-time listener', { dateKey })

    const logsRef = collection(db, 'users', userId, 'patients', petId, 'feedingLogs')
    const q = query(
      logsRef,
      where('scheduledFor', '>=', dateStart),
      where('scheduledFor', '<=', dateEnd)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Sort in memory to avoid compound index requirement
        const logs = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }) as FeedingLog)
          .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))

        setFeedingLogs(logs)
        logger.debug('[useFeedingLogs] Real-time update', { count: logs.length })
      },
      (err) => {
        logger.error('[useFeedingLogs] Real-time listener error', err)
        setError(err instanceof Error ? err : new Error('Real-time listener failed'))
      }
    )

    return () => {
      logger.debug('[useFeedingLogs] Cleaning up real-time listener')
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, petId, date?.toDateString(), realtime])

  return {
    feedingLogs,
    loading,
    error,
    fetchFeedingLogs,
    createFeedingLog,
    quickLogFeeding,
    updateFeedingLog,
    deleteFeedingLog,
    getTodayFeedingStatus,
    getAppetiteTrend,
    getComplianceRate,
    refetch: fetchFeedingLogs
  }
}
