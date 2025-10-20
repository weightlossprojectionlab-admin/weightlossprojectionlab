/**
 * Bluetooth Weight Scale Integration
 * Uses Web Bluetooth API to connect to smart scales
 *
 * IMPORTANT: Web Bluetooth is NOT supported on iOS Safari
 * Only works on:
 * - Chrome/Edge on Android, macOS, Windows, Linux
 * - Samsung Internet on Android
 *
 * Standard Bluetooth GATT Services:
 * - Weight Scale Service: 0x181D
 * - Weight Measurement Characteristic: 0x2A9D
 * - Body Composition Measurement: 0x2A9C (optional)
 */

// Bluetooth GATT UUIDs for Weight Scale Service
export const WEIGHT_SCALE_SERVICE = '0000181d-0000-1000-8000-00805f9b34fb'
export const WEIGHT_MEASUREMENT_CHAR = '00002a9d-0000-1000-8000-00805f9b34fb'
export const BODY_COMPOSITION_CHAR = '00002a9c-0000-1000-8000-00805f9b34fb'

export interface WeightReading {
  weight: number
  unit: 'kg' | 'lbs'
  timestamp: Date
  deviceId: string
  deviceName: string
  dataSource: 'bluetooth-scale'
  bodyComposition?: {
    bodyFatPercentage?: number
    muscleMass?: number
    boneMass?: number
    waterPercentage?: number
  }
}

export interface BluetoothScaleDevice {
  device: BluetoothDevice
  server: BluetoothRemoteGATTServer
  service: BluetoothRemoteGATTService
  characteristic: BluetoothRemoteGATTCharacteristic
}

/**
 * Check if Web Bluetooth API is available
 */
export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

/**
 * Request user to select and connect to a Bluetooth scale
 */
export async function connectToScale(): Promise<BluetoothScaleDevice> {
  if (!isBluetoothSupported()) {
    throw new Error('Web Bluetooth API is not supported in this browser')
  }

  try {
    // Request device with Weight Scale service filter
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [WEIGHT_SCALE_SERVICE] }
      ],
      optionalServices: [BODY_COMPOSITION_CHAR]
    })

    if (!device.gatt) {
      throw new Error('Device does not support GATT')
    }

    // Connect to GATT server
    console.log('Connecting to GATT server...')
    const server = await device.gatt.connect()

    // Get Weight Scale service
    console.log('Getting Weight Scale service...')
    const service = await server.getPrimaryService(WEIGHT_SCALE_SERVICE)

    // Get Weight Measurement characteristic
    console.log('Getting Weight Measurement characteristic...')
    const characteristic = await service.getCharacteristic(WEIGHT_MEASUREMENT_CHAR)

    return {
      device,
      server,
      service,
      characteristic
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'NotFoundError') {
        throw new Error('No Bluetooth scale found. Make sure your scale is on and in pairing mode.')
      }
      if (error.name === 'SecurityError') {
        throw new Error('Bluetooth access denied. Please allow Bluetooth permissions.')
      }
    }
    throw error
  }
}

/**
 * Parse Weight Measurement data from characteristic
 * Follows Bluetooth GATT Weight Scale specification
 */
function parseWeightMeasurement(dataView: DataView, deviceId: string, deviceName: string): WeightReading {
  // Flags byte (first byte)
  const flags = dataView.getUint8(0)

  // Bit 0: Imperial (0 = SI units (kg), 1 = Imperial (lbs))
  const isImperial = (flags & 0x01) !== 0
  const unit: 'kg' | 'lbs' = isImperial ? 'lbs' : 'kg'

  // Bit 1: Time stamp present
  const hasTimestamp = (flags & 0x02) !== 0

  // Bit 2: User ID present
  const hasUserId = (flags & 0x04) !== 0

  // Bit 3: BMI and Height present
  const hasBMI = (flags & 0x08) !== 0

  let offset = 1

  // Weight value (16-bit unsigned integer in units of 0.005 kg or 0.01 lb)
  const weightRaw = dataView.getUint16(offset, true) // little-endian
  offset += 2

  // Convert to actual weight
  const weight = isImperial
    ? weightRaw * 0.01  // Imperial: resolution of 0.01 lbs
    : weightRaw * 0.005 // SI: resolution of 0.005 kg

  // Parse timestamp if present
  let timestamp = new Date()
  if (hasTimestamp) {
    // Timestamp is 7 bytes: year (2 bytes), month, day, hour, minute, second
    const year = dataView.getUint16(offset, true)
    const month = dataView.getUint8(offset + 2)
    const day = dataView.getUint8(offset + 3)
    const hour = dataView.getUint8(offset + 4)
    const minute = dataView.getUint8(offset + 5)
    const second = dataView.getUint8(offset + 6)
    timestamp = new Date(year, month - 1, day, hour, minute, second)
    offset += 7
  }

  // Skip User ID if present (2 bytes)
  if (hasUserId) {
    offset += 2
  }

  // Parse BMI and Height if present (optional for advanced scales)
  if (hasBMI) {
    // BMI: 2 bytes (in units of 0.1)
    // Height: 2 bytes (in units of 0.001 meter or 0.1 inch)
    offset += 4
  }

  return {
    weight: parseFloat(weight.toFixed(2)),
    unit,
    timestamp,
    deviceId,
    deviceName,
    dataSource: 'bluetooth-scale'
  }
}

/**
 * Read current weight from connected scale
 */
export async function readWeight(scaleDevice: BluetoothScaleDevice): Promise<WeightReading> {
  try {
    const value = await scaleDevice.characteristic.readValue()
    return parseWeightMeasurement(
      value,
      scaleDevice.device.id,
      scaleDevice.device.name || 'Bluetooth Scale'
    )
  } catch (error) {
    throw new Error('Failed to read weight from scale')
  }
}

/**
 * Subscribe to weight measurements (for real-time updates)
 * Useful for scales that continuously broadcast measurements
 */
export async function subscribeToWeightUpdates(
  scaleDevice: BluetoothScaleDevice,
  onWeight: (reading: WeightReading) => void
): Promise<() => void> {
  const handleNotification = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic
    const value = target.value
    if (value) {
      const reading = parseWeightMeasurement(
        value,
        scaleDevice.device.id,
        scaleDevice.device.name || 'Bluetooth Scale'
      )
      onWeight(reading)
    }
  }

  scaleDevice.characteristic.addEventListener('characteristicvaluechanged', handleNotification)
  await scaleDevice.characteristic.startNotifications()

  // Return unsubscribe function
  return async () => {
    scaleDevice.characteristic.removeEventListener('characteristicvaluechanged', handleNotification)
    await scaleDevice.characteristic.stopNotifications()
  }
}

/**
 * Disconnect from scale
 */
export function disconnectScale(scaleDevice: BluetoothScaleDevice): void {
  if (scaleDevice.server.connected) {
    scaleDevice.server.disconnect()
  }
}

/**
 * Get list of previously paired scales
 * Note: This requires user permission and may not return devices on all browsers
 */
export async function getPairedScales(): Promise<BluetoothDevice[]> {
  if (!isBluetoothSupported()) {
    return []
  }

  try {
    const devices = await navigator.bluetooth.getDevices()
    return devices.filter(device =>
      device.gatt &&
      device.name &&
      (device.name.toLowerCase().includes('scale') ||
       device.name.toLowerCase().includes('weight'))
    )
  } catch (error) {
    console.error('Failed to get paired devices:', error)
    return []
  }
}

/**
 * Reconnect to a previously paired scale
 */
export async function reconnectToScale(device: BluetoothDevice): Promise<BluetoothScaleDevice> {
  if (!device.gatt) {
    throw new Error('Device does not support GATT')
  }

  try {
    const server = await device.gatt.connect()
    const service = await server.getPrimaryService(WEIGHT_SCALE_SERVICE)
    const characteristic = await service.getCharacteristic(WEIGHT_MEASUREMENT_CHAR)

    return {
      device,
      server,
      service,
      characteristic
    }
  } catch (error) {
    throw new Error('Failed to reconnect to scale. Please try pairing again.')
  }
}

/**
 * Common Bluetooth scale manufacturers and their typical naming patterns
 */
export const KNOWN_SCALE_BRANDS = [
  'Xiaomi',
  'Withings',
  'Eufy',
  'RENPHO',
  'Fitbit',
  'Garmin',
  'QardioBase',
  'Greater Goods',
  'YUNMAI',
  'INEVIFIT'
]

/**
 * Check if a Bluetooth device is likely a weight scale
 */
export function isLikelyScale(device: BluetoothDevice): boolean {
  const name = device.name?.toLowerCase() || ''
  return (
    name.includes('scale') ||
    name.includes('weight') ||
    name.includes('body') ||
    KNOWN_SCALE_BRANDS.some(brand => name.includes(brand.toLowerCase()))
  )
}
