import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * GET /api/products/lookup?barcode={barcode}
 *
 * Cache-first barcode lookup to reduce OpenFoodFacts API calls:
 * 1. Check our product_database first
 * 2. If found and fresh (<30 days old), return cached data
 * 3. If not found or stale, call OpenFoodFacts API
 * 4. Update database and track API usage
 */

const CACHE_FRESHNESS_DAYS = 30
const OPENFOODFACTS_API_URL = 'https://world.openfoodfacts.org/api/v2/product'

interface APIUsageLog {
  timestamp: Date
  source: 'cache' | 'openfoodfacts'
  barcode: string
  userId?: string
  found: boolean
  cacheFreshnessDays?: number
}

async function logAPIUsage(log: APIUsageLog) {
  try {
    await adminDb.collection('api_usage_logs').add({
      ...log,
      timestamp: new Date()
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/products/lookup',
      operation: 'operation'
    })
  }
}
