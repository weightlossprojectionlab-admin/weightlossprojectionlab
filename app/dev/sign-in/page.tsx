'use client'

/**
 * Dev-Only Tenant Owner Sign-In
 *
 * Bypasses the magic-link flow for local testing. Calls
 * /api/dev/mint-tenant-token to get a Firebase custom token, signs in
 * with it, and lands you on /dashboard with the right custom claims set.
 *
 * Usage:
 *   - http://little-care-bears.localhost:3003/dev/sign-in
 *     (slug auto-detected from hostname)
 *   - http://localhost:3003/dev/sign-in?tenant=little-care-bears
 *     (apex localhost; explicit slug)
 *
 * The route is gated server-side on NODE_ENV === 'development'. The page
 * itself also no-ops in production. Both belt and suspenders so this
 * cannot accidentally provide auth bypass in a deployed environment.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { signInWithCustomToken } from 'firebase/auth'

function DevSignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Determining tenant...')

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      setError('This page is only available in development.')
      return
    }

    const run = async () => {
      try {
        // Slug priority: ?tenant query param, then *.localhost subdomain.
        let slug: string | null = searchParams?.get('tenant') ?? null
        if (!slug && typeof window !== 'undefined') {
          const host = window.location.hostname
          if (host.endsWith('.localhost')) {
            slug = host.replace('.localhost', '')
          }
        }
        if (!slug) {
          setError(
            'No tenant specified. Use ?tenant=<slug> or visit from a *.localhost subdomain.'
          )
          return
        }

        setStatus(`Minting token for "${slug}"...`)
        const res = await fetch(
          `/api/dev/mint-tenant-token?tenant=${encodeURIComponent(slug)}`
        )
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Token mint failed (${res.status})`)
        }
        const { token, ownerEmail } = await res.json()

        if (!auth) throw new Error('Firebase auth not initialized in this environment.')

        setStatus(`Signing in as ${ownerEmail}...`)
        await signInWithCustomToken(auth, token)
        // Force-refresh so the new claims are present on the next page load.
        await auth.currentUser?.getIdToken(true)

        setStatus('Redirecting to dashboard...')
        // Use a relative redirect so the browser stays on the same origin
        // (auth state in IndexedDB is per-origin — switching to a different
        // host here would lose the session we just established).
        router.replace('/dashboard')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign in failed.')
      }
    }
    run()
  }, [router, searchParams])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center space-y-4 p-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Dev Sign-In
        </h1>
        {error ? (
          <>
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              This helper is dev-only. Check the dev server terminal for the full
              stack trace.
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3 text-gray-600 dark:text-gray-400">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span>{status}</span>
          </div>
        )}
      </div>
    </main>
  )
}

export default function DevSignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500">
          Loading…
        </div>
      }
    >
      <DevSignInContent />
    </Suspense>
  )
}
