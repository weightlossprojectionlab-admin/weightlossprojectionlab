'use client'

/**
 * Auth-aware CTA for the public /about page.
 *
 * /about is public, so the default (and the case for most visitors) is an
 * anonymous prospective family → "Sign in". But if the viewer is already
 * signed in, asking them to sign in again is nonsense — swap to "Go to
 * your dashboard" pointing at the app.
 *
 * The parent page is a server component with no auth knowledge, so the
 * state check has to live here on the client (Firebase auth is client-side).
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

export default function AboutCta({ companyName, accent }: { companyName: string; accent: string }) {
  // null = still resolving. Default the rendered label to the anonymous
  // case (the common one) so SSR/first paint matches most visitors.
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    if (!auth) {
      setSignedIn(false)
      return
    }
    const unsub = onAuthStateChanged(auth, user => setSignedIn(!!user))
    return () => unsub()
  }, [])

  const isSignedIn = signedIn === true
  const href = isSignedIn ? '/dashboard' : '/'
  const label = isSignedIn ? 'Go to your dashboard' : `Sign in to ${companyName}`

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90 ${
        signedIn === null ? 'opacity-70' : ''
      }`}
      style={{ backgroundColor: accent }}
    >
      {label}
    </Link>
  )
}
