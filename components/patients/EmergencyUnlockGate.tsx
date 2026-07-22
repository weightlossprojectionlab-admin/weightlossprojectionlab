'use client'

/**
 * EmergencyUnlockGate — the deliberate-access + audit layer in front of the assembled
 * emergency record (allergies, code status, meds, contacts).
 *
 * The patient page already requires an authenticated, authorized caregiver (RBAC) to load,
 * so this is not a hard wall on its own — it's a biometric-first, deliberate "enter
 * emergency mode" step that adds an audit trail and per-person unlock.
 *
 * Two postures, chosen by what the caregiver has configured:
 *   - ENFORCING (biometric credential and/or personal PIN set): must pass one of them.
 *     Biometric-first (a tap); the PIN is the reliable, device-independent fallback so a
 *     dead/absent sensor never blocks access. If only biometric is set and the sensor
 *     fails, "Add a PIN" is offered as the availability escape (they're already signed in).
 *   - FAIL-OPEN (nothing configured): never withhold a caregiver's own emergency data —
 *     one deliberate tap opens it, with a nudge to set up quick unlock for next time.
 *
 * Summoning help (Alert family / Call 911) is never gated; it lives ABOVE this gate.
 */

import { useEffect, useState } from 'react'
import { LockClosedIcon, FingerPrintIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import {
  isBiometricSupported,
  hasBiometricCredential,
  authenticateBiometric,
  getBiometricErrorMessage,
} from '@/lib/webauthn'
import { getEmergencyPinStatus, verifyEmergencyPin } from '@/lib/emergency-pin-client'
import EmergencyPinSetup from '@/components/patients/EmergencyPinSetup'

interface EmergencyUnlockGateProps {
  patientName: string
  onUnlock: () => void
}

const PIN_RE = /^\d{4,6}$/

export default function EmergencyUnlockGate({ patientName, onUnlock }: EmergencyUnlockGateProps) {
  const { user } = useAuth()
  const [checking, setChecking] = useState(true)
  const [biometricReady, setBiometricReady] = useState(false)
  const [pinSet, setPinSet] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // PIN entry
  const [showPin, setShowPin] = useState(false)
  const [pinValue, setPinValue] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)

  const [showSetup, setShowSetup] = useState(false)

  const loadStatus = async () => {
    if (!user?.uid) return
    const [supported, registered, hasPin] = await Promise.all([
      isBiometricSupported(),
      hasBiometricCredential(user.uid),
      getEmergencyPinStatus(),
    ])
    setBiometricReady(supported && registered)
    setPinSet(hasPin)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!user?.uid) return
        const [supported, registered, hasPin] = await Promise.all([
          isBiometricSupported(),
          hasBiometricCredential(user.uid),
          getEmergencyPinStatus(),
        ])
        if (cancelled) return
        setBiometricReady(supported && registered)
        setPinSet(hasPin)
        // If PIN is the only method, go straight to entry.
        setShowPin(hasPin && !(supported && registered))
      } catch {
        /* leave everything false → fail-open */
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  const enforcing = biometricReady || pinSet

  const handleBiometric = async () => {
    if (!user?.uid) return
    setAuthenticating(true)
    setError(null)
    try {
      const ok = await authenticateBiometric(user.uid)
      if (ok) onUnlock()
      else setError('Biometric verification was cancelled.')
    } catch (err) {
      setError(getBiometricErrorMessage(err))
    } finally {
      setAuthenticating(false)
    }
  }

  const handleVerifyPin = async () => {
    if (!PIN_RE.test(pinValue)) {
      setPinError('Enter your 4–6 digit PIN.')
      return
    }
    setVerifying(true)
    setPinError(null)
    const res = await verifyEmergencyPin(pinValue)
    setVerifying(false)
    if (res.success) {
      onUnlock()
      return
    }
    setPinValue('')
    if (res.locked) {
      const mins = Math.max(1, Math.ceil((res.retryAfterMs || 0) / 60000))
      setPinError(`Too many attempts. Try again in ${mins} min, or use biometrics.`)
    } else if (typeof res.remainingAttempts === 'number') {
      setPinError(`Incorrect PIN. ${res.remainingAttempts} ${res.remainingAttempts === 1 ? 'try' : 'tries'} left.`)
    } else {
      setPinError(res.error || 'Incorrect PIN.')
    }
  }

  const primaryBtn =
    'inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-base font-semibold text-white shadow-sm hover:bg-red-700 active:scale-[0.98] disabled:opacity-60'
  const linkBtn = 'text-sm font-medium text-red-700 underline underline-offset-2 hover:text-red-800 dark:text-red-300'

  return (
    <div className="rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-950/30 p-6 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white">
        <LockClosedIcon className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="text-lg font-bold text-red-800 dark:text-red-200">Emergency access</h2>
      <p className="mx-auto mt-1 mb-5 max-w-sm text-sm text-red-700/80 dark:text-red-300/80">
        Confirm it&apos;s you to open {patientName}&apos;s emergency record. This is logged so the
        family can see who viewed it.
      </p>

      {error && (
        <p className="mx-auto mb-4 max-w-sm text-sm font-medium text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      )}

      {checking ? (
        <div className="flex items-center justify-center py-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
        </div>
      ) : enforcing ? (
        <div className="space-y-3">
          {/* Biometric-first, unless the caregiver switched to the PIN. */}
          {biometricReady && !showPin && (
            <button type="button" onClick={handleBiometric} disabled={authenticating} className={primaryBtn}>
              <FingerPrintIcon className="h-5 w-5" aria-hidden />
              {authenticating ? 'Verifying…' : 'Unlock with biometrics'}
            </button>
          )}

          {/* PIN entry — the reliable fallback. Shown when chosen, or when it's the only method. */}
          {pinSet && showPin && (
            <div className="mx-auto max-w-xs space-y-2">
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                maxLength={6}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                aria-label="Emergency PIN"
                placeholder="Enter PIN"
                className="w-full rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-gray-900 px-3 py-3 text-center text-lg tracking-widest"
              />
              {pinError && (
                <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">{pinError}</p>
              )}
              <button type="button" onClick={handleVerifyPin} disabled={verifying} className={primaryBtn}>
                {verifying ? 'Checking…' : 'Unlock with PIN'}
              </button>
            </div>
          )}

          {/* Switch between the two configured methods. */}
          {biometricReady && pinSet && (
            <button type="button" onClick={() => { setShowPin((s) => !s); setError(null); setPinError(null) }} className={linkBtn}>
              {showPin ? 'Use biometrics instead' : 'Use PIN instead'}
            </button>
          )}

          {/* Availability escape: biometric-only + sensor won't cooperate → add a reliable
              PIN now (already signed in). Not an open-anyway bypass. */}
          {biometricReady && !pinSet && (
            <div>
              <button type="button" onClick={() => setShowSetup(true)} className={linkBtn}>
                Can&apos;t use biometrics? Add a PIN
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Fail open: nothing configured — never withhold a caregiver's own emergency data. */}
          <button type="button" onClick={onUnlock} className={primaryBtn}>
            Open emergency info
          </button>
          <div>
            <button type="button" onClick={() => setShowSetup(true)} className={linkBtn}>
              Set up quick unlock for faster, audited access →
            </button>
          </div>
        </div>
      )}

      <EmergencyPinSetup
        isOpen={showSetup}
        onClose={() => setShowSetup(false)}
        onChanged={async () => {
          // Re-read posture; if a PIN now exists, offer entry.
          await loadStatus()
          setShowPin(true)
        }}
      />
    </div>
  )
}
