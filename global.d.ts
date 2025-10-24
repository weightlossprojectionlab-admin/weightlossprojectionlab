/**
 * Global type declarations for Web Bluetooth API
 * These types are not included in standard TypeScript lib but are available in browsers that support Web Bluetooth
 */

interface BluetoothDevice {
  id: string
  name?: string
  gatt?: BluetoothRemoteGATTServer
  forget(): Promise<void>
  watchAdvertisements(): Promise<void>
  unwatchAdvertisements(): void
}

interface BluetoothRemoteGATTServer {
  device: BluetoothDevice
  connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>
  getPrimaryServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>
}

interface BluetoothRemoteGATTService {
  device: BluetoothDevice
  uuid: string
  isPrimary: boolean
  getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>
  getCharacteristics(characteristic?: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic[]>
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  service: BluetoothRemoteGATTService
  uuid: string
  properties: BluetoothCharacteristicProperties
  value?: DataView
  readValue(): Promise<DataView>
  writeValue(value: BufferSource): Promise<void>
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  addEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void
  removeEventListener(type: 'characteristicvaluechanged', listener: (event: Event) => void): void
}

interface BluetoothCharacteristicProperties {
  broadcast: boolean
  read: boolean
  writeWithoutResponse: boolean
  write: boolean
  notify: boolean
  indicate: boolean
  authenticatedSignedWrites: boolean
  reliableWrite: boolean
  writableAuxiliaries: boolean
}

type BluetoothServiceUUID = number | string
type BluetoothCharacteristicUUID = number | string

interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[]
  optionalServices?: BluetoothServiceUUID[]
  acceptAllDevices?: boolean
}

interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[]
  name?: string
  namePrefix?: string
}

interface Bluetooth extends EventTarget {
  getAvailability(): Promise<boolean>
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>
  getDevices(): Promise<BluetoothDevice[]>
}

interface Navigator {
  bluetooth: Bluetooth
}

/**
 * Global type declarations for Background Sync API
 * These types are not included in standard TypeScript lib but are available in browsers that support Background Sync
 */

interface SyncManager {
  register(tag: string): Promise<void>
  getTags(): Promise<string[]>
}

interface ServiceWorkerRegistration {
  readonly sync: SyncManager
}

interface SyncEvent extends ExtendableEvent {
  readonly tag: string
  readonly lastChance: boolean
}
