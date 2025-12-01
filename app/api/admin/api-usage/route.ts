import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * GET /api/admin/api-usage
 * Get API usage analytics for monitoring cost reduction
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail.toLowerCase())

    if (!isSuperAdmin && adminData?.role !== 'admin' && adminData?.role !== 'moderator' && adminData?.role !== 'support') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get time range
    const days = parseInt(request.nextUrl.searchParams.get('days') || '30', 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch API usage logs
    const logsSnapshot = await adminDb
      .collection('api_usage_logs')
      .where('timestamp', '>=', startDate)
      .orderBy('timestamp', 'desc')
      .limit(10000)
      .get()

    const logs = logsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp
    }))

    // Calculate statistics
    const cacheHits = logs.filter((log: any) => log.source === 'cache').length
    const apiCalls = logs.filter((log: any) => log.source === 'openfoodfacts').length
    const totalRequests = logs.length
    const cacheHitRate = totalRequests > 0 ? ((cacheHits / totalRequests) * 100).toFixed(1) : '0'

    // Calculate by day
    const byDay: Record<string, { cache: number; api: number; total: number }> = {}
    logs.forEach((log: any) => {
      const date = new Date(log.timestamp).toISOString().split('T')[0]
      if (!byDay[date]) {
        byDay[date] = { cache: 0, api: 0, total: 0 }
      }
      byDay[date].total++
      if (log.source === 'cache') {
        byDay[date].cache++
      } else {
        byDay[date].api++
      }
    })

    const dailyTimeline = Object.entries(byDay)
      .map(([date, stats]) => ({
        date,
        ...stats,
        cacheHitRate: ((stats.cache / stats.total) * 100).toFixed(1)
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Product database stats
    const productDbSnapshot = await adminDb.collection('product_database').get()
    const totalProducts = productDbSnapshot.size

    const productStats = {
      totalProducts,
      verifiedProducts: 0,
      productsWithPricing: 0,
      avgScansPerProduct: 0
    }

    let totalScans = 0
    productDbSnapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.quality?.verified) {
        productStats.verifiedProducts++
      }
      if (data.regional?.avgPriceCents > 0) {
        productStats.productsWithPricing++
      }
      totalScans += data.stats?.totalScans || 0
    })

    productStats.avgScansPerProduct = totalProducts > 0
      ? Math.round(totalScans / totalProducts)
      : 0

    // Cache freshness distribution
    const cacheFreshnessDistribution: Record<string, number> = {
      '<1 day': 0,
      '1-7 days': 0,
      '7-14 days': 0,
      '14-30 days': 0,
      '>30 days': 0
    }

    logs
      .filter((log: any) => log.source === 'cache' && log.cacheFreshnessDays !== undefined)
      .forEach((log: any) => {
        const days = log.cacheFreshnessDays
        if (days < 1) cacheFreshnessDistribution['<1 day']++
        else if (days < 7) cacheFreshnessDistribution['1-7 days']++
        else if (days < 14) cacheFreshnessDistribution['7-14 days']++
        else if (days < 30) cacheFreshnessDistribution['14-30 days']++
        else cacheFreshnessDistribution['>30 days']++
      })

    // Estimated cost savings
    // Assume: OpenFoodFacts API is free but has rate limits and server costs
    // Each cache hit saves ~1ms latency and reduces external dependency
    const estimatedLatencySavingsMs = cacheHits * 200 // Avg 200ms saved per cache hit
    const estimatedBandwidthSavedKB = cacheHits * 5 // Avg 5KB saved per cache hit

    return NextResponse.json({
      summary: {
        totalRequests,
        cacheHits,
        apiCalls,
        cacheHitRate: parseFloat(cacheHitRate),
        estimatedLatencySavingsMs,
        estimatedBandwidthSavedKB
      },
      dailyTimeline,
      productStats,
      cacheFreshnessDistribution,
      recentLogs: logs.slice(0, 100)
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/api-usage',
      operation: 'fetch'
    })
  }
}
