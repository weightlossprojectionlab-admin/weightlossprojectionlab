'use client'

/**
 * Pending Request Actions
 *
 * Phase B slice 7: Approve / Decline buttons for a single pending request
 * row in the dashboard families panel. Mirrors the inline two-step pattern
 * from RemoveFamilyButton, but with two outcomes (approve or decline)
 * instead of one (revoke).
 *
 * Both actions hit dedicated endpoints (/approve and /decline) so the
 * audit trail is unambiguous and the server doesn't need to disambiguate
 * intent from a body field.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import { logger } from '@/lib/logger'

interface Props {
  tenantId: string
  requestId: string
}

export default function PendingRequestActions({ tenantId, requestId }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fire = async (action: 'approve' | 'decline') => {
    if (!auth?.currentUser) {
      setError('You are not signed in.')
      return
    }
    setBusy(action)
    setError(null)
    try {
      const token = await auth.currentUser.getIdToken()
      const csrfToken = getCSRFToken()
      const res = await fetch(
        `/api/tenant/${tenantId}/management-request/${requestId}/${action}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `${action} failed (${res.status})`)
      }
      router.refresh()
    } catch (err) {
      logger.error('[PendingRequestActions] failed', err as Error, { action })
      setError(err instanceof Error ? err.message : `${action} failed.`)
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fire('approve')}
          disabled={busy !== null}
          className="text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1 rounded"
        >
          {busy === 'approve' ? 'Approving…' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={() => fire('decline')}
          disabled={busy !== null}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
        >
          {busy === 'decline' ? 'Declining…' : 'Decline'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
