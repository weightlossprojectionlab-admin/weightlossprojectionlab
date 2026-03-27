/**
 * Referral Click Tracking API
 * POST — Track a referral link click (public, no auth required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { lookupReferralCode, trackClick } from '@/lib/referral-service'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Missing referral code' }, { status: 400 })
    }

    const lookup = await lookupReferralCode(code)
    if (!lookup) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
    }

    // Get IP from headers (Vercel forwards X-Forwarded-For)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'
    const userAgent = request.headers.get('user-agent') || ''

    const tracked = await trackClick(lookup.code, lookup.userId, ip, userAgent)

    return NextResponse.json({ tracked, code: lookup.code })
  } catch (error) {
    logger.error('[API] POST /api/referrals/click error', error as Error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
