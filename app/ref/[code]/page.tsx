/**
 * Referral Landing Page
 * Tracks the click, sets a cookie, and redirects to /auth
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ code: string }>
}

export default async function ReferralLandingPage({ params }: Props) {
  const { code } = await params

  // Track the click server-side
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  try {
    await fetch(`${baseUrl}/api/referrals/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
  } catch {
    // Don't block redirect if click tracking fails
  }

  // Set referral code cookie (30 days)
  const cookieStore = await cookies()
  cookieStore.set('ref_code', code, {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  })

  // Redirect to auth with ref param
  redirect(`/auth?ref=${encodeURIComponent(code)}`)
}
