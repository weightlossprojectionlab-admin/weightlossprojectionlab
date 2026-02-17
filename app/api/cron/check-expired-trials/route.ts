/**
 * Vercel Cron Endpoint: Check Expired Trials
 * Configured in vercel.json to run every 6 hours
 *
 * This endpoint is called by Vercel Cron to check for expired trials
 * and update their status in Firestore.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkExpiredTrials } from '@/functions/subscription/checkExpiredTrials'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Verify request is from Vercel Cron (security check)
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

  if (!process.env.CRON_SECRET) {
    logger.error('[Cron] CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    )
  }

  if (authHeader !== expectedAuth) {
    logger.warn('[Cron] Unauthorized access attempt', {
      ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown',
      headers: Object.fromEntries(request.headers.entries())
    })
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    logger.info('[Cron] Starting expired trials check')

    const result = await checkExpiredTrials()

    logger.info('[Cron] Expired trials check completed', result)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    })
  } catch (error: any) {
    logger.error('[Cron] Error checking expired trials', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check expired trials',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
