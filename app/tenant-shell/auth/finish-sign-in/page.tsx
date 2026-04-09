'use client'

/**
 * Magic Link Sign-In Completion Page
 *
 * Lands here when a franchise owner clicks the magic link from the
 * activation email sent by app/api/webhooks/stripe/route.ts. Calls
 * signInWithEmailLink() to complete the handshake, then redirects
 * to /dashboard.
 *
 * Inherits app/tenant-shell/layout.tsx so the page is rendered inside
 * the tenant's branded shell.
 */

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { signInWithEmailLink, isSignInWithEmailLink } from 'firebase/auth'
import { logger } from '@/lib/logger'

export default function FinishSignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const finish = async () => {
      try {
        if (!auth) {
          setError('Authentication is not available right now.')
          return
        }
        const url = window.location.href
        if (!isSignInWithEmailLink(auth, url)) {
          setError('This sign-in link is invalid or has expired.')
          return
        }
        // Email lookup, in priority order:
        //   1. ?email= query param (set by webhook/provision script)
        //   2. localStorage 'emailForSignIn' (set when generating link from same browser)
        //   3. window.prompt() asking the user — bulletproof fallback for cross-device
        //      magic-link clicks where the link generator and clicker are different sessions.
        // The prompt fallback is the production-correct pattern per Firebase docs:
        // https://firebase.google.com/docs/auth/web/email-link-auth#completing_sign-in_in_a_web_page
        let email: string | null =
          searchParams?.get('email') ||
          (typeof window !== 'undefined' ? window.localStorage.getItem('emailForSignIn') : null)
        if (!email && typeof window !== 'undefined') {
          email = window.prompt('Please enter your email to complete sign-in:')
        }
        if (!email) {
          setError('We could not determine the email address for this sign-in link.')
          return
        }
        await signInWithEmailLink(auth, email, url)
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('emailForSignIn')
        }
        // Force a token refresh so the new custom claims (tenantId, tenantRole)
        // are present on subsequent requests.
        await auth.currentUser?.getIdToken(true)
        router.replace('/dashboard')
      } catch (err) {
        logger.error('[finish-sign-in] sign in failed', err as Error)
        setError(err instanceof Error ? err.message : 'Sign in failed.')
      }
    }
    finish()
  }, [router, searchParams])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md text-center space-y-4">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Sign-in link error</h1>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Contact your administrator to receive a fresh sign-in link.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-3 text-gray-600 dark:text-gray-400">
              <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span>Signing you in&hellip;</span>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
