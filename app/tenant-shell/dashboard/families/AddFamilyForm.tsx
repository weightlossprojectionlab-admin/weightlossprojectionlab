'use client'

/**
 * Add Family by Email
 *
 * Phase B slice 2: lets the franchise owner attach an existing WPL consumer
 * family to their practice by typing the family's email. Skips the
 * request/approve flow entirely (slices 6-7 will add that). Until then this
 * is the only way to populate the Managed Families list.
 *
 * POSTs to /api/tenant/{tenantId}/managed-families with a Bearer token + CSRF
 * header. On success, calls router.refresh() so the server-rendered families
 * table re-fetches and shows the newly attached family.
 */

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import { logger } from '@/lib/logger'

interface Props {
  tenantId: string
}

export default function AddFamilyForm({ tenantId }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
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
      const res = await fetch(`/api/tenant/${tenantId}/managed-families`, {
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
        throw new Error(data.error || `Add failed (${res.status})`)
      }

      if (data.alreadyManaged) {
        setMessage({
          type: 'info',
          text: `${trimmed} is already managed by your practice.`,
        })
      } else {
        setMessage({
          type: 'success',
          text: `Added ${trimmed} to your practice.`,
        })
      }
      setEmail('')
      // Re-fetch the server-rendered families table.
      router.refresh()
      // Keep focus in the input for rapid bulk-attach.
      inputRef.current?.focus()
    } catch (err) {
      logger.error('[AddFamilyForm] attach failed', err as Error)
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Add failed.' })
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
        htmlFor="add-family-email"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Add a family by email
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          ref={inputRef}
          id="add-family-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="family@example.com"
          autoComplete="email"
          disabled={submitting}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting || !email.trim()}
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? 'Adding…' : 'Add Family'}
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
        Enter any email address. If the family doesn&rsquo;t have a Wellness
        Projection Lab account yet, we&rsquo;ll create one for them automatically.
        They&rsquo;ll appear in your list immediately.
      </p>

      {message && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : message.type === 'info'
              ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </form>
  )
}
