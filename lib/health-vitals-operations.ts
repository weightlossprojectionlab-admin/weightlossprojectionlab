/**
 * Firebase Operations for Health Vitals Tracking
 *
 * HIPAA COMPLIANCE NOTICE:
 * This module handles Protected Health Information (PHI).
 * - All data is encrypted in transit (HTTPS) and at rest (Firebase)
 * - Access is restricted by Firestore security rules
 * - TODO: Implement audit logging before production
 * - TODO: Get legal review for HIPAA compliance
 */

import { collection, addDoc, query, where, orderBy, limit as firestoreLimit, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { db, auth } from './firebase'
import type { BloodSugarLog, BloodPressureLog, ExerciseLog } from '@/types'
import { logger } from './logger'

/**
 * Require authentication for all operations
 */
function requireAuth(): string {
  const user = auth.currentUser
  if (!user) {
    throw new Error('User must be authenticated to perform this operation')
  }
  return user.uid
}

// ============================================================================
// BLOOD SUGAR OPERATIONS
// ============================================================================

export const bloodSugarOperations = {
  /**
   * Create a new blood sugar log entry
   */
  async createLog(logData: Omit<BloodSugarLog, 'id' | 'userId'>): Promise<string> {
    try {
      const userId = requireAuth()

      const newLog = {
        ...logData,
        userId,
        loggedAt: Timestamp.fromDate(logData.loggedAt),
        dataSource: logData.dataSource || 'manual'
      }

      const docRef = await addDoc(collection(db, 'blood-sugar-logs'), newLog)

      logger.info('[Blood Sugar] Log created', { userId, logId: docRef.id, glucoseLevel: logData.glucoseLevel })

      return docRef.id
    } catch (error) {
      logger.error('[Blood Sugar] Failed to create log', error as Error)
      throw error
    }
  },

  /**
   * Get user's blood sugar logs (most recent first)
   */
  async getUserLogs(limitCount: number = 30): Promise<BloodSugarLog[]> {
    try {
      const userId = requireAuth()

      const q = query(
        collection(db, 'blood-sugar-logs'),
        where('userId', '==', userId),
        orderBy('loggedAt', 'desc'),
        firestoreLimit(limitCount)
      )

      const snapshot = await getDocs(q)
      const logs: BloodSugarLog[] = []

      snapshot.forEach(doc => {
        const data = doc.data()
        logs.push({
          id: doc.id,
          userId: data.userId,
          glucoseLevel: data.glucoseLevel,
          measurementType: data.measurementType,
          mealContext: data.mealContext,
          loggedAt: data.loggedAt.toDate(),
          dataSource: data.dataSource,
          deviceId: data.deviceId,
          notes: data.notes
        })
      })

      return logs
    } catch (error) {
      logger.error('[Blood Sugar] Failed to get logs', error as Error)
      throw error
    }
  },

  /**
   * Get logs within a date range
   */
  async getLogsByDateRange(startDate: Date, endDate: Date): Promise<BloodSugarLog[]> {
    try {
      const userId = requireAuth()

      const q = query(
        collection(db, 'blood-sugar-logs'),
        where('userId', '==', userId),
        where('loggedAt', '>=', Timestamp.fromDate(startDate)),
        where('loggedAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('loggedAt', 'desc')
      )

      const snapshot = await getDocs(q)
      const logs: BloodSugarLog[] = []

      snapshot.forEach(doc => {
        const data = doc.data()
        logs.push({
          id: doc.id,
          userId: data.userId,
          glucoseLevel: data.glucoseLevel,
          measurementType: data.measurementType,
          mealContext: data.mealContext,
          loggedAt: data.loggedAt.toDate(),
          dataSource: data.dataSource,
          deviceId: data.deviceId,
          notes: data.notes
        })
      })

      return logs
    } catch (error) {
      logger.error('[Blood Sugar] Failed to get logs by date range', error as Error)
      throw error
    }
  },

  /**
   * Delete a blood sugar log
   */
  async deleteLog(logId: string): Promise<void> {
    try {
      const userId = requireAuth()

      await deleteDoc(doc(db, 'blood-sugar-logs', logId))

      logger.info('[Blood Sugar] Log deleted', { userId, logId })
    } catch (error) {
      logger.error('[Blood Sugar] Failed to delete log', error as Error)
      throw error
    }
  }
}

// ============================================================================
// BLOOD PRESSURE OPERATIONS
// ============================================================================

export const bloodPressureOperations = {
  /**
   * Create a new blood pressure log entry
   */
  async createLog(logData: Omit<BloodPressureLog, 'id' | 'userId'>): Promise<string> {
    try {
      const userId = requireAuth()

      const newLog = {
        ...logData,
        userId,
        loggedAt: Timestamp.fromDate(logData.loggedAt),
        dataSource: logData.dataSource || 'manual'
      }

      const docRef = await addDoc(collection(db, 'blood-pressure-logs'), newLog)

      logger.info('[Blood Pressure] Log created', {
        userId,
        logId: docRef.id,
        systolic: logData.systolic,
        diastolic: logData.diastolic
      })

      return docRef.id
    } catch (error) {
      logger.error('[Blood Pressure] Failed to create log', error as Error)
      throw error
    }
  },

  /**
   * Get user's blood pressure logs (most recent first)
   */
  async getUserLogs(limitCount: number = 30): Promise<BloodPressureLog[]> {
    try {
      const userId = requireAuth()

      const q = query(
        collection(db, 'blood-pressure-logs'),
        where('userId', '==', userId),
        orderBy('loggedAt', 'desc'),
        firestoreLimit(limitCount)
      )

      const snapshot = await getDocs(q)
      const logs: BloodPressureLog[] = []

      snapshot.forEach(doc => {
        const data = doc.data()
        logs.push({
          id: doc.id,
          userId: data.userId,
          systolic: data.systolic,
          diastolic: data.diastolic,
          heartRate: data.heartRate,
          measurementContext: data.measurementContext,
          loggedAt: data.loggedAt.toDate(),
          dataSource: data.dataSource,
          deviceId: data.deviceId,
          notes: data.notes
        })
      })

      return logs
    } catch (error) {
      logger.error('[Blood Pressure] Failed to get logs', error as Error)
      throw error
    }
  },

  /**
   * Get logs within a date range
   */
  async getLogsByDateRange(startDate: Date, endDate: Date): Promise<BloodPressureLog[]> {
    try {
      const userId = requireAuth()

      const q = query(
        collection(db, 'blood-pressure-logs'),
        where('userId', '==', userId),
        where('loggedAt', '>=', Timestamp.fromDate(startDate)),
        where('loggedAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('loggedAt', 'desc')
      )

      const snapshot = await getDocs(q)
      const logs: BloodPressureLog[] = []

      snapshot.forEach(doc => {
        const data = doc.data()
        logs.push({
          id: doc.id,
          userId: data.userId,
          systolic: data.systolic,
          diastolic: data.diastolic,
          heartRate: data.heartRate,
          measurementContext: data.measurementContext,
          loggedAt: data.loggedAt.toDate(),
          dataSource: data.dataSource,
          deviceId: data.deviceId,
          notes: data.notes
        })
      })

      return logs
    } catch (error) {
      logger.error('[Blood Pressure] Failed to get logs by date range', error as Error)
      throw error
    }
  },

  /**
   * Delete a blood pressure log
   */
  async deleteLog(logId: string): Promise<void> {
    try {
      const userId = requireAuth()

      await deleteDoc(doc(db, 'blood-pressure-logs', logId))

      logger.info('[Blood Pressure] Log deleted', { userId, logId })
    } catch (error) {
      logger.error('[Blood Pressure] Failed to delete log', error as Error)
      throw error
    }
  }
}

// ============================================================================
// EXERCISE OPERATIONS
// ============================================================================

export const exerciseOperations = {
  /**
   * Create a new exercise log entry
   */
  async createLog(logData: Omit<ExerciseLog, 'id' | 'userId'>): Promise<string> {
    try {
      const userId = requireAuth()

      const newLog = {
        ...logData,
        userId,
        loggedAt: Timestamp.fromDate(logData.loggedAt),
        dataSource: logData.dataSource || 'manual'
      }

      const docRef = await addDoc(collection(db, 'exercise-logs'), newLog)

      logger.info('[Exercise] Log created', {
        userId,
        logId: docRef.id,
        activityType: logData.activityType,
        duration: logData.duration
      })

      return docRef.id
    } catch (error) {
      logger.error('[Exercise] Failed to create log', error as Error)
      throw error
    }
  },

  /**
   * Get user's exercise logs (most recent first)
   */
  async getUserLogs(limitCount: number = 30): Promise<ExerciseLog[]> {
    try {
      const userId = requireAuth()

      const q = query(
        collection(db, 'exercise-logs'),
        where('userId', '==', userId),
        orderBy('loggedAt', 'desc'),
        firestoreLimit(limitCount)
      )

      const snapshot = await getDocs(q)
      const logs: ExerciseLog[] = []

      snapshot.forEach(doc => {
        const data = doc.data()
        logs.push({
          id: doc.id,
          userId: data.userId,
          activityType: data.activityType,
          duration: data.duration,
          intensity: data.intensity,
          caloriesBurned: data.caloriesBurned,
          heartRateAvg: data.heartRateAvg,
          loggedAt: data.loggedAt.toDate(),
          dataSource: data.dataSource,
          deviceId: data.deviceId,
          notes: data.notes
        })
      })

      return logs
    } catch (error) {
      logger.error('[Exercise] Failed to get logs', error as Error)
      throw error
    }
  },

  /**
   * Get logs within a date range
   */
  async getLogsByDateRange(startDate: Date, endDate: Date): Promise<ExerciseLog[]> {
    try {
      const userId = requireAuth()

      const q = query(
        collection(db, 'exercise-logs'),
        where('userId', '==', userId),
        where('loggedAt', '>=', Timestamp.fromDate(startDate)),
        where('loggedAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('loggedAt', 'desc')
      )

      const snapshot = await getDocs(q)
      const logs: ExerciseLog[] = []

      snapshot.forEach(doc => {
        const data = doc.data()
        logs.push({
          id: doc.id,
          userId: data.userId,
          activityType: data.activityType,
          duration: data.duration,
          intensity: data.intensity,
          caloriesBurned: data.caloriesBurned,
          heartRateAvg: data.heartRateAvg,
          loggedAt: data.loggedAt.toDate(),
          dataSource: data.dataSource,
          deviceId: data.deviceId,
          notes: data.notes
        })
      })

      return logs
    } catch (error) {
      logger.error('[Exercise] Failed to get logs by date range', error as Error)
      throw error
    }
  },

  /**
   * Delete an exercise log
   */
  async deleteLog(logId: string): Promise<void> {
    try {
      const userId = requireAuth()

      await deleteDoc(doc(db, 'exercise-logs', logId))

      logger.info('[Exercise] Log deleted', { userId, logId })
    } catch (error) {
      logger.error('[Exercise] Failed to delete log', error as Error)
      throw error
    }
  },

  /**
   * Get weekly exercise summary
   */
  async getWeeklySummary(): Promise<{
    totalMinutes: number
    sessionsCount: number
    avgIntensity: string
  }> {
    try {
      const userId = requireAuth()

      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const logs = await this.getLogsByDateRange(oneWeekAgo, new Date())

      const totalMinutes = logs.reduce((sum, log) => sum + log.duration, 0)
      const sessionsCount = logs.length

      // Calculate average intensity
      const intensityScores = { low: 1, moderate: 2, high: 3 }
      const avgScore = logs.length > 0
        ? logs.reduce((sum, log) => sum + intensityScores[log.intensity], 0) / logs.length
        : 0

      let avgIntensity = 'none'
      if (avgScore > 0 && avgScore <= 1.5) avgIntensity = 'low'
      else if (avgScore > 1.5 && avgScore <= 2.5) avgIntensity = 'moderate'
      else if (avgScore > 2.5) avgIntensity = 'high'

      return { totalMinutes, sessionsCount, avgIntensity }
    } catch (error) {
      logger.error('[Exercise] Failed to get weekly summary', error as Error)
      return { totalMinutes: 0, sessionsCount: 0, avgIntensity: 'none' }
    }
  }
}
