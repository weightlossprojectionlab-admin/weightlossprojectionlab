/**
 * useParasitePrevention Hook
 * Manage monthly flea/tick/heartworm medication tracking
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
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ParasitePreventionRecord, ParasitePreventionStatus } from '@/types/pet-vaccinations'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { differenceInDays, addMonths, addDays, isPast, parseISO, startOfMonth, endOfMonth } from 'date-fns'

interface UseParasitePreventionOptions {
  userId: string
  petId: string
  autoFetch?: boolean
  realtime?: boolean
}

export function useParasitePrevention({ userId, petId, autoFetch = true, realtime = false }: UseParasitePreventionOptions) {
  const [preventionRecords, setPreventionRecords] = useState<ParasitePreventionRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch prevention records
  const fetchPreventionRecords = async () => {
    setLoading(true)
    setError(null)

    try {
      logger.debug('[useParasitePrevention] Fetching prevention records', { userId, petId })

      const preventionRef = collection(db, 'users', userId, 'patients', petId, 'parasitePrevention')
      const q = query(preventionRef, orderBy('administeredDate', 'desc'))

      const snapshot = await getDocs(q)
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ParasitePreventionRecord[]

      // Update status for each record
      const updatedRecords = records.map(record => ({
        ...record,
        status: calculatePreventionStatus(record)
      }))

      setPreventionRecords(updatedRecords)
      logger.debug('[useParasitePrevention] Fetched prevention records', { count: updatedRecords.length })

      return updatedRecords
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch prevention records')
      logger.error('[useParasitePrevention] Error fetching records', error)
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Create prevention record
  const createPreventionRecord = async (data: Omit<ParasitePreventionRecord, 'id' | 'createdAt' | 'updatedAt' | 'petId' | 'status' | 'reminderSent'>) => {
    try {
      logger.debug('[useParasitePrevention] Creating prevention record', { petId, productName: data.productName })

      const preventionRef = collection(db, 'users', userId, 'patients', petId, 'parasitePrevention')
      const newDocRef = doc(preventionRef)

      const newRecord: Omit<ParasitePreventionRecord, 'id'> = {
        ...data,
        petId,
        createdBy: userId,
        status: 'given',
        reminderSent: false,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      }

      await setDoc(newDocRef, newRecord)

      logger.info('[useParasitePrevention] Prevention record created', { id: newDocRef.id })
      toast.success(`${data.productName} administered!`)

      // Refresh
      await fetchPreventionRecords()

      return { id: newDocRef.id, ...newRecord } as ParasitePreventionRecord
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create prevention record')
      logger.error('[useParasitePrevention] Error creating record', error)
      toast.error('Failed to record prevention')
      throw error
    }
  }

  // Update prevention record
  const updatePreventionRecord = async (id: string, updates: Partial<ParasitePreventionRecord>) => {
    try {
      logger.debug('[useParasitePrevention] Updating prevention record', { id, updates })

      const preventionRef = doc(db, 'users', userId, 'patients', petId, 'parasitePrevention', id)

      await updateDoc(preventionRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })

      logger.info('[useParasitePrevention] Prevention record updated', { id })
      toast.success('Prevention record updated')

      // Refresh
      await fetchPreventionRecords()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update prevention record')
      logger.error('[useParasitePrevention] Error updating record', error)
      toast.error('Failed to update record')
      throw error
    }
  }

  // Delete prevention record
  const deletePreventionRecord = async (id: string) => {
    try {
      logger.debug('[useParasitePrevention] Deleting prevention record', { id })

      const preventionRef = doc(db, 'users', userId, 'patients', petId, 'parasitePrevention', id)
      await deleteDoc(preventionRef)

      logger.info('[useParasitePrevention] Prevention record deleted', { id })
      toast.success('Prevention record deleted')

      // Refresh
      await fetchPreventionRecords()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete prevention record')
      logger.error('[useParasitePrevention] Error deleting record', error)
      toast.error('Failed to delete record')
      throw error
    }
  }

  // Calculate prevention status
  const calculatePreventionStatus = (record: ParasitePreventionRecord): 'given' | 'due-soon' | 'overdue' | 'skipped' => {
    const now = new Date()
    const nextDueDate = parseISO(record.nextDueDate)

    const daysUntilDue = differenceInDays(nextDueDate, now)

    if (daysUntilDue < 0) {
      return 'overdue'
    } else if (daysUntilDue <= 7) {
      return 'due-soon'
    }

    return 'given'
  }

  // Get prevention status summary
  const getPreventionStatus = (): ParasitePreventionStatus => {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    // Check if given this month
    const givenThisMonth = preventionRecords.some(record => {
      const adminDate = parseISO(record.administeredDate)
      return adminDate >= monthStart && adminDate <= monthEnd
    })

    // Count overdue
    const overdueCount = preventionRecords.filter(record => record.status === 'overdue').length

    // Find next due
    const upcomingRecords = preventionRecords
      .filter(record => record.status === 'due-soon' || record.status === 'given')
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))

    return {
      totalDoses: preventionRecords.length,
      givenThisMonth,
      nextDueDate: upcomingRecords[0]?.nextDueDate,
      nextDueProduct: upcomingRecords[0]?.productName,
      overdueCount
    }
  }

  // Get overdue prevention
  const getOverduePrevention = (): ParasitePreventionRecord[] => {
    return preventionRecords.filter(record => record.status === 'overdue')
  }

  // Get due soon prevention (within 7 days)
  const getDueSoonPrevention = (): ParasitePreventionRecord[] => {
    return preventionRecords.filter(record => record.status === 'due-soon')
  }

  // Quick log prevention dose
  const quickLogPrevention = async (
    productName: string,
    preventionType: ParasitePreventionRecord['preventionType'],
    dosage: string,
    frequency: ParasitePreventionRecord['frequency'] = 'monthly'
  ) => {
    try {
      const now = new Date()
      const nextDueDate = getNextDueDate(now, frequency)

      const record: Omit<ParasitePreventionRecord, 'id' | 'createdAt' | 'updatedAt' | 'petId' | 'status' | 'reminderSent'> = {
        productName,
        preventionType,
        dosage,
        administeredDate: now.toISOString(),
        administeredBy: userId,
        administeredByName: 'You',
        nextDueDate: nextDueDate.toISOString(),
        frequency,
        createdBy: userId
      }

      return await createPreventionRecord(record)
    } catch (err) {
      logger.error('[useParasitePrevention] Error in quick log', err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }

  // Calculate next due date based on frequency
  const getNextDueDate = (fromDate: Date, frequency: ParasitePreventionRecord['frequency']): Date => {
    switch (frequency) {
      case 'monthly':
        return addMonths(fromDate, 1)
      case 'quarterly':
        return addMonths(fromDate, 3)
      case '6-months':
        return addMonths(fromDate, 6)
      case 'yearly':
        return addMonths(fromDate, 12)
      default:
        return addMonths(fromDate, 1)
    }
  }

  // Get prevention history
  const getPreventionHistory = async (): Promise<ParasitePreventionRecord[]> => {
    try {
      const preventionRef = collection(db, 'users', userId, 'patients', petId, 'parasitePrevention')
      const q = query(preventionRef, orderBy('administeredDate', 'asc'))

      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ParasitePreventionRecord[]
    } catch (err) {
      logger.error('[useParasitePrevention] Error getting prevention history', err instanceof Error ? err : new Error(String(err)))
      return []
    }
  }

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && userId && petId) {
      fetchPreventionRecords()
    }
  }, [userId, petId, autoFetch])

  // Real-time listener
  useEffect(() => {
    if (!realtime || !userId || !petId) return

    logger.debug('[useParasitePrevention] Setting up real-time listener')

    const preventionRef = collection(db, 'users', userId, 'patients', petId, 'parasitePrevention')
    const q = query(preventionRef, orderBy('administeredDate', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ParasitePreventionRecord[]

        // Update status for each record
        const updatedRecords = records.map(record => ({
          ...record,
          status: calculatePreventionStatus(record)
        }))

        setPreventionRecords(updatedRecords)
        logger.debug('[useParasitePrevention] Real-time update', { count: updatedRecords.length })
      },
      (err) => {
        logger.error('[useParasitePrevention] Real-time listener error', err instanceof Error ? err : new Error(String(err)))
        setError(err instanceof Error ? err : new Error('Real-time listener failed'))
      }
    )

    return () => {
      logger.debug('[useParasitePrevention] Cleaning up real-time listener')
      unsubscribe()
    }
  }, [userId, petId, realtime])

  return {
    preventionRecords,
    loading,
    error,
    fetchPreventionRecords,
    createPreventionRecord,
    updatePreventionRecord,
    deletePreventionRecord,
    quickLogPrevention,
    getPreventionStatus,
    getOverduePrevention,
    getDueSoonPrevention,
    getPreventionHistory,
    refetch: fetchPreventionRecords
  }
}
