'use client'

/**
 * Invite Staff Form
 *
 * Phase B slice 4: franchise admin invites a new staff member by email.
 * POSTs /api/tenant/{tenantId}/invitations with Bearer + CSRF, then
 * router.refresh() so the new pending invitation appears in the staff list.
 *
 * Mirrors the AddFamilyForm pattern from slice 2 — same input shape, same
 * three-state messaging, same auto-refocus for rapid bulk invites.
 */

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import { logger } from '@/lib/logger'

interface Props {
  tenantId: string
}

export default function InviteStaffForm({ tenantId }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setMessage({ type: 'error', text: 'Please enter an email address.' })
      return
    }
    if (!auth?.currentUser) {
      setMessage({ type: 'error', text: 'You are not signed in.' })
      return
    }

    setSubmitting(true)
    try {
      const token = await auth.currentUser.getIdToken()
      const csrfToken = getCSRFToken()
      const res = await fetch(`/api/tenant/${tenantId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || `Invite failed (${res.status})`)
      }

      setMessage({
        type: 'success',
        text: `Invitation sent to ${trimmed}. They have 7 days to accept.`,
      })
      setEmail('')
      router.refresh()
      inputRef.current?.focus()
    } catch (err) {
      logger.error('[InviteStaffForm] failed', err as Error)
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Invite failed.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 mb-6"
    >
      <label
        htmlFor="invite-staff-email"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Invite a staff member
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          ref={inputRef}
          id="invite-staff-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="staff@example.com"
          autoComplete="email"
          disabled={submitting}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? 'Sending…' : 'Send Invitation'}
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
        We&rsquo;ll email a one-time acceptance link. Staff don&rsquo;t need an
        existing Wellness Projection Lab account — one will be created when
        they accept.
      </p>

      {message && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </form>
  )
}
