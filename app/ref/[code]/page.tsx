/**
 * Referral Landing Page
 * Stores the referral code in localStorage via client-side redirect
 */

'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ReferralLandingPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  useEffect(() => {
    if (!code) return

    // Store referral code for attribution after signup
    localStorage.setItem('pendingReferralCode', code)

    // Track the click
    fetch('/api/referrals/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).catch(() => {})

    // Redirect to auth with ref param
    router.replace(`/auth?ref=${encodeURIComponent(code)}`)
  }, [code, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
