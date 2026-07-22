import {
  hashPin,
  verifyPin,
  isValidPinFormat,
  normalizeAfterExpiry,
  isLocked,
  remainingAttempts,
  nextAttemptState,
  EMERGENCY_PIN_MAX_ATTEMPTS,
  EMERGENCY_PIN_LOCK_MS,
  type PinAttemptState,
} from './emergency-pin'

describe('emergency-pin hashing', () => {
  it('round-trips: the correct PIN verifies, a wrong one does not', () => {
    const { hash, salt } = hashPin('1234')
    expect(verifyPin('1234', hash, salt)).toBe(true)
    expect(verifyPin('1235', hash, salt)).toBe(false)
  })

  it('never stores the PIN in plaintext, and salts so identical PINs differ', () => {
    const a = hashPin('4321')
    const b = hashPin('4321')
    expect(a.hash).not.toContain('4321')
    expect(a.salt).not.toBe(b.salt) // random salt per hash
    expect(a.hash).not.toBe(b.hash) // ...so the stored hashes differ too
  })

  it('rejects a hash/PIN pair verified against the wrong salt', () => {
    const { hash } = hashPin('9999', 'saltA')
    expect(verifyPin('9999', hash, 'saltB')).toBe(false)
  })
})

describe('isValidPinFormat', () => {
  it.each(['1234', '12345', '123456'])('accepts %s (4–6 digits)', (pin) => {
    expect(isValidPinFormat(pin)).toBe(true)
  })
  it.each(['123', '1234567', '12a4', '', '  1234', null, undefined, 1234])('rejects %s', (pin) => {
    expect(isValidPinFormat(pin as unknown)).toBe(false)
  })
})

describe('brute-force lockout policy', () => {
  const fresh: PinAttemptState = { failedAttempts: 0, lockedUntil: null }
  const NOW = 1_000_000

  it('a success from any state clears failures + lockout', () => {
    const dirty: PinAttemptState = { failedAttempts: 3, lockedUntil: NOW + 1000 }
    expect(nextAttemptState(dirty, true, NOW)).toEqual({ failedAttempts: 0, lockedUntil: null })
  })

  it('counts failures and only arms the lockout on the Nth', () => {
    let state = fresh
    for (let i = 1; i < EMERGENCY_PIN_MAX_ATTEMPTS; i++) {
      state = nextAttemptState(state, false, NOW)
      expect(state.lockedUntil).toBeNull()
      expect(state.failedAttempts).toBe(i)
    }
    // the Nth consecutive failure locks
    state = nextAttemptState(state, false, NOW)
    expect(state.failedAttempts).toBe(EMERGENCY_PIN_MAX_ATTEMPTS)
    expect(state.lockedUntil).toBe(NOW + EMERGENCY_PIN_LOCK_MS)
    expect(isLocked(state, NOW)).toBe(true)
  })

  it('remainingAttempts counts down to zero and never negative', () => {
    expect(remainingAttempts(fresh)).toBe(EMERGENCY_PIN_MAX_ATTEMPTS)
    expect(remainingAttempts({ failedAttempts: 2, lockedUntil: null })).toBe(EMERGENCY_PIN_MAX_ATTEMPTS - 2)
    expect(remainingAttempts({ failedAttempts: 99, lockedUntil: null })).toBe(0)
  })

  it('a lock is active until it elapses, then normalizes to a clean slate', () => {
    const locked: PinAttemptState = { failedAttempts: 5, lockedUntil: NOW + EMERGENCY_PIN_LOCK_MS }
    expect(isLocked(locked, NOW)).toBe(true)
    // still locked one ms before expiry
    expect(isLocked(locked, NOW + EMERGENCY_PIN_LOCK_MS - 1)).toBe(true)
    // at/after expiry, no longer locked and a fresh window is restored
    const after = NOW + EMERGENCY_PIN_LOCK_MS
    expect(isLocked(locked, after)).toBe(false)
    expect(normalizeAfterExpiry(locked, after)).toEqual({ failedAttempts: 0, lockedUntil: null })
  })

  it('does not reset an unexpired lock', () => {
    const locked: PinAttemptState = { failedAttempts: 5, lockedUntil: NOW + 1000 }
    expect(normalizeAfterExpiry(locked, NOW)).toBe(locked)
  })
})
