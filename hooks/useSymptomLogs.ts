/**
 * useSymptomLogs Hook
 * Manage pet symptom tracking and pattern detection
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
import { SymptomLog, SymptomSummary, SymptomPattern, SymptomFrequency, EMERGENCY_SYMPTOMS } from '@/types/pet-symptoms'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { subDays, parseISO, differenceInDays } from 'date-fns'

interface UseSymptomLogsOptions {
  userId: string
  petId: string
  petSpecies?: string
  autoFetch?: boolean
  realtime?: boolean
}

export function useSymptomLogs({ userId, petId, petSpecies, autoFetch = true, realtime = false }: UseSymptomLogsOptions) {
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Fetch symptom logs
  const fetchSymptomLogs = async (days?: number) => {
    setLoading(true)
    setError(null)

    try {
      logger.debug('[useSymptomLogs] Fetching symptom logs', { userId, petId, days })

      const symptomsRef = collection(db, 'users', userId, 'patients', petId, 'symptomLogs')
      let q = query(symptomsRef, orderBy('occurredAt', 'desc'))

      // Filter by date range if specified
      if (days) {
        const startDate = subDays(new Date(), days).toISOString()
        q = query(symptomsRef, where('occurredAt', '>=', startDate), orderBy('occurredAt', 'desc'))
      }

      const snapshot = await getDocs(q)
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SymptomLog[]

      setSymptomLogs(logs)
      logger.debug('[useSymptomLogs] Fetched symptom logs', { count: logs.length })

      return logs
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch symptom logs')
      logger.error('[useSymptomLogs] Error fetching logs', error)
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Create symptom log
  const createSymptomLog = async (data: Omit<SymptomLog, 'id' | 'createdAt' | 'updatedAt' | 'petId'>) => {
    try {
      logger.debug('[useSymptomLogs] Creating symptom log', { petId, symptomType: data.symptomType })

      // Check if emergency symptom
      const isEmergency = petSpecies && EMERGENCY_SYMPTOMS[petSpecies]?.includes(data.symptomType)

      if (isEmergency) {
        toast.error(`⚠️ ${data.symptomName} requires immediate veterinary attention!`, {
          duration: 10000
        })
      }

      const symptomsRef = collection(db, 'users', userId, 'patients', petId, 'symptomLogs')
      const newDocRef = doc(symptomsRef)

      const newLog: Omit<SymptomLog, 'id'> = {
        ...data,
        petId,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      }

      await setDoc(newDocRef, newLog)

      logger.info('[useSymptomLogs] Symptom log created', { id: newDocRef.id })
      toast.success(`${data.symptomName} logged`)

      // Refresh
      await fetchSymptomLogs()

      return { id: newDocRef.id, ...newLog } as SymptomLog
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create symptom log')
      logger.error('[useSymptomLogs] Error creating log', error)
      toast.error('Failed to log symptom')
      throw error
    }
  }

  // Update symptom log
  const updateSymptomLog = async (id: string, updates: Partial<SymptomLog>) => {
    try {
      logger.debug('[useSymptomLogs] Updating symptom log', { id, updates })

      const symptomRef = doc(db, 'users', userId, 'patients', petId, 'symptomLogs', id)

      await updateDoc(symptomRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })

      logger.info('[useSymptomLogs] Symptom log updated', { id })
      toast.success('Symptom log updated')

      // Refresh
      await fetchSymptomLogs()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update symptom log')
      logger.error('[useSymptomLogs] Error updating log', error)
      toast.error('Failed to update log')
      throw error
    }
  }

  // Delete symptom log
  const deleteSymptomLog = async (id: string) => {
    try {
      logger.debug('[useSymptomLogs] Deleting symptom log', { id })

      const symptomRef = doc(db, 'users', userId, 'patients', petId, 'symptomLogs', id)
      await deleteDoc(symptomRef)

      logger.info('[useSymptomLogs] Symptom log deleted', { id })
      toast.success('Symptom log deleted')

      // Refresh
      await fetchSymptomLogs()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete symptom log')
      logger.error('[useSymptomLogs] Error deleting log', error)
      toast.error('Failed to delete log')
      throw error
    }
  }

  // Quick log symptom
  const quickLogSymptom = async (
    symptomType: SymptomLog['symptomType'],
    symptomName: string,
    severity: 'mild' | 'moderate' | 'severe',
    notes?: string
  ) => {
    try {
      const symptomLog: Omit<SymptomLog, 'id' | 'createdAt' | 'updatedAt' | 'petId'> = {
        symptomType,
        symptomName,
        severity,
        occurredAt: new Date().toISOString(),
        notes,
        resolved: false,
        loggedBy: userId
      }

      return await createSymptomLog(symptomLog)
    } catch (err) {
      logger.error('[useSymptomLogs] Error in quick log', err)
      throw err
    }
  }

  // Mark symptom as resolved
  const resolveSymptom = async (id: string, resolutionNotes?: string) => {
    try {
      await updateSymptomLog(id, {
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolutionNotes
      })
    } catch (err) {
      logger.error('[useSymptomLogs] Error resolving symptom', err)
      throw err
    }
  }

  // Get symptom summary
  const getSymptomSummary = (): SymptomSummary => {
    const now = new Date()
    const last7Days = subDays(now, 7)
    const last30Days = subDays(now, 30)

    const symptomsLast7Days = symptomLogs.filter(log =>
      parseISO(log.occurredAt) >= last7Days
    ).length

    const symptomsLast30Days = symptomLogs.filter(log =>
      parseISO(log.occurredAt) >= last30Days
    ).length

    const unresolvedSymptoms = symptomLogs.filter(log => !log.resolved).length

    const urgentSymptoms = symptomLogs.filter(log =>
      !log.resolved && log.severity === 'severe'
    ).length

    // Find most common symptom
    const symptomCounts: Record<string, { type: SymptomLog['symptomType']; name: string; count: number }> = {}

    symptomLogs.forEach(log => {
      if (!symptomCounts[log.symptomType]) {
        symptomCounts[log.symptomType] = {
          type: log.symptomType,
          name: log.symptomName,
          count: 0
        }
      }
      symptomCounts[log.symptomType].count++
    })

    const mostCommon = Object.values(symptomCounts).sort((a, b) => b.count - a.count)[0]

    return {
      totalSymptoms: symptomLogs.length,
      symptomsLast7Days,
      symptomsLast30Days,
      unresolvedSymptoms,
      urgentSymptoms,
      mostCommonSymptom: mostCommon
    }
  }

  // Get symptom patterns (recurring symptoms)
  const getSymptomPatterns = (): SymptomPattern[] => {
    const patterns: Record<string, SymptomPattern> = {}

    symptomLogs.forEach(log => {
      if (!patterns[log.symptomType]) {
        patterns[log.symptomType] = {
          symptomType: log.symptomType,
          occurrenceCount: 0,
          firstOccurrence: log.occurredAt,
          lastOccurrence: log.occurredAt,
          averageFrequency: 0,
          commonTriggers: [],
          escalating: false
        }
      }

      const pattern = patterns[log.symptomType]
      pattern.occurrenceCount++

      if (parseISO(log.occurredAt) < parseISO(pattern.firstOccurrence)) {
        pattern.firstOccurrence = log.occurredAt
      }

      if (parseISO(log.occurredAt) > parseISO(pattern.lastOccurrence)) {
        pattern.lastOccurrence = log.occurredAt
      }

      if (log.triggerSuspected) {
        pattern.commonTriggers.push(log.triggerSuspected)
      }
    })

    // Calculate average frequency and detect escalation
    Object.values(patterns).forEach(pattern => {
      if (pattern.occurrenceCount > 1) {
        const daysBetween = differenceInDays(
          parseISO(pattern.lastOccurrence),
          parseISO(pattern.firstOccurrence)
        )
        pattern.averageFrequency = daysBetween / (pattern.occurrenceCount - 1)
      }

      // Check for escalation (severity increasing over time)
      const symptomLogs = symptomLogs
        .filter(log => log.symptomType === pattern.symptomType)
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))

      if (symptomLogs.length >= 2) {
        const severityMap = { mild: 1, moderate: 2, severe: 3 }
        const recent = symptomLogs.slice(-3)
        const older = symptomLogs.slice(0, 3)

        const recentAvg = recent.reduce((sum, log) => sum + severityMap[log.severity], 0) / recent.length
        const olderAvg = older.reduce((sum, log) => sum + severityMap[log.severity], 0) / older.length

        pattern.escalating = recentAvg > olderAvg
      }
    })

    return Object.values(patterns).filter(pattern => pattern.occurrenceCount >= 2)
  }

  // Get symptom frequency (for charts)
  const getSymptomFrequency = (days: number = 30): SymptomFrequency[] => {
    const startDate = subDays(new Date(), days)
    const recentLogs = symptomLogs.filter(log =>
      parseISO(log.occurredAt) >= startDate
    )

    const frequency: Record<string, SymptomFrequency> = {}

    recentLogs.forEach(log => {
      if (!frequency[log.symptomType]) {
        frequency[log.symptomType] = {
          symptomType: log.symptomType,
          symptomName: log.symptomName,
          count: 0,
          dates: [],
          averageSeverity: 0
        }
      }

      frequency[log.symptomType].count++
      frequency[log.symptomType].dates.push(log.occurredAt)
    })

    // Calculate average severity
    Object.entries(frequency).forEach(([symptomType, data]) => {
      const logsOfType = recentLogs.filter(log => log.symptomType === symptomType)
      const severityMap = { mild: 1, moderate: 2, severe: 3 }
      const totalSeverity = logsOfType.reduce((sum, log) => sum + severityMap[log.severity], 0)
      data.averageSeverity = totalSeverity / logsOfType.length
    })

    return Object.values(frequency).sort((a, b) => b.count - a.count)
  }

  // Get unresolved symptoms
  const getUnresolvedSymptoms = (): SymptomLog[] => {
    return symptomLogs.filter(log => !log.resolved)
  }

  // Get severe symptoms
  const getSevereSymptoms = (): SymptomLog[] => {
    return symptomLogs.filter(log => log.severity === 'severe' && !log.resolved)
  }

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && userId && petId) {
      fetchSymptomLogs()
    }
  }, [userId, petId, autoFetch])

  // Real-time listener
  useEffect(() => {
    if (!realtime || !userId || !petId) return

    logger.debug('[useSymptomLogs] Setting up real-time listener')

    const symptomsRef = collection(db, 'users', userId, 'patients', petId, 'symptomLogs')
    const q = query(symptomsRef, orderBy('occurredAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SymptomLog[]

        setSymptomLogs(logs)
        logger.debug('[useSymptomLogs] Real-time update', { count: logs.length })
      },
      (err) => {
        logger.error('[useSymptomLogs] Real-time listener error', err)
        setError(err instanceof Error ? err : new Error('Real-time listener failed'))
      }
    )

    return () => {
      logger.debug('[useSymptomLogs] Cleaning up real-time listener')
      unsubscribe()
    }
  }, [userId, petId, realtime])

  return {
    symptomLogs,
    loading,
    error,
    fetchSymptomLogs,
    createSymptomLog,
    updateSymptomLog,
    deleteSymptomLog,
    quickLogSymptom,
    resolveSymptom,
    getSymptomSummary,
    getSymptomPatterns,
    getSymptomFrequency,
    getUnresolvedSymptoms,
    getSevereSymptoms,
    refetch: fetchSymptomLogs
  }
}
