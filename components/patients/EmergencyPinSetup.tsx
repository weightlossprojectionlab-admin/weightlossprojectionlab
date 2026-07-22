'use client'

/**
 * EmergencyPinSetup — set / change / remove the personal emergency-unlock PIN.
 *
 * The PIN is the reliable, device-independent fallback behind biometrics at the emergency
 * gate (a dead sensor must never block access). Hashing + rate-limiting are server-side
 * (lib/emergency-pin); this only collects the digits and shows the result.
 */

import { useEffect, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { getEmergencyPinStatus, setEmergencyPin, removeEmergencyPin } from '@/lib/emergency-pin-client'

interface EmergencyPinSetupProps {
  isOpen: boolean
  onClose: () => void
  /** Fired after a successful set/change/remove so callers can refresh their status. */
  onChanged?: (isSet: boolean) => void
}

const PIN_RE = /^\d{4,6}$/

function PinField({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}) {
  return (
    <label className="block text-left">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-lg tracking-widest"
        placeholder="4–6 digits"
      />
    </label>
  )
}

export default function EmergencyPinSetup({ isOpen, onClose, onChanged }: EmergencyPinSetupProps) {
  const [isSet, setIsSet] = useState<boolean | null>(null)
  const [mode, setMode] = useState<'change' | 'remove'>('change')
  const [currentPin, setCurrentPin] = useState('')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setCurrentPin('')
    setPin('')
    setConfirm('')
    setError(null)
    setDone(null)
    setMode('change')
    setIsSet(null)
    getEmergencyPinStatus().then(setIsSet)
  }, [isOpen])

  if (!isOpen) return null

  const submit = async () => {
    setError(null)
    if (mode === 'remove') {
      if (!PIN_RE.test(currentPin)) return setError('Enter your current PIN.')
    } else {
      if (isSet && !PIN_RE.test(currentPin)) return setError('Enter your current PIN.')
      if (!PIN_RE.test(pin)) return setError('New PIN must be 4 to 6 digits.')
      if (pin !== confirm) return setError('The two PINs don’t match.')
    }

    setBusy(true)
    const res =
      mode === 'remove'
        ? await removeEmergencyPin(currentPin)
        : await setEmergencyPin(pin, isSet ? currentPin : undefined)
    setBusy(false)

    if (!res.ok) return setError(res.error || 'Something went wrong.')
    const nowSet = mode !== 'remove'
    setDone(mode === 'remove' ? 'Emergency PIN removed.' : isSet ? 'Emergency PIN updated.' : 'Emergency PIN set.')
    onChanged?.(nowSet)
    setTimeout(onClose, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div role="dialog" aria-modal="true" aria-label="Emergency PIN" className="w-full sm:max-w-sm bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {isSet ? 'Emergency PIN' : 'Set an emergency PIN'}
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" aria-label="Close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            A 4–6 digit PIN unlocks the emergency record when biometrics aren’t available. It’s
            stored securely and rate-limited against guessing.
          </p>

          {done ? (
            <p className="text-sm font-medium text-green-700 dark:text-green-400" role="status">{done}</p>
          ) : isSet === null ? (
            <div className="flex justify-center py-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            </div>
          ) : (
            <>
              {isSet && (
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={() => { setMode('change'); setError(null) }}
                    className={`px-3 py-1 rounded-full border ${mode === 'change' ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'border-gray-300 dark:border-gray-700'}`}
                  >
                    Change
                  </button>
                  <button
                    onClick={() => { setMode('remove'); setError(null) }}
                    className={`px-3 py-1 rounded-full border ${mode === 'remove' ? 'bg-red-600 text-white' : 'border-gray-300 dark:border-gray-700'}`}
                  >
                    Remove
                  </button>
                </div>
              )}

              {isSet && <PinField label="Current PIN" value={currentPin} onChange={setCurrentPin} autoFocus />}
              {mode === 'change' && (
                <>
                  <PinField label={isSet ? 'New PIN' : 'PIN'} value={pin} onChange={setPin} autoFocus={!isSet} />
                  <PinField label="Confirm PIN" value={confirm} onChange={setConfirm} />
                </>
              )}

              {error && <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">{error}</p>}

              <button
                onClick={submit}
                disabled={busy}
                className={`w-full py-3 rounded-lg font-semibold text-white disabled:opacity-60 ${mode === 'remove' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-black dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white'}`}
              >
                {busy ? 'Saving…' : mode === 'remove' ? 'Remove PIN' : isSet ? 'Update PIN' : 'Set PIN'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
