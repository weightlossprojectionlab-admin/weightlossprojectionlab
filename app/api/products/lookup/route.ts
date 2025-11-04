import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

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
    // Don't throw - logging is non-critical
    logger.debug('Failed to log API usage', error as Error)
  }
}

async function fetchFromOpenFoodFacts(barcode: string) {
  const response = await fetch(`${OPENFOODFACTS_API_URL}/${barcode}.json`, {
    headers: {
      'User-Agent': 'WeightLossProjectLab/1.0'
    }
  })

  if (response.status === 404) {
    return {
      code: barcode,
      status: 0,
      status_verbose: 'product not found'
    }
  }

  if (!response.ok) {
    return {
      code: barcode,
      status: 0,
      status_verbose: `API error: ${response.status}`
    }
  }

  return await response.json()
}

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication (optional - can be public)
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    let userId: string | undefined
    if (idToken) {
      try {
        const decodedToken = await verifyIdToken(idToken)
        userId = decodedToken.uid
      } catch {
        // Continue without userId if token invalid
      }
    }

    const barcode = request.nextUrl.searchParams.get('barcode')
    if (!barcode) {
      return NextResponse.json({ error: 'Missing barcode parameter' }, { status: 400 })
    }

    // Step 1: Check our product_database cache
    const productRef = adminDb.collection('product_database').doc(barcode)
    const productDoc = await productRef.get()

    if (productDoc.exists) {
      const productData = productDoc.data()
      const updatedAt = productData?.updatedAt?.toDate?.() || new Date(0)
      const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)

      // If data is fresh enough, return from cache
      if (daysSinceUpdate < CACHE_FRESHNESS_DAYS) {
        // Log cache hit
        await logAPIUsage({
          timestamp: new Date(),
          source: 'cache',
          barcode,
          userId,
          found: true,
          cacheFreshnessDays: Math.round(daysSinceUpdate)
        })

        // Convert our product format to OpenFoodFacts format for compatibility
        const response = {
          code: barcode,
          status: 1,
          status_verbose: 'product found (cached)',
          product: {
            code: barcode,
            product_name: productData?.productName,
            brands: productData?.brand,
            quantity: productData?.nutrition?.servingSize || '',
            serving_size: productData?.nutrition?.servingSize || '',
            image_url: productData?.imageUrl,
            image_front_url: productData?.imageUrl,
            nutriments: {
              'energy-kcal': productData?.nutrition?.calories || 0,
              'energy-kcal_100g': productData?.nutrition?.calories || 0,
              proteins: productData?.nutrition?.protein || 0,
              proteins_100g: productData?.nutrition?.protein || 0,
              carbohydrates: productData?.nutrition?.carbs || 0,
              carbohydrates_100g: productData?.nutrition?.carbs || 0,
              fat: productData?.nutrition?.fat || 0,
              fat_100g: productData?.nutrition?.fat || 0,
              fiber: productData?.nutrition?.fiber || 0,
              fiber_100g: productData?.nutrition?.fiber || 0
            },
            categories: productData?.category || '',
            ingredients_text: ''
          },
          _cached: true,
          _cacheFreshnessDays: Math.round(daysSinceUpdate)
        }

        return NextResponse.json(response)
      } else {
        logger.debug(`Cache stale for barcode ${barcode} (${Math.round(daysSinceUpdate)} days old)`)
      }
    }

    // Step 2: Cache miss or stale - fetch from OpenFoodFacts
    logger.debug(`Cache miss for barcode ${barcode}, fetching from OpenFoodFacts`)
    const offData = await fetchFromOpenFoodFacts(barcode)

    // Log API usage
    await logAPIUsage({
      timestamp: new Date(),
      source: 'openfoodfacts',
      barcode,
      userId,
      found: offData.status === 1
    })

    // Step 3: Update our cache if product was found
    if (offData.status === 1 && offData.product) {
      const product = offData.product
      const nutriments = product.nutriments || {}

      try {
        const now = new Date()
        const updateData: any = {
          barcode,
          productName: product.product_name || 'Unknown Product',
          brand: product.brands || '',
          imageUrl: product.image_front_url || product.image_url || '',
          nutrition: {
            calories: nutriments['energy-kcal'] || nutriments['energy-kcal_100g'] || 0,
            protein: nutriments.proteins || nutriments.proteins_100g || 0,
            carbs: nutriments.carbohydrates || nutriments.carbohydrates_100g || 0,
            fat: nutriments.fat || nutriments.fat_100g || 0,
            fiber: nutriments.fiber || nutriments.fiber_100g || 0,
            servingSize: product.serving_size || ''
          },
          updatedAt: now
        }

        if (productDoc.exists) {
          // Update existing product
          await productRef.update({
            ...updateData,
            'stats.lastSeenAt': now
          })
        } else {
          // Create new product entry (minimal - will be enriched when user scans)
          await productRef.set({
            ...updateData,
            category: 'other',
            stats: {
              totalScans: 0,
              uniqueUsers: 0,
              totalPurchases: 0,
              firstSeenAt: now,
              lastSeenAt: now
            },
            regional: {
              stores: [],
              regions: [],
              avgPriceCents: 0,
              priceMin: 0,
              priceMax: 0,
              lastPriceUpdate: now
            },
            usage: {
              linkedRecipes: 0,
              popularityScore: 0
            },
            quality: {
              verified: false,
              verificationCount: 0,
              dataSource: 'openfoodfacts',
              confidence: 50
            },
            createdAt: now
          })
        }
      } catch (error) {
        // Don't throw - cache update is non-critical
        logger.error('Failed to update product cache', error as Error, { barcode })
      }
    }

    // Return OpenFoodFacts response
    return NextResponse.json({
      ...offData,
      _cached: false
    })
  } catch (error) {
    logger.error('Error in product lookup', error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to lookup product' },
      { status: 500 }
    )
  }
}
