/**
 * User Referral API
 * GET  — Fetch user's own referral code
 * POST — Generate referral code if none exists
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { getOrCreateReferralCode } from '@/lib/referral-service'
import { errorResponse } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '')

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(idToken)
    const code = await getOrCreateReferralCode(decoded.uid)

    return NextResponse.json({ code })
  } catch (error) {
    logger.error('[API] GET /api/referrals error', error as Error)
    return errorResponse(error as Error, { route: '/api/referrals', operation: 'GET' })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '')

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(idToken)
    const code = await getOrCreateReferralCode(decoded.uid)

    return NextResponse.json({ code })
  } catch (error) {
    logger.error('[API] POST /api/referrals error', error as Error)
    return errorResponse(error as Error, { route: '/api/referrals', operation: 'POST' })
  }
}
