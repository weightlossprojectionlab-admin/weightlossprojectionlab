/**
 * Netlify Scheduled Function: Duty Notifications
 *
 * Runs hourly to process scheduled duty notifications (optimized from 30 minutes)
 */

import { Handler, schedule } from '@netlify/functions'

const handler: Handler = async () => {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.URL
    const cronSecret = process.env.CRON_SECRET

    if (!appUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'NEXT_PUBLIC_APP_URL not configured' })
      }
    }

    if (!cronSecret) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'CRON_SECRET not configured' })
      }
    }

    const response = await fetch(`${appUrl}/api/cron/duty-notifications`, {
      headers: {
        'Authorization': `Bearer ${cronSecret}`
      }
    })

    const data = await response.json()

    return {
      statusCode: response.status,
      body: JSON.stringify(data)
    }
  } catch (error) {
    console.error('[Netlify Cron] Error running duty notifications:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }
}

// Schedule to run hourly (every hour at minute 0)
export default schedule('0 * * * *', handler)
