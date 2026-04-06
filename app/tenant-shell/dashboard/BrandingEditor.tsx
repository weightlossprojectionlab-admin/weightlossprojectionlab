'use client'

/**
 * Branding Editor
 *
 * Client component. Loads the current Firebase user, verifies the tenantId
 * custom claim matches this tenant, and lets the franchise owner edit
 * their public branding fields.
 *
 * Auth gating: server page already 404s for missing tenant; this component
 * checks the user's claims on mount and redirects to /login on mismatch.
 *
 * Submits to PATCH /api/tenant/branding with a Bearer token. The API route
 * persists, audit-logs, and revalidates the tenant landing path.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { logger } from '@/lib/logger'

interface BrandingState {
  logoUrl: string
  primaryColor: string
  companyName: string
  supportEmail: string
}

interface Props {
  tenantId: string
  initial: BrandingState
}

// Same HSL parsing logic as app/tenant-shell/page.tsx and layout.tsx.
// Inlined here intentionally — we'll extract a shared util on the next reuse
// (rule of three).
function toCss(color: string): string {
  return /^\d/.test(color) ? `hsl(${color})` : color
}

export default function BrandingEditor({ tenantId, initial }: Props) {
  const router = useRouter()
  const [state, setState] = useState<BrandingState>(initial)
  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!auth) {
      router.replace('/login?next=/dashboard')
      return
    }
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        router.replace('/login?next=/dashboard')
        return
      }
      try {
        const tokenResult = await user.getIdTokenResult()
        const claims = tokenResult.claims as any
        const isSuperAdmin = claims.role === 'admin'
        const isFranchiseAdminForThis =
          claims.tenantRole === 'franchise_admin' && claims.tenantId === tenantId
        if (!isSuperAdmin && !isFranchiseAdminForThis) {
          router.replace('/login?next=/dashboard')
          return
        }
        setAuthorized(true)
      } finally {
        setAuthChecked(true)
      }
    })
    return () => unsub()
  }, [router, tenantId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth?.currentUser) {
      setMessage({ type: 'error', text: 'You are not signed in.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const token = await auth.currentUser.getIdToken()
      const res = await fetch('/api/tenant/branding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantId, branding: state }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Save failed (${res.status})`)
      }
      console.log('[tenant-dashboard] branding saved')
      setMessage({ type: 'success', text: 'Branding saved. Your public landing page is updated.' })
      router.refresh()
    } catch (err) {
      logger.error('[BrandingEditor] save failed', err as Error)
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-gray-500">
        Loading&hellip;
      </div>
    )
  }
  if (!authorized) {
    return null
  }

  const previewColor = toCss(state.primaryColor)

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Branding</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Edit how your platform appears to families. Changes are live immediately.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company name</label>
          <input
            type="text"
            value={state.companyName}
            onChange={e => setState(s => ({ ...s, companyName: e.target.value }))}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo URL</label>
          <input
            type="url"
            value={state.logoUrl}
            onChange={e => setState(s => ({ ...s, logoUrl: e.target.value }))}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste a hosted image URL. Direct file upload is coming in a future release.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Primary color (HSL triplet)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={state.primaryColor}
              onChange={e => setState(s => ({ ...s, primaryColor: e.target.value }))}
              placeholder="262 83% 58%"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm"
            />
            <span
              className="h-10 w-10 rounded-lg border border-gray-300 dark:border-gray-600 shrink-0"
              style={{ backgroundColor: previewColor }}
              aria-label="color preview"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Format: <code>hue saturation% lightness%</code>. Example: <code>262 83% 58%</code> (purple).
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Support email</label>
          <input
            type="email"
            value={state.supportEmail}
            onChange={e => setState(s => ({ ...s, supportEmail: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: previewColor }}
        >
          {saving ? 'Saving…' : 'Save Branding'}
        </button>
      </div>
    </form>
  )
}
