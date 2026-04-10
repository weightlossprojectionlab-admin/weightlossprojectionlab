'use client'

/**
 * Accept Invitation Page
 *
 * Phase B slice 4: lands here when an invited staff member clicks the
 * acceptance link from their email. Reads the token + tenant from query
 * params, POSTs to /api/auth/accept-invitation, signs in with the returned
 * Firebase custom token, and redirects to the franchise dashboard on the
 * tenant subdomain.
 *
 * Lives at the apex (`/auth/accept-invitation`) so the email link doesn't
 * need to know the tenant subdomain ahead of time. The proxy already
 * exempts `/auth` from the tenant rewrite, so this page is reachable from
 * any tenant subdomain or from the bare apex.
 */

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { signInWithCustomToken } from 'firebase/auth'

function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Validating invitation...')

  useEffect(() => {
    const run = async () => {
      try {
        const token = searchParams?.get('token')
        const tenantId = searchParams?.get('tenant')
        if (!token || !tenantId) {
          setError('This invitation link is missing required information.')
          return
        }

        setStatus('Setting up your account...')
        const res = await fetch('/api/auth/accept-invitation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, tenantId }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error || `Acceptance failed (${res.status})`)
        }

        if (!auth) throw new Error('Firebase auth is not available.')

        setStatus('Signing you in...')
        await signInWithCustomToken(auth, data.token)
        // Force-refresh so the new claims are present on the next page.
        await auth.currentUser?.getIdToken(true)

        // Redirect to the tenant dashboard. We have to switch hosts because
        // the staff dashboard lives on the tenant subdomain — but Firebase
        // Auth state is per-origin, so the new origin will be a fresh sign
        // -in. The custom claims are persisted on the user record (we set
        // them server-side), so once they sign in on the subdomain via the
        // existing magic link / dev sign-in flow they'll have staff access.
        //
        // For now, the simplest UX is: tell them they're set up, and link
        // them to the subdomain. They'll still need to sign in there once.
        // Slice 4.5 (future) can refactor this to a same-origin flow.
        const slug = data.tenantSlug
        if (slug) {
          const subdomainRoot =
            process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')
              ? `http://${slug}.localhost:3003/dashboard`
              : `https://${slug}.wellnessprojectionlab.com/dashboard`
          setStatus('Redirecting to your dashboard...')
          window.location.href = subdomainRoot
        } else {
          setError('Invitation accepted, but no tenant subdomain to redirect to.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Acceptance failed.')
      }
    }
    run()
  }, [searchParams])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center space-y-4 p-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Accepting Your Invitation
        </h1>
        {error ? (
          <>
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              If you weren&rsquo;t expecting this email or the link has expired,
              ask your administrator for a new invitation.
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3 text-gray-600 dark:text-gray-400">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
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

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500">
          Loading…
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  )
}
