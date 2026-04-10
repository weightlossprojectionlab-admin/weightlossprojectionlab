'use client'

/**
 * Remove Family Button
 *
 * Inline two-step confirm: idle → confirming → removing. Once confirmed,
 * DELETEs /api/tenant/{tenantId}/managed-families/{familyId} with Bearer +
 * CSRF, then router.refresh() so the server-rendered families table re-fetches.
 *
 * No modal library, no portal — confirmation lives inline in the table cell.
 * Cleaner than window.confirm() and avoids pulling in a dialog dependency.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import { logger } from '@/lib/logger'

interface Props {
  tenantId: string
  familyId: string
  familyName: string
}

export default function RemoveFamilyButton({ tenantId, familyId, familyName }: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'confirming' | 'removing'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!auth?.currentUser) {
      setError('You are not signed in.')
      return
    }
    setState('removing')
    setError(null)
    try {
      const token = await auth.currentUser.getIdToken()
      const csrfToken = getCSRFToken()
      const res = await fetch(
        `/api/tenant/${tenantId}/managed-families/${familyId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Remove failed (${res.status})`)
      }
      // Re-fetch the table. The row will be gone after this.
      router.refresh()
    } catch (err) {
      logger.error('[RemoveFamilyButton] failed', err as Error)
      setError(err instanceof Error ? err.message : 'Remove failed.')
      setState('confirming')
    }
  }

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setState('confirming')}
        className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        aria-label={`Remove ${familyName}`}
      >
        Remove
      </button>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={state === 'removing'}
          className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 px-2 py-1 rounded"
        >
          {state === 'removing' ? 'Removing…' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={() => {
            setState('idle')
            setError(null)
          }}
          disabled={state === 'removing'}
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
