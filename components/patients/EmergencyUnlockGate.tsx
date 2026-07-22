'use client'

/**
 * EmergencyUnlockGate — the deliberate-access + audit layer in front of the
 * assembled emergency record (allergies, code status, meds, contacts).
 *
 * Design (see plan "PART B — Emergency Layer"): the patient page already requires
 * an authenticated, authorized caregiver (RBAC) just to load, so this is NOT a hard
 * wall — it is a biometric-first, deliberate "enter emergency mode" step that gives
 * an audit trail (who opened the record) and, later, per-person revocation.
 *
 * Honesty / availability rule (same spirit as the dosage work): NEVER lock a caregiver
 * out of their own emergency data. So this gate FAILS OPEN when no unlock is configured
 * — a single deliberate tap reveals the record, with a calm nudge to set up quick unlock
 * for next time. Summoning help (Alert family / Call 911) is never gated; it lives above
 * this gate and is always reachable.
 *
 * Biometric-first: WebAuthn get() requires a user gesture, so the biometric unlock is
 * the prominent PRIMARY button (a tap), not an auto-fire on mount (browsers reject that).
 * A personal-PIN fallback + enforcement lands in the follow-on phase; today a caregiver
 * with a registered credential who can't use their sensor can still "Open anyway" so a
 * dead sensor never blocks an actual emergency.
 */

import { useEffect, useState } from 'react'
import { LockClosedIcon, FingerPrintIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import {
  isBiometricSupported,
  hasBiometricCredential,
  authenticateBiometric,
  getBiometricErrorMessage,
} from '@/lib/webauthn'

interface EmergencyUnlockGateProps {
  patientName: string
  onUnlock: () => void
}

export default function EmergencyUnlockGate({ patientName, onUnlock }: EmergencyUnlockGateProps) {
  const { user } = useAuth()
  const [checking, setChecking] = useState(true)
  const [biometricReady, setBiometricReady] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Is a biometric unlock actually usable here? (supported by this browser/device AND
  // the signed-in caregiver has registered a credential). Determines whether we show the
  // biometric-first path or fall straight through to the fail-open "Open" action.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!user?.uid) return
        const [supported, registered] = await Promise.all([
          isBiometricSupported(),
          hasBiometricCredential(user.uid),
        ])
        if (!cancelled) setBiometricReady(supported && registered)
      } catch {
        if (!cancelled) setBiometricReady(false)
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  const handleBiometric = async () => {
    if (!user?.uid) return
    setAuthenticating(true)
    setError(null)
    try {
      const ok = await authenticateBiometric(user.uid)
      if (ok) {
        onUnlock()
      } else {
        setError('Biometric verification was cancelled.')
      }
    } catch (err) {
      setError(getBiometricErrorMessage(err))
    } finally {
      setAuthenticating(false)
    }
  }

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
      ) : biometricReady ? (
        <div className="space-y-3">
          {/* Biometric-first: the prominent primary unlock. */}
          <button
            type="button"
            onClick={handleBiometric}
            disabled={authenticating}
            className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-base font-semibold text-white shadow-sm hover:bg-red-700 active:scale-[0.98] disabled:opacity-60"
          >
            <FingerPrintIcon className="h-5 w-5" aria-hidden />
            {authenticating ? 'Verifying…' : 'Unlock with biometrics'}
          </button>
          {/* Fail-safe escape: a dead/unavailable sensor must never block an actual
              emergency. Hardened into a PIN fallback in the follow-on phase. */}
          <div>
            <button
              type="button"
              onClick={onUnlock}
              className="text-sm font-medium text-red-700 underline underline-offset-2 hover:text-red-800 dark:text-red-300"
            >
              Can&apos;t use biometrics? Open anyway
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Fail open: nothing configured — never withhold a caregiver's own emergency
              data. One deliberate tap, plus a nudge to set up quick unlock next time. */}
          <button
            type="button"
            onClick={onUnlock}
            className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-base font-semibold text-white shadow-sm hover:bg-red-700 active:scale-[0.98]"
          >
            Open emergency info
          </button>
          <div>
            <Link
              href="/security"
              className="text-sm font-medium text-red-700 underline underline-offset-2 hover:text-red-800 dark:text-red-300"
            >
              Set up quick unlock for faster, audited access →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
