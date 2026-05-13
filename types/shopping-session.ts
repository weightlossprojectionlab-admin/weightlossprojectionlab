/**
 * Shopping Session Types
 *
 * Tracks active shopping sessions to prevent bulk list operations
 * while someone is actively shopping at a store
 */

import type { HouseholdRole } from './household-permissions'
import type { Timestamp } from 'firebase/firestore'
import type { ProductCategory } from './shopping'

export type ShoppingSessionStatus = 'active' | 'paused' | 'completed' | 'expired'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

/**
 * Per-scan event captured during a session. Forms the substrate for
 * Phase C ML — per-(caregiver, store) learned aisle-visit order.
 *
 * Today's `itemsScanned: number` is a count only; this array preserves
 * sequence + per-event timing + category context so a future model
 * can answer "in this store, this caregiver typically picks tier-2
 * (produce) before tier-3 (deli)" or "frozen always last regardless
 * of aisle position." The rule-baseline sort already encodes the
 * universal "frozen last" floor; ML adds the family-specific layer.
 *
 * Size: one trip is ≤ 100 items; each event ≤ 200 bytes; total
 * embedded size ≤ 20KB. Far below Firestore's 1MB doc limit. Keeping
 * it embedded (vs. a separate `scan_events` collection) avoids fan-
 * out reads when computing per-session aisle traversal.
 *
 * Field intent:
 *   - itemId: the shopping_items row scanned
 *   - scannedAt: server-side Timestamp captured at the moment the
 *     scan event was recorded; the SEQUENCE matters more than absolute
 *     time for the ML use case, but timing also enables "duration
 *     between adjacent scans" derived features
 *   - category: copied from the item at scan time so an ML model
 *     doesn't have to re-fetch items to know what tier each scan was
 *     in. Optional because legacy callers (SequentialShoppingFlow's
 *     count-only behavior) may not pass it.
 */
export interface ScanEvent {
  itemId: string
  scannedAt: Timestamp | Date
  category?: ProductCategory
}

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
  itemsScanned: number // Progress indicator (count only)
  /**
   * Sequential per-scan events — substrate for the Phase C ML aisle-
   * order learner. Optional because legacy sessions (pre-rule v2
   * commit) and the count-only path don't populate it. Consumers
   * (analytics, ML) tolerate undefined / empty arrays.
   */
  scanSequence?: ScanEvent[]
  storeLocation?: {
    name: string
    latitude: number
    longitude: number
  }
  /**
   * Catalog id of the chain this trip is being run at (Phase 0b).
   * Distinct from `storeLocation.name` (free text like "Walmart
   * Supercenter #1234") — `storeId` is the canonical catalog id
   * ('walmart') that joins against ShoppingItem.assignedStoreId
   * for filtering.
   *
   * Set paths:
   *   • Caregiver picks a store on the Start Shopping picker;
   *     /shopping/active passes ?store=walmart through to the
   *     session at creation time.
   *   • Receipt OCR (lib/apply-receipt-prices.ts) corrects this
   *     post-checkout if the caregiver actually ended up somewhere
   *     different — receipt is ground truth.
   */
  storeId?: string
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
  /** Catalog id of the chain — set from the Start Shopping picker.
   *  See ShoppingSession.storeId for semantics. */
  storeId?: string
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
