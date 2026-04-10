'use client'

/**
 * Revoke Staff Button
 *
 * Phase B slice 4: same inline two-step confirm pattern as RemoveFamilyButton
 * from slice 3. DELETEs /api/tenant/{tenantId}/invitations/{invitationId},
 * then router.refresh() so the staff list reflects the new revoked status.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import { logger } from '@/lib/logger'

interface Props {
  tenantId: string
  invitationId: string
  invitedEmail: string
  status: 'pending' | 'accepted'
}

export default function RevokeStaffButton({
  tenantId,
  invitationId,
  invitedEmail,
  status,
}: Props) {
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
        `/api/tenant/${tenantId}/invitations/${invitationId}`,
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
        throw new Error(data.error || `Revoke failed (${res.status})`)
      }
      router.refresh()
    } catch (err) {
      logger.error('[RevokeStaffButton] failed', err as Error)
      setError(err instanceof Error ? err.message : 'Revoke failed.')
      setState('confirming')
    }
  }

  const verb = status === 'pending' ? 'Cancel invitation' : 'Remove access'

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setState('confirming')}
        className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        aria-label={`${verb} for ${invitedEmail}`}
      >
        {verb}
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
          {state === 'removing' ? 'Working…' : 'Confirm'}
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
