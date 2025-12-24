/**
 * Shopping Session Types
 *
 * Tracks active shopping sessions to prevent bulk list operations
 * while someone is actively shopping at a store
 */

import type { HouseholdRole } from './household-permissions'
import type { Timestamp } from 'firebase/firestore'

export type ShoppingSessionStatus = 'active' | 'paused' | 'completed' | 'expired'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export interface ShoppingSession {
  id: string
  householdId: string
  userId: string // Who is shopping
  userName: string // Display name for UI
  userRole?: HouseholdRole
  status: ShoppingSessionStatus
  startedAt: Timestamp | Date
  lastActivityAt: Timestamp | Date // Updated every 30s via heartbeat
  expiresAt: Timestamp | Date // Auto-cleanup after 2 hours
  endedAt?: Timestamp | Date
  deviceId: string // Prevent duplicate sessions
  itemsScanned: number // Progress indicator
  storeLocation?: {
    name: string
    latitude: number
    longitude: number
  }
  metadata: {
    appVersion: string
    deviceType: DeviceType
    platform: string
  }
}

export interface ShoppingSessionCreateParams {
  householdId: string
  userId: string
  userName: string
  deviceId: string
  userRole?: HouseholdRole
  storeLocation?: {
    name: string
    latitude: number
    longitude: number
  }
}

export interface ShoppingSessionUpdateParams {
  status?: ShoppingSessionStatus
  lastActivityAt?: Timestamp | Date
  itemsScanned?: number
  endedAt?: Timestamp | Date
}

/**
 * Session state transitions
 */
export const SESSION_TRANSITIONS = {
  START: 'active' as const,
  PAUSE: 'paused' as const,
  RESUME: 'active' as const,
  COMPLETE: 'completed' as const,
  EXPIRE: 'expired' as const
}

/**
 * Timeout durations (in milliseconds)
 */
export const SESSION_TIMEOUTS = {
  HEARTBEAT_INTERVAL: 30 * 1000, // 30 seconds
  ACTIVITY_TO_PAUSED: 3 * 60 * 1000, // 3 minutes
  PAUSED_TO_EXPIRED: 30 * 60 * 1000, // 30 minutes
  ABSOLUTE_MAX: 2 * 60 * 60 * 1000, // 2 hours
  GRACE_PERIOD: 2 * 60 * 1000 // 2 minutes (2 missed heartbeats)
}

/**
 * Session validation helpers
 */
export function isSessionActive(session: ShoppingSession): boolean {
  if (session.status !== 'active') return false

  const now = Date.now()
  const lastActivity = session.lastActivityAt instanceof Date
    ? session.lastActivityAt.getTime()
    : (session.lastActivityAt as Timestamp).toMillis()

  const ageMs = now - lastActivity

  // Session is active if heartbeat within last 3 minutes
  return ageMs <= SESSION_TIMEOUTS.ACTIVITY_TO_PAUSED
}

export function isSessionStale(session: ShoppingSession): boolean {
  const now = Date.now()
  const lastActivity = session.lastActivityAt instanceof Date
    ? session.lastActivityAt.getTime()
    : (session.lastActivityAt as Timestamp).toMillis()

  const ageMs = now - lastActivity

  if (session.status === 'active') {
    return ageMs > SESSION_TIMEOUTS.ACTIVITY_TO_PAUSED
  }

  if (session.status === 'paused') {
    return ageMs > SESSION_TIMEOUTS.PAUSED_TO_EXPIRED
  }

  return false
}

export function getSessionDuration(session: ShoppingSession): number {
  const start = session.startedAt instanceof Date
    ? session.startedAt.getTime()
    : (session.startedAt as Timestamp).toMillis()

  const end = session.endedAt
    ? (session.endedAt instanceof Date ? session.endedAt.getTime() : (session.endedAt as Timestamp).toMillis())
    : Date.now()

  return Math.floor((end - start) / 1000 / 60) // Duration in minutes
}

/**
 * Device fingerprinting helper
 */
export function generateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-' + Math.random().toString(36).substring(7)
  }

  const nav = window.navigator
  const screen = window.screen

  let uid = ''
  uid += nav.userAgent.replace(/\D+/g, '')
  uid += (nav.mimeTypes?.length || 0).toString()
  uid += (nav.plugins?.length || 0).toString()
  uid += (screen.height || 0).toString()
  uid += (screen.width || 0).toString()
  uid += (screen.pixelDepth || 0).toString()

  // Convert to base64 and truncate
  const encoded = typeof btoa !== 'undefined' ? btoa(uid) : Buffer.from(uid).toString('base64')
  return encoded.substring(0, 50)
}

/**
 * Device type detection
 */
export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop'

  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}
