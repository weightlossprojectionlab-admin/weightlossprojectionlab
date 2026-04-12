'use client'

/**
 * Magic Link Sign-In Completion (Apex)
 *
 * Canonical landing page for franchise owner magic links. Lives at the
 * apex domain (www.wellnessprojectionlab.com/auth/finish-sign-in) so
 * only ONE domain needs to be in Firebase Authorized Domains — no
 * manual per-tenant domain step.
 *
 * Flow:
 *   1. Franchise owner clicks magic link from activation email
 *   2. Lands here with ?tenant={slug} in the URL
 *   3. Completes signInWithEmailLink handshake
 *   4. Redirects to https://{slug}.wellnessprojectionlab.com/dashboard
 *
 * The tenant-shell version at /tenant-shell/auth/finish-sign-in stays
 * as a fallback for any magic links generated before this refactor.
 */

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { signInWithEmailLink, isSignInWithEmailLink } from 'firebase/auth'
import { logger } from '@/lib/logger'

function FinishSignInContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Verifying your sign-in link...')

  useEffect(() => {
    const finish = async () => {
      try {
        if (!auth) {
          setError('Authentication is not available right now.')
          return
        }

        const tenantSlug = searchParams?.get('tenant')

        const url = window.location.href
        if (!isSignInWithEmailLink(auth, url)) {
          setError('This sign-in link is invalid or has expired.')
          return
        }

        // Email lookup — same priority chain as the tenant-shell version:
        //   1. localStorage (set when generating link from same browser)
        //   2. window.prompt() fallback (Firebase-recommended for cross-device)
        let email: string | null =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('emailForSignIn')
            : null
        if (!email && typeof window !== 'undefined') {
          email = window.prompt('Please enter your email to complete sign-in:')
        }
        if (!email) {
          setError('We could not determine the email address for this sign-in link.')
          return
        }

        setStatus('Signing you in...')
        await signInWithEmailLink(auth, email, url)
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('emailForSignIn')
        }

        // Force token refresh so custom claims (tenantId, tenantRole) are present
        await auth.currentUser?.getIdToken(true)

        // Get a fresh ID token to pass to the subdomain. The subdomain's
        // /auth/token-sign-in page will use it to establish auth on that origin.
        // Custom tokens would be better (single-use, short-lived) but we'd
        // need a server call to mint one. For now, passing the Firebase ID
        // token works — it's already authenticated and the subdomain just
        // needs to call signInWithCustomToken with it... except ID tokens
        // can't be used with signInWithCustomToken. So we redirect to the
        // subdomain dashboard directly — the auth-router will handle it.
        if (tenantSlug) {
          setStatus('Redirecting to your dashboard...')
          const isDev = window.location.hostname === 'localhost' || window.location.hostname.endsWith('.localhost')
          const subdomainUrl = isDev
            ? `http://${tenantSlug}.localhost:3003/dashboard`
            : `https://${tenantSlug}.wellnessprojectionlab.com/dashboard`
          window.location.href = subdomainUrl
        } else {
          // No tenant slug — fall back to the apex dashboard
          setStatus('Redirecting...')
          window.location.href = '/dashboard'
        }
      } catch (err) {
        logger.error('[finish-sign-in] sign in failed', err as Error)
        setError(err instanceof Error ? err.message : 'Sign in failed.')
      }
    }
    finish()
  }, [searchParams])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md text-center space-y-4">
        {error ? (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Sign-in link error
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Contact your administrator to receive a fresh sign-in link.
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3 text-gray-600 dark:text-gray-400">
            <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>{status}</span>
          </div>
        )}
      </div>
    </main>
  )
}

export default function FinishSignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500">
          Loading...
        </div>
      }
    >
      <FinishSignInContent />
    </Suspense>
  )
}
