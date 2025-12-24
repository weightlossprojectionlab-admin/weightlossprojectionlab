/**
 * Shopping Session Manager
 *
 * Manages shopping session lifecycle: start, heartbeat, pause, resume, end
 * Prevents bulk list operations while someone is actively shopping
 */

import {
  doc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  Timestamp,
  increment
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import type {
  ShoppingSession,
  ShoppingSessionCreateParams,
  ShoppingSessionStatus
} from '@/types/shopping-session'
import {
  SESSION_TIMEOUTS,
  generateDeviceId,
  detectDeviceType
} from '@/types/shopping-session'

export class ShoppingSessionManager {
  private sessionId: string | null = null
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null
  private readonly HEARTBEAT_INTERVAL_MS = SESSION_TIMEOUTS.HEARTBEAT_INTERVAL

  /**
   * Start a new shopping session
   * If user has existing active session, resume it instead of creating duplicate
   */
  async startSession(params: ShoppingSessionCreateParams): Promise<string> {
    try {
      // Check for existing active session by this user
      const existingSession = await this.findActiveUserSession(
        params.userId,
        params.householdId
      )

      if (existingSession) {
        logger.info('[ShoppingSession] Resuming existing session', {
          sessionId: existingSession.id,
          userId: params.userId
        })
        this.sessionId = existingSession.id
        await this.resumeSession(existingSession.id)
        this.startHeartbeat()
        return existingSession.id
      }

      // Create new session
      const sessionRef = doc(collection(db, 'shopping_sessions'))
      const now = Timestamp.now()
      const expiresAt = Timestamp.fromMillis(
        Date.now() + SESSION_TIMEOUTS.ABSOLUTE_MAX
      )

      const session: Omit<ShoppingSession, 'id'> = {
        householdId: params.householdId,
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        status: 'active',
        startedAt: now,
        lastActivityAt: now,
        expiresAt,
        deviceId: params.deviceId || generateDeviceId(),
        itemsScanned: 0,
        storeLocation: params.storeLocation,
        metadata: {
          appVersion: this.getAppVersion(),
          deviceType: detectDeviceType(),
          platform: this.getPlatform()
        }
      }

      await setDoc(sessionRef, session)
      this.sessionId = sessionRef.id

      // Start heartbeat
      this.startHeartbeat()

      // Register cleanup on page unload
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => this.endSession())
      }

      logger.info('[ShoppingSession] Session started', {
        sessionId: sessionRef.id,
        userId: params.userId,
        householdId: params.householdId
      })

      return sessionRef.id
    } catch (error) {
      logger.error('[ShoppingSession] Failed to start session', error as Error, {
        userId: params.userId
      })
      throw error
    }
  }

  /**
   * Start heartbeat updates every 30 seconds
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval as any)
    }

    this.heartbeatInterval = setInterval(async () => {
      await this.updateHeartbeat()
    }, this.HEARTBEAT_INTERVAL_MS)
  }

  /**
   * Update lastActivityAt to keep session alive
   */
  private async updateHeartbeat(): Promise<void> {
    if (!this.sessionId) return

    try {
      await updateDoc(doc(db, 'shopping_sessions', this.sessionId), {
        lastActivityAt: Timestamp.now()
      })
    } catch (error) {
      logger.error('[ShoppingSession] Heartbeat failed', error as Error, {
        sessionId: this.sessionId
      })
      // Continue - will retry next interval
    }
  }

  /**
   * Increment items scanned counter and update activity
   */
  async incrementItemsScanned(): Promise<void> {
    if (!this.sessionId) return

    try {
      await updateDoc(doc(db, 'shopping_sessions', this.sessionId), {
        itemsScanned: increment(1),
        lastActivityAt: Timestamp.now()
      })

      logger.info('[ShoppingSession] Item scanned', {
        sessionId: this.sessionId
      })
    } catch (error) {
      logger.error('[ShoppingSession] Failed to increment items', error as Error, {
        sessionId: this.sessionId
      })
    }
  }

  /**
   * Pause session (stops heartbeat)
   */
  async pauseSession(): Promise<void> {
    if (!this.sessionId) return

    try {
      await updateDoc(doc(db, 'shopping_sessions', this.sessionId), {
        status: 'paused',
        lastActivityAt: Timestamp.now()
      })

      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval as any)
        this.heartbeatInterval = null
      }

      logger.info('[ShoppingSession] Session paused', {
        sessionId: this.sessionId
      })
    } catch (error) {
      logger.error('[ShoppingSession] Failed to pause session', error as Error, {
        sessionId: this.sessionId
      })
    }
  }

  /**
   * Resume paused session
   */
  async resumeSession(sessionId?: string): Promise<void> {
    const targetSessionId = sessionId || this.sessionId
    if (!targetSessionId) return

    try {
      await updateDoc(doc(db, 'shopping_sessions', targetSessionId), {
        status: 'active',
        lastActivityAt: Timestamp.now()
      })

      this.sessionId = targetSessionId
      this.startHeartbeat()

      logger.info('[ShoppingSession] Session resumed', {
        sessionId: targetSessionId
      })
    } catch (error) {
      logger.error('[ShoppingSession] Failed to resume session', error as Error, {
        sessionId: targetSessionId
      })
    }
  }

  /**
   * End session and stop heartbeat
   */
  async endSession(): Promise<void> {
    if (!this.sessionId) return

    try {
      await updateDoc(doc(db, 'shopping_sessions', this.sessionId), {
        status: 'completed',
        endedAt: Timestamp.now()
      })

      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval as any)
        this.heartbeatInterval = null
      }

      logger.info('[ShoppingSession] Session ended', {
        sessionId: this.sessionId
      })

      this.sessionId = null
    } catch (error) {
      logger.error('[ShoppingSession] Failed to end session', error as Error, {
        sessionId: this.sessionId
      })
    }
  }

  /**
   * Force end session by ID (for admin override)
   */
  async forceEndSession(sessionId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'shopping_sessions', sessionId), {
        status: 'expired',
        endedAt: Timestamp.now()
      })

      logger.info('[ShoppingSession] Session force-ended', { sessionId })
    } catch (error) {
      logger.error('[ShoppingSession] Failed to force-end session', error as Error, {
        sessionId
      })
      throw error
    }
  }

  /**
   * Find user's active session in household
   */
  private async findActiveUserSession(
    userId: string,
    householdId: string
  ): Promise<ShoppingSession | null> {
    try {
      const q = query(
        collection(db, 'shopping_sessions'),
        where('userId', '==', userId),
        where('householdId', '==', householdId),
        where('status', '==', 'active'),
        limit(1)
      )

      const snapshot = await getDocs(q)
      if (snapshot.empty) return null

      const sessionDoc = snapshot.docs[0]
      return {
        id: sessionDoc.id,
        ...sessionDoc.data()
      } as ShoppingSession
    } catch (error) {
      logger.error('[ShoppingSession] Error finding active session', error as Error, {
        userId,
        householdId
      })
      return null
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId
  }

  /**
   * Check if session is active
   */
  hasActiveSession(): boolean {
    return this.sessionId !== null && this.heartbeatInterval !== null
  }

  /**
   * Get app version from package.json or environment
   */
  private getAppVersion(): string {
    // Try to get from environment or package.json
    if (typeof process !== 'undefined' && process.env.npm_package_version) {
      return process.env.npm_package_version
    }
    return '1.0.0' // Default fallback
  }

  /**
   * Get platform information
   */
  private getPlatform(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.platform
    }
    return 'unknown'
  }
}

/**
 * Singleton instance for global use
 */
export const shoppingSessionManager = new ShoppingSessionManager()

/**
 * Get all active sessions for a household
 */
export async function getActiveHouseholdSessions(
  householdId: string
): Promise<ShoppingSession[]> {
  try {
    const threeMinutesAgo = Timestamp.fromMillis(
      Date.now() - SESSION_TIMEOUTS.ACTIVITY_TO_PAUSED
    )

    const q = query(
      collection(db, 'shopping_sessions'),
      where('householdId', '==', householdId),
      where('status', '==', 'active'),
      where('lastActivityAt', '>', threeMinutesAgo)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ShoppingSession))
  } catch (error) {
    logger.error('[ShoppingSession] Error fetching household sessions', error as Error, {
      householdId
    })
    return []
  }
}

/**
 * Check if household has any active shopping sessions
 */
export async function hasActiveShoppingSessions(
  householdId: string,
  excludeUserId?: string
): Promise<boolean> {
  const sessions = await getActiveHouseholdSessions(householdId)

  if (excludeUserId) {
    return sessions.some(s => s.userId !== excludeUserId)
  }

  return sessions.length > 0
}
