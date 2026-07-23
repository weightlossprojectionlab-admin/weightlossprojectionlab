'use client'

/**
 * emergency-pin-client — thin browser wrappers over the emergency-PIN API routes.
 *
 * All verification/hashing happens server-side (lib/emergency-pin); this only ferries the
 * PIN over an authenticated request and surfaces the result. One place so the gate + the
 * setup UI call the same endpoints the same way (DRY).
 */

import { logger } from '@/lib/logger'
import { getCSRFToken } from '@/lib/csrf'

async function authHeaders(): Promise<Record<string, string> | null> {
  try {
    const { getAuth } = await import('firebase/auth')
    const user = getAuth().currentUser
    if (!user) return null
    const token = await user.getIdToken()
    // X-CSRF-Token is required on POST/DELETE by proxy.ts — Bearer auth does NOT exempt
    // a request from CSRF. Omitting it 403s in production (it's only skipped in dev).
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-CSRF-Token': getCSRFToken(),
    }
  } catch (e) {
    logger.error('[emergency-pin-client] Failed to get auth token', e as Error)
    return null
  }
}

/** Does the signed-in user have an emergency PIN set? Defaults false on any error. */
export async function getEmergencyPinStatus(): Promise<boolean> {
  const headers = await authHeaders()
  if (!headers) return false
  try {
    const res = await fetch('/api/user-profile/emergency-pin', { headers })
    if (!res.ok) return false
    const data = await res.json()
    return !!data.isSet
  } catch {
    return false
  }
}

export interface SetPinResult {
  ok: boolean
  error?: string
}

/** Set or change the PIN. `currentPin` is required by the server when changing. */
export async function setEmergencyPin(pin: string, currentPin?: string): Promise<SetPinResult> {
  const headers = await authHeaders()
  if (!headers) return { ok: false, error: 'Not signed in.' }
  try {
    const res = await fetch('/api/user-profile/emergency-pin', {
      method: 'POST',
      headers,
      body: JSON.stringify({ pin, currentPin }),
    })
    const data = await res.json().catch(() => ({}))
    return res.ok ? { ok: true } : { ok: false, error: data.error || 'Could not save PIN.' }
  } catch {
    return { ok: false, error: 'Network error. Try again.' }
  }
}

/** Remove the PIN (requires the current PIN). */
export async function removeEmergencyPin(currentPin: string): Promise<SetPinResult> {
  const headers = await authHeaders()
  if (!headers) return { ok: false, error: 'Not signed in.' }
  try {
    const res = await fetch('/api/user-profile/emergency-pin', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ currentPin }),
    })
    const data = await res.json().catch(() => ({}))
    return res.ok ? { ok: true } : { ok: false, error: data.error || 'Could not remove PIN.' }
  } catch {
    return { ok: false, error: 'Network error. Try again.' }
  }
}

export interface VerifyPinResult {
  success: boolean
  locked?: boolean
  remainingAttempts?: number
  retryAfterMs?: number
  error?: string
}

/** Verify the PIN at the unlock gate. Reflects the server's rate-limit state. */
export async function verifyEmergencyPin(pin: string): Promise<VerifyPinResult> {
  const headers = await authHeaders()
  if (!headers) return { success: false, error: 'Not signed in.' }
  try {
    const res = await fetch('/api/user-profile/emergency-pin/verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ pin }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.success) return { success: true }
    return {
      success: false,
      locked: !!data.locked,
      remainingAttempts: data.remainingAttempts,
      retryAfterMs: data.retryAfterMs,
      error: data.error,
    }
  } catch {
    return { success: false, error: 'Network error. Try again.' }
  }
}
