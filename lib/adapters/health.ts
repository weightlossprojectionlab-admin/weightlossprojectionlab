/**
 * Health Data Adapter
 *
 * Provides a unified health data interface across web and native platforms.
 * - Web: No native health data access (returns empty data)
 * - iOS: Uses HealthKit via capacitor-health plugin
 * - Android: Uses Google Fit via capacitor-health plugin
 *
 * This adapter enables reading step count, heart rate, calories, and other health metrics.
 */

import { Health, HealthDataType } from 'capacitor-health'
import { isNative, isServer, isIOS, isAndroid, isPluginAvailable } from '@/lib/platform'

export interface HealthDataQuery {
  startDate: Date
  endDate: Date
  dataType: HealthMetricType
}

export type HealthMetricType =
  | 'steps'
  | 'heart_rate'
  | 'calories'
  | 'distance'
  | 'weight'
  | 'blood_pressure'
  | 'blood_glucose'
  | 'sleep'
  | 'exercise'

export interface HealthDataPoint {
  value: number
  unit: string
  date: Date
  source: string
}

export interface HealthPermissions {
  granted: boolean
  types: HealthMetricType[]
}

export interface HealthAdapter {
  isAvailable(): Promise<boolean>
  requestPermissions(types: HealthMetricType[]): Promise<HealthPermissions>
  queryData(query: HealthDataQuery): Promise<HealthDataPoint[]>
  writeData(dataType: HealthMetricType, value: number, date: Date): Promise<void>
}

/**
 * Map our HealthMetricType to capacitor-health's HealthDataType
 */
function mapToHealthDataType(type: HealthMetricType): HealthDataType {
  switch (type) {
    case 'steps':
      return HealthDataType.STEPS
    case 'heart_rate':
      return HealthDataType.HEART_RATE
    case 'calories':
      return HealthDataType.CALORIES
    case 'distance':
      return HealthDataType.DISTANCE
    case 'weight':
      return HealthDataType.WEIGHT
    case 'blood_pressure':
      return HealthDataType.BLOOD_PRESSURE
    case 'blood_glucose':
      return HealthDataType.BLOOD_GLUCOSE
    case 'sleep':
      return HealthDataType.SLEEP
    case 'exercise':
      return HealthDataType.EXERCISE
    default:
      return HealthDataType.STEPS
  }
}

/**
 * Web Health Adapter (no native health access)
 */
class WebHealthAdapter implements HealthAdapter {
  async isAvailable(): Promise<boolean> {
    return false // Web browsers don't have access to native health data
  }

  async requestPermissions(types: HealthMetricType[]): Promise<HealthPermissions> {
    return {
      granted: false,
      types: [],
    }
  }

  async queryData(query: HealthDataQuery): Promise<HealthDataPoint[]> {
    console.warn('Health data not available on web')
    return []
  }

  async writeData(dataType: HealthMetricType, value: number, date: Date): Promise<void> {
    console.warn('Cannot write health data on web')
  }
}

/**
 * Native Health Adapter (uses capacitor-health for HealthKit/Google Fit)
 */
class NativeHealthAdapter implements HealthAdapter {
  async isAvailable(): Promise<boolean> {
    try {
      if (!isPluginAvailable('Health')) {
        return false
      }

      const result = await Health.isAvailable()
      return result.available
    } catch (error) {
      console.error('Failed to check health availability:', error)
      return false
    }
  }

  async requestPermissions(types: HealthMetricType[]): Promise<HealthPermissions> {
    try {
      // Map to HealthDataType
      const healthDataTypes = types.map(mapToHealthDataType)

      // Request permissions for all types
      const readPermissions = healthDataTypes
      const writePermissions = healthDataTypes

      const result = await Health.requestAuthorization({
        read: readPermissions,
        write: writePermissions,
      })

      return {
        granted: result.granted,
        types: result.granted ? types : [],
      }
    } catch (error) {
      console.error('Failed to request health permissions:', error)
      return {
        granted: false,
        types: [],
      }
    }
  }

  async queryData(query: HealthDataQuery): Promise<HealthDataPoint[]> {
    try {
      const dataType = mapToHealthDataType(query.dataType)

      const result = await Health.queryAggregated({
        dataType,
        startDate: query.startDate.toISOString(),
        endDate: query.endDate.toISOString(),
      })

      // Transform result to HealthDataPoint[]
      if (!result.data || result.data.length === 0) {
        return []
      }

      return result.data.map((item: any) => ({
        value: item.value || 0,
        unit: item.unit || '',
        date: new Date(item.startDate || query.startDate),
        source: item.sourceName || (isIOS() ? 'HealthKit' : 'Google Fit'),
      }))
    } catch (error) {
      console.error('Failed to query health data:', error)
      return []
    }
  }

  async writeData(dataType: HealthMetricType, value: number, date: Date): Promise<void> {
    try {
      const healthDataType = mapToHealthDataType(dataType)

      await Health.addSample({
        dataType: healthDataType,
        value,
        startDate: date.toISOString(),
        endDate: date.toISOString(),
      })

      console.log(`Successfully wrote ${value} ${dataType} to health store`)
    } catch (error) {
      console.error('Failed to write health data:', error)
      throw error
    }
  }
}

/**
 * Server Health Adapter (no-op for SSR)
 */
class ServerHealthAdapter implements HealthAdapter {
  async isAvailable(): Promise<boolean> {
    return false
  }

  async requestPermissions(types: HealthMetricType[]): Promise<HealthPermissions> {
    return {
      granted: false,
      types: [],
    }
  }

  async queryData(query: HealthDataQuery): Promise<HealthDataPoint[]> {
    return []
  }

  async writeData(dataType: HealthMetricType, value: number, date: Date): Promise<void> {
    console.warn('Health data not available on server')
  }
}

/**
 * Get the appropriate health adapter for the current platform
 */
function getHealthAdapter(): HealthAdapter {
  if (isServer()) {
    return new ServerHealthAdapter()
  }

  if (isNative()) {
    return new NativeHealthAdapter()
  }

  return new WebHealthAdapter()
}

// Export singleton instance
export const health = getHealthAdapter()

/**
 * Utility: Get today's steps from health store
 */
export async function getTodaysSteps(): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of day

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1) // End of day

  const data = await health.queryData({
    startDate: today,
    endDate: tomorrow,
    dataType: 'steps',
  })

  // Sum all step data points for today
  return data.reduce((total, point) => total + point.value, 0)
}

/**
 * Utility: Get step history for the last N days
 */
export async function getStepHistory(days: number): Promise<{ date: string; steps: number }[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const data = await health.queryData({
    startDate,
    endDate,
    dataType: 'steps',
  })

  // Group by date
  const stepsByDate: Record<string, number> = {}

  data.forEach((point) => {
    const dateStr = point.date.toISOString().split('T')[0]
    stepsByDate[dateStr] = (stepsByDate[dateStr] || 0) + point.value
  })

  // Convert to array and sort by date
  return Object.entries(stepsByDate)
    .map(([date, steps]) => ({ date, steps }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Utility: Sync Firebase step logs with HealthKit/Google Fit
 *
 * This function reads step data from the native health store and writes it to Firebase.
 * It's useful for importing historical step data on first app launch.
 */
export async function syncHealthDataToFirebase(
  firebaseWriteFn: (date: string, steps: number) => Promise<void>,
  days: number = 7
): Promise<number> {
  try {
    const history = await getStepHistory(days)
    let syncedCount = 0

    for (const { date, steps } of history) {
      if (steps > 0) {
        await firebaseWriteFn(date, steps)
        syncedCount++
      }
    }

    console.log(`Synced ${syncedCount} days of health data to Firebase`)
    return syncedCount
  } catch (error) {
    console.error('Failed to sync health data to Firebase:', error)
    throw error
  }
}
