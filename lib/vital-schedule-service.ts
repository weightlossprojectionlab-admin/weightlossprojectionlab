/**
 * Vital Schedule Service
 *
 * Backend service for managing vital sign monitoring schedules.
 * Handles CRUD operations, instance creation, compliance calculations.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  collectionGroup
} from 'firebase/firestore'
import { db } from './firebase'
import { format, addDays, startOfDay, endOfDay, parseISO, addHours, subMinutes, isWithinInterval } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import {
  VitalMonitoringSchedule,
  ScheduledVitalInstance,
  ComplianceReport,
  CreateScheduleParams,
  UpdateScheduleParams,
  UpcomingReminder,
  ScheduleStatistics,
  ScheduleFrequency,
  ScheduledVitalStatus,
  ComplianceStatus,
  ComplianceColorCode,
  ComplianceTrendDataPoint
} from '@/types/vital-schedules'
import { VitalType } from '@/types/medical'
import { logger } from './logger'

/**
 * Create a new vital monitoring schedule
 */
export async function createSchedule(params: CreateScheduleParams): Promise<VitalMonitoringSchedule> {
  try {
    const now = new Date().toISOString()

    const schedule: Omit<VitalMonitoringSchedule, 'id'> = {
      userId: params.userId,
      patientId: params.patientId,
      patientName: params.patientName,
      vitalType: params.vitalType,
      frequency: params.frequency,
      specificTimes: params.specificTimes,
      daysOfWeek: params.daysOfWeek,
      timezone: params.timezone,
      notificationChannels: params.notificationChannels,
      quietHours: params.quietHours,
      advanceReminderMinutes: params.advanceReminderMinutes || 15,
      complianceTarget: params.complianceTarget || 90,
      complianceWindow: params.complianceWindow || 2,
      active: true,
      createdAt: now,
      createdBy: params.userId,
      lastModified: now,
      condition: params.condition,
      doctorRecommended: params.doctorRecommended || false,
      doctorNotes: params.doctorNotes
    }

    const schedulesRef = collection(db, 'vitalSchedules')
    const docRef = await addDoc(schedulesRef, schedule)

    const createdSchedule: VitalMonitoringSchedule = {
      ...schedule,
      id: docRef.id
    }

    // Create instances for next 7 days
    await createScheduleInstances(docRef.id, 7)

    logger.info('[VitalScheduleService] Schedule created', {
      scheduleId: docRef.id,
      patientId: params.patientId,
      vitalType: params.vitalType,
      frequency: params.frequency
    })

    return createdSchedule
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to create schedule', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Get all schedules for a patient
 */
export async function getPatientSchedules(patientId: string): Promise<VitalMonitoringSchedule[]> {
  try {
    const schedulesRef = collection(db, 'vitalSchedules')
    const q = query(
      schedulesRef,
      where('patientId', '==', patientId),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    const schedules: VitalMonitoringSchedule[] = []

    snapshot.forEach((doc) => {
      schedules.push({
        id: doc.id,
        ...doc.data()
      } as VitalMonitoringSchedule)
    })

    return schedules
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to get patient schedules', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Get active schedules for a patient
 */
export async function getActiveSchedules(patientId: string): Promise<VitalMonitoringSchedule[]> {
  try {
    const schedulesRef = collection(db, 'vitalSchedules')
    const q = query(
      schedulesRef,
      where('patientId', '==', patientId),
      where('active', '==', true),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)
    const schedules: VitalMonitoringSchedule[] = []

    snapshot.forEach((doc) => {
      schedules.push({
        id: doc.id,
        ...doc.data()
      } as VitalMonitoringSchedule)
    })

    return schedules
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to get active schedules', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Get a single schedule by ID
 */
export async function getSchedule(scheduleId: string): Promise<VitalMonitoringSchedule | null> {
  try {
    const scheduleRef = doc(db, 'vitalSchedules', scheduleId)
    const snapshot = await getDoc(scheduleRef)

    if (!snapshot.exists()) {
      return null
    }

    return {
      id: snapshot.id,
      ...snapshot.data()
    } as VitalMonitoringSchedule
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to get schedule', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Update a schedule
 */
export async function updateSchedule(
  scheduleId: string,
  updates: UpdateScheduleParams,
  userId: string
): Promise<void> {
  try {
    const scheduleRef = doc(db, 'vitalSchedules', scheduleId)

    await updateDoc(scheduleRef, {
      ...updates,
      lastModified: new Date().toISOString(),
      lastModifiedBy: userId
    })

    logger.info('[VitalScheduleService] Schedule updated', {
      scheduleId,
      updates
    })

    // If times or frequency changed, recreate instances
    if (updates.specificTimes || updates.frequency || updates.daysOfWeek) {
      await recreateInstances(scheduleId)
    }
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to update schedule', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Delete a schedule and all its instances
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  try {
    const batch = writeBatch(db)

    // Delete all instances
    const instancesRef = collection(db, 'vitalSchedules', scheduleId, 'instances')
    const instancesSnapshot = await getDocs(instancesRef)

    instancesSnapshot.forEach((doc) => {
      batch.delete(doc.ref)
    })

    // Delete schedule
    const scheduleRef = doc(db, 'vitalSchedules', scheduleId)
    batch.delete(scheduleRef)

    await batch.commit()

    logger.info('[VitalScheduleService] Schedule deleted', { scheduleId })
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to delete schedule', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Create schedule instances for next N days
 */
export async function createScheduleInstances(scheduleId: string, days: number): Promise<void> {
  try {
    const schedule = await getSchedule(scheduleId)
    if (!schedule) {
      throw new Error('Schedule not found')
    }

    const instances: Omit<ScheduledVitalInstance, 'id'>[] = []
    const now = new Date()
    const endDate = addDays(now, days)

    // Generate instances for each day
    for (let date = startOfDay(now); date <= endDate; date = addDays(date, 1)) {
      const dayOfWeek = date.getDay()

      // Check if this day is included in schedule
      if (schedule.daysOfWeek && !schedule.daysOfWeek.includes(dayOfWeek)) {
        continue
      }

      // Create instance for each specified time
      for (const timeString of schedule.specificTimes) {
        const [hours, minutes] = timeString.split(':').map(Number)

        // Create local date/time
        const localDateTime = new Date(date)
        localDateTime.setHours(hours, minutes, 0, 0)

        // Convert to UTC
        const utcDateTime = fromZonedTime(localDateTime, schedule.timezone)

        // Calculate compliance window
        const windowEnd = addHours(utcDateTime, schedule.complianceWindow)
        const windowStart = subMinutes(utcDateTime, schedule.advanceReminderMinutes)

        const instance: Omit<ScheduledVitalInstance, 'id'> = {
          scheduleId,
          patientId: schedule.patientId,
          patientName: schedule.patientName,
          vitalType: schedule.vitalType,
          scheduledFor: utcDateTime.toISOString(),
          scheduledDate: format(localDateTime, 'yyyy-MM-dd'),
          scheduledTimeLocal: timeString,
          status: 'pending',
          windowStart: windowStart.toISOString(),
          windowEnd: windowEnd.toISOString(),
          createdAt: new Date().toISOString()
        }

        instances.push(instance)
      }
    }

    // Batch write instances
    const batch = writeBatch(db)
    const instancesRef = collection(db, 'vitalSchedules', scheduleId, 'instances')

    instances.forEach((instance) => {
      const docRef = doc(instancesRef)
      batch.set(docRef, instance)
    })

    await batch.commit()

    logger.info('[VitalScheduleService] Created instances', {
      scheduleId,
      count: instances.length,
      days
    })
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to create instances', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Recreate instances after schedule update
 */
async function recreateInstances(scheduleId: string): Promise<void> {
  try {
    // Delete future pending instances
    const instancesRef = collection(db, 'vitalSchedules', scheduleId, 'instances')
    const now = new Date().toISOString()
    const q = query(
      instancesRef,
      where('status', '==', 'pending'),
      where('scheduledFor', '>=', now)
    )

    const snapshot = await getDocs(q)
    const batch = writeBatch(db)

    snapshot.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()

    // Create new instances
    await createScheduleInstances(scheduleId, 7)

    logger.info('[VitalScheduleService] Recreated instances', { scheduleId })
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to recreate instances', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Get upcoming reminders (next N hours)
 */
export async function getUpcomingReminders(userId: string, nextHours: number): Promise<UpcomingReminder[]> {
  try {
    const now = new Date()
    const futureTime = addHours(now, nextHours)

    const instancesRef = collectionGroup(db, 'instances')
    const q = query(
      instancesRef,
      where('status', '==', 'pending'),
      where('scheduledFor', '>=', now.toISOString()),
      where('scheduledFor', '<=', futureTime.toISOString())
    )

    const snapshot = await getDocs(q)
    const reminders: UpcomingReminder[] = []

    // Get schedule details for each instance
    for (const instanceDoc of snapshot.docs) {
      const instance = instanceDoc.data() as ScheduledVitalInstance
      const schedule = await getSchedule(instance.scheduleId)

      if (schedule && schedule.userId === userId && schedule.active) {
        reminders.push({
          instanceId: instanceDoc.id,
          scheduleId: instance.scheduleId,
          patientId: instance.patientId,
          patientName: instance.patientName,
          userId: schedule.userId,
          vitalType: instance.vitalType,
          scheduledFor: instance.scheduledFor,
          scheduledTimeLocal: instance.scheduledTimeLocal,
          notificationChannels: schedule.notificationChannels,
          advanceReminderMinutes: schedule.advanceReminderMinutes,
          condition: schedule.condition
        })
      }
    }

    return reminders
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to get upcoming reminders', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Mark instance as reminded
 */
export async function markInstanceReminded(
  scheduleId: string,
  instanceId: string,
  channels: string[]
): Promise<void> {
  try {
    const instanceRef = doc(db, 'vitalSchedules', scheduleId, 'instances', instanceId)

    await updateDoc(instanceRef, {
      status: 'reminded',
      reminderSentAt: new Date().toISOString(),
      reminderChannels: channels
    })

    logger.info('[VitalScheduleService] Instance marked as reminded', {
      scheduleId,
      instanceId,
      channels
    })
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to mark instance reminded', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Record vital reading for a schedule instance
 */
export async function recordVitalForSchedule(
  vitalId: string,
  patientId: string,
  vitalType: VitalType,
  recordedAt: string
): Promise<void> {
  try {
    // Find matching scheduled instance
    const instancesRef = collectionGroup(db, 'instances')
    const recordedDate = format(parseISO(recordedAt), 'yyyy-MM-dd')

    const q = query(
      instancesRef,
      where('patientId', '==', patientId),
      where('vitalType', '==', vitalType),
      where('scheduledDate', '==', recordedDate),
      where('status', 'in', ['pending', 'reminded']),
      limit(1)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      logger.warn('[VitalScheduleService] No matching instance found for vital', {
        vitalId,
        patientId,
        vitalType,
        recordedDate
      })
      return
    }

    const instanceDoc = snapshot.docs[0]
    const instance = instanceDoc.data() as ScheduledVitalInstance
    const recordedTime = parseISO(recordedAt)
    const scheduledTime = parseISO(instance.scheduledFor)
    const windowEnd = parseISO(instance.windowEnd)

    // Determine if on-time or late
    const status: ScheduledVitalStatus = recordedTime <= windowEnd ? 'completed' : 'completed_late'

    // Update instance
    const instanceRef = doc(db, 'vitalSchedules', instance.scheduleId, 'instances', instanceDoc.id)
    await updateDoc(instanceRef, {
      status,
      completedAt: recordedAt,
      completedVitalId: vitalId
    })

    logger.info('[VitalScheduleService] Vital recorded for schedule', {
      vitalId,
      instanceId: instanceDoc.id,
      scheduleId: instance.scheduleId,
      status
    })
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to record vital for schedule', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Mark instance as missed
 */
export async function markInstanceMissed(
  scheduleId: string,
  instanceId: string,
  reason: string = 'timeout'
): Promise<void> {
  try {
    const instanceRef = doc(db, 'vitalSchedules', scheduleId, 'instances', instanceId)

    await updateDoc(instanceRef, {
      status: 'missed',
      missedReason: reason
    })

    logger.info('[VitalScheduleService] Instance marked as missed', {
      scheduleId,
      instanceId,
      reason
    })
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to mark instance missed', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Calculate compliance for a patient's vital schedule
 */
export async function calculateCompliance(
  patientId: string,
  vitalType: VitalType,
  periodType: 'daily' | 'weekly' | 'monthly'
): Promise<ComplianceReport | null> {
  try {
    // Find schedule
    const schedulesRef = collection(db, 'vitalSchedules')
    const q = query(
      schedulesRef,
      where('patientId', '==', patientId),
      where('vitalType', '==', vitalType),
      where('active', '==', true),
      limit(1)
    )

    const scheduleSnapshot = await getDocs(q)
    if (scheduleSnapshot.empty) {
      return null
    }

    const scheduleDoc = scheduleSnapshot.docs[0]
    const schedule = { id: scheduleDoc.id, ...scheduleDoc.data() } as VitalMonitoringSchedule

    // Calculate period dates
    const now = new Date()
    let periodStart: Date
    let periodEnd: Date

    switch (periodType) {
      case 'daily':
        periodStart = startOfDay(now)
        periodEnd = endOfDay(now)
        break
      case 'weekly':
        periodStart = addDays(startOfDay(now), -7)
        periodEnd = endOfDay(now)
        break
      case 'monthly':
        periodStart = addDays(startOfDay(now), -30)
        periodEnd = endOfDay(now)
        break
    }

    // Get instances for period
    const instancesRef = collection(db, 'vitalSchedules', schedule.id, 'instances')
    const instancesQuery = query(
      instancesRef,
      where('scheduledFor', '>=', periodStart.toISOString()),
      where('scheduledFor', '<=', periodEnd.toISOString())
    )

    const instancesSnapshot = await getDocs(instancesQuery)
    const instances: ScheduledVitalInstance[] = []

    instancesSnapshot.forEach((doc) => {
      instances.push({ id: doc.id, ...doc.data() } as ScheduledVitalInstance)
    })

    // Calculate metrics
    const scheduledCount = instances.length
    const completedCount = instances.filter((i) => i.status === 'completed').length
    const completedLateCount = instances.filter((i) => i.status === 'completed_late').length
    const missedCount = instances.filter((i) => i.status === 'missed').length
    const skippedCount = instances.filter((i) => i.status === 'skipped').length

    const complianceRate = scheduledCount > 0
      ? Math.round(((completedCount + completedLateCount) / scheduledCount) * 100)
      : 0

    const onTimeRate = scheduledCount > 0
      ? Math.round((completedCount / scheduledCount) * 100)
      : 0

    // Determine status
    let status: ComplianceStatus
    let colorCode: ComplianceColorCode

    if (complianceRate >= 95) {
      status = 'excellent'
      colorCode = 'green'
    } else if (complianceRate >= 85) {
      status = 'good'
      colorCode = 'green'
    } else if (complianceRate >= 70) {
      status = 'needs_improvement'
      colorCode = 'yellow'
    } else {
      status = 'poor'
      colorCode = 'red'
    }

    // Calculate average delay
    const lateInstances = instances.filter((i) => i.status === 'completed_late' && i.completedAt)
    let averageDelayMinutes = 0

    if (lateInstances.length > 0) {
      const totalDelay = lateInstances.reduce((sum, instance) => {
        const completed = parseISO(instance.completedAt!)
        const scheduled = parseISO(instance.scheduledFor)
        const delayMs = completed.getTime() - scheduled.getTime()
        return sum + (delayMs / 1000 / 60) // Convert to minutes
      }, 0)
      averageDelayMinutes = Math.round(totalDelay / lateInstances.length)
    }

    // Create report
    const report: ComplianceReport = {
      id: `${schedule.id}_${periodType}_${format(now, 'yyyy-MM-dd')}`,
      patientId,
      patientName: schedule.patientName,
      userId: schedule.userId,
      vitalType,
      scheduleId: schedule.id,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      periodType,
      scheduledCount,
      completedCount,
      completedLateCount,
      missedCount,
      skippedCount,
      complianceRate,
      onTimeRate,
      averageDelayMinutes,
      completionByChannel: {
        app: completedCount + completedLateCount, // TODO: Track actual channel
        voice: 0,
        proactive: 0
      },
      status,
      colorCode,
      currentStreak: 0, // TODO: Calculate streak
      longestStreak: 0, // TODO: Calculate streak
      generatedAt: new Date().toISOString(),
      generatedBy: 'system'
    }

    // Save report
    const reportsRef = collection(db, 'patients', patientId, 'complianceReports')
    await addDoc(reportsRef, report)

    return report
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to calculate compliance', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Get schedule statistics for a user
 */
export async function getScheduleStatistics(userId: string): Promise<ScheduleStatistics> {
  try {
    const schedulesRef = collection(db, 'vitalSchedules')
    const q = query(schedulesRef, where('userId', '==', userId))

    const snapshot = await getDocs(q)
    const schedules: VitalMonitoringSchedule[] = []

    snapshot.forEach((doc) => {
      schedules.push({ id: doc.id, ...doc.data() } as VitalMonitoringSchedule)
    })

    const activeSchedules = schedules.filter((s) => s.active)
    const inactiveSchedules = schedules.filter((s) => !s.active)

    // Calculate total daily readings
    const totalDailyReadings = activeSchedules.reduce((sum, schedule) => {
      const freq = schedule.frequency
      let readingsPerDay = 0

      if (freq.endsWith('x')) {
        readingsPerDay = parseInt(freq.replace('x', ''))
      } else if (freq === 'daily') {
        readingsPerDay = 1
      } else if (freq === 'weekly') {
        readingsPerDay = 1 / 7
      }

      return sum + readingsPerDay
    }, 0)

    // Vital type breakdown
    const vitalTypeBreakdown: { [key: string]: number } = {}
    schedules.forEach((schedule) => {
      const type = schedule.vitalType
      vitalTypeBreakdown[type] = (vitalTypeBreakdown[type] || 0) + 1
    })

    return {
      totalSchedules: schedules.length,
      activeSchedules: activeSchedules.length,
      inactiveSchedules: inactiveSchedules.length,
      totalDailyReadings: Math.round(totalDailyReadings),
      vitalTypeBreakdown
    }
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to get schedule statistics', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Get compliance trend data for charting
 */
export async function getComplianceTrends(
  patientId: string,
  vitalType: VitalType,
  days: number
): Promise<ComplianceTrendDataPoint[]> {
  try {
    const trends: ComplianceTrendDataPoint[] = []
    const now = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = addDays(now, -i)
      const report = await calculateCompliance(patientId, vitalType, 'daily')

      if (report) {
        trends.push({
          date: format(date, 'yyyy-MM-dd'),
          complianceRate: report.complianceRate,
          scheduledCount: report.scheduledCount,
          completedCount: report.completedCount,
          missedCount: report.missedCount,
          status: report.status,
          colorCode: report.colorCode
        })
      }
    }

    return trends
  } catch (error) {
    logger.error('[VitalScheduleService] Failed to get compliance trends', error instanceof Error ? error : undefined)
    throw error
  }
}
