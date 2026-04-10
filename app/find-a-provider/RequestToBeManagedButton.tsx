'use client'

/**
 * Request to be Managed Button
 *
 * Phase B slice 7: family-side CTA on each provider card. Three states:
 *
 *   idle      → "Request to be managed"
 *   composing → small inline form with optional message + Submit / Cancel
 *   submitted → "Request sent" badge (persists for the session)
 *
 * Lives inside the provider card on /find-a-provider. Clicks stop event
 * propagation so they don't trigger the card's parent <a> link.
 *
 * Auth: requires the user to be signed in. If not signed in, the form
 * shows a "sign in to request" message linking to /auth.
 */

import { useEffect, useState, type MouseEvent } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getCSRFToken } from '@/lib/csrf'
import { logger } from '@/lib/logger'

interface Props {
  tenantId: string
  tenantName: string
}

export default function RequestToBeManagedButton({ tenantId, tenantName }: Props) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [state, setState] = useState<'idle' | 'composing' | 'submitting' | 'submitted'>(
    'idle'
  )
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth) {
      setSignedIn(false)
      return
    }
    const unsub = onAuthStateChanged(auth, user => setSignedIn(!!user))
    return () => unsub()
  }, [])

  const stop = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleStart = (e: MouseEvent) => {
    stop(e)
    setError(null)
    setState('composing')
  }

  const handleCancel = (e: MouseEvent) => {
    stop(e)
    setState('idle')
    setError(null)
    setMessage('')
  }

  const handleSubmit = async (e: MouseEvent) => {
    stop(e)
    if (!auth?.currentUser) {
      setError('You need to sign in first.')
      return
    }
    setState('submitting')
    setError(null)
    try {
      const token = await auth.currentUser.getIdToken()
      const csrfToken = getCSRFToken()
      const res = await fetch(`/api/tenant/${tenantId}/management-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ message: message.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`)
      }
      setState('submitted')
    } catch (err) {
      logger.error('[RequestToBeManagedButton] failed', err as Error)
      setError(err instanceof Error ? err.message : 'Request failed.')
      setState('composing')
    }
  }

  if (signedIn === null) {
    // Not yet known — render a placeholder so layout doesn't shift.
    return (
      <button
        type="button"
        disabled
        className="text-xs font-medium text-gray-400"
      >
        Loading…
      </button>
    )
  }

  if (state === 'submitted') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Request sent
      </span>
    )
  }

  if (state === 'composing' || state === 'submitting') {
    if (!signedIn) {
      return (
        <div onClick={stop} className="space-y-1">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            <a href="/auth" className="text-blue-600 dark:text-blue-400 underline">
              Sign in
            </a>{' '}
            to request management.
          </p>
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )
    }
    return (
      <div onClick={stop} className="space-y-2">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          onClick={stop}
          placeholder={`Optional note for ${tenantName}`}
          rows={2}
          maxLength={1000}
          disabled={state === 'submitting'}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:opacity-50"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={state === 'submitting'}
            className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-2 py-1 rounded"
          >
            {state === 'submitting' ? 'Sending…' : 'Send request'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={state === 'submitting'}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleStart}
      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
    >
      Request to be managed
    </button>
  )
}
