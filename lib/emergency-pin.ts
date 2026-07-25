/**
 * emergency-pin — server-side hashing + brute-force policy for the personal emergency PIN.
 *
 * A 4–6 digit PIN has low entropy (10^4–10^6), so it is NEVER stored or compared in
 * plaintext and NEVER verified client-side:
 *   - hashed with Node's scrypt (memory-hard) + a per-PIN random salt,
 *   - compared with timingSafeEqual,
 *   - rate-limited with a lockout after repeated failures (the real protection for a
 *     low-entropy secret).
 *
 * Node built-ins only (no new dependency). Server-only — import from route handlers.
 * The crypto + policy are split into pure functions so the security-critical behaviour
 * is unit-testable without Firestore or wall-clock time.
 */

import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

const KEYLEN = 64

export interface HashedPin {
  hash: string // scrypt output, hex
  salt: string // hex
}

/** Hash a PIN with scrypt + a random salt (or a supplied salt, for verification). */
export function hashPin(pin: string, salt: string = randomBytes(16).toString('hex')): HashedPin {
  const hash = scryptSync(pin, salt, KEYLEN).toString('hex')
  return { hash, salt }
}

/** Constant-time verify of a candidate PIN against a stored hash+salt. */
export function verifyPin(pin: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(pin, salt, KEYLEN)
  const expected = Buffer.from(hash, 'hex')
  // timingSafeEqual throws on length mismatch — guard first (also constant enough here;
  // a wrong-length stored hash is not attacker-influenced).
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

/** A PIN is 4 to 6 digits. Rejects anything else before hashing. */
export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4,6}$/.test(pin)
}

// ---- brute-force policy (pure; `now` is injected so tests are deterministic) ----

export const EMERGENCY_PIN_MAX_ATTEMPTS = 5
export const EMERGENCY_PIN_LOCK_MS = 5 * 60 * 1000 // 5 minutes

export interface PinAttemptState {
  failedAttempts: number
  lockedUntil: number | null // epoch ms, or null
}

/** Once a lockout has elapsed, the next attempt starts from a clean slate. */
export function normalizeAfterExpiry(state: PinAttemptState, now: number): PinAttemptState {
  if (state.lockedUntil != null && state.lockedUntil <= now) {
    return { failedAttempts: 0, lockedUntil: null }
  }
  return state
}

export function isLocked(state: PinAttemptState, now: number): boolean {
  return state.lockedUntil != null && state.lockedUntil > now
}

/** Attempts left before the next failure triggers a lockout. */
export function remainingAttempts(state: PinAttemptState): number {
  return Math.max(0, EMERGENCY_PIN_MAX_ATTEMPTS - (state.failedAttempts || 0))
}

/**
 * Next attempt state after a verify result. Success clears everything; the Nth
 * consecutive failure arms the lockout window.
 */
export function nextAttemptState(state: PinAttemptState, success: boolean, now: number): PinAttemptState {
  if (success) return { failedAttempts: 0, lockedUntil: null }
  const failedAttempts = (state.failedAttempts || 0) + 1
  if (failedAttempts >= EMERGENCY_PIN_MAX_ATTEMPTS) {
    return { failedAttempts, lockedUntil: now + EMERGENCY_PIN_LOCK_MS }
  }
  return { failedAttempts, lockedUntil: null }
}
