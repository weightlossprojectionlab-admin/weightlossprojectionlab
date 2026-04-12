'use client'

/**
 * Token Sign-In Page
 *
 * Lightweight page that consumes a Firebase custom token from a query
 * param and establishes Firebase Auth on the current origin. Used by:
 *
 *   - Staff invitation acceptance (cross-origin redirect from apex)
 *   - Magic link completion (cross-origin redirect from apex)
 *
 * The token is a one-time Firebase custom token minted by the server.
 * After sign-in, redirects to /dashboard.
 *
 * Security: custom tokens expire after 1 hour and can only be used once.
 * Passing them in a URL is the same pattern Firebase itself uses for
 * email action links.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { signInWithCustomToken } from 'firebase/auth'
import { logger } from '@/lib/logger'

function TokenSignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const token = searchParams?.get('token')
        if (!token) {
          setError('No sign-in token provided.')
          return
        }
        if (!auth) {
          setError('Authentication is not available.')
          return
        }

        await signInWithCustomToken(auth, token)
        await auth.currentUser?.getIdToken(true)

        router.replace('/dashboard')
      } catch (err) {
        logger.error('[token-sign-in] failed', err as Error)
        setError(err instanceof Error ? err.message : 'Sign in failed.')
      }
    }
    run()
  }, [router, searchParams])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md text-center space-y-4">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Sign-in error</h1>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3 text-gray-600 dark:text-gray-400">
            <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>Signing you in&hellip;</span>
          </div>
        )}
      </div>
    </main>
  )
}

export default function TokenSignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
      <TokenSignInContent />
    </Suspense>
  )
}
