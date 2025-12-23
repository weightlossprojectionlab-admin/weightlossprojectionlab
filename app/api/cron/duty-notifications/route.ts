import { NextRequest, NextResponse } from 'next/server'
import { processPendingNotifications } from '@/lib/duty-scheduler-service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * Cron job to process scheduled duty notifications
 * Called by Netlify scheduled function every hour (optimized from 30 minutes)
 *
 * GET /api/cron/duty-notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Verify request is from Netlify cron (check secret header)
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      logger.error('[DutyCron] CRON_SECRET not configured')
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[DutyCron] Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Process pending notifications using event-driven scheduler
    const stats = await processPendingNotifications()

    logger.info('[DutyCron] Job completed', stats)

    return NextResponse.json({
      success: true,
      ...stats
    })
  } catch (error) {
    logger.error('[DutyCron] Fatal error in duty notification job', error as Error)
    return NextResponse.json({
      success: false,
      error: 'Job failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
