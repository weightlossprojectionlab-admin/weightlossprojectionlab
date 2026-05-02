import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { lookupProductByBarcode } from '@/lib/product-lookup-server'

/**
 * GET /api/products/lookup?barcode={barcode}
 *
 * Cache-first barcode lookup:
 * 1. Check our product_database first
 * 2. If found and fresh (<30 days old), return cached data
 * 3. If not found or stale, call USDA FoodData Central via lookupProductByBarcode()
 * 4. lookupProductByBarcode falls back to OpenFoodFacts if USDA misses
 * 5. Update database and track API usage
 *
 * Response shape matches OpenFoodFactsResponse for compatibility with
 * lib/cached-product-lookup.ts and lib/openfoodfacts-api.ts simplifyProduct().
 */

const CACHE_FRESHNESS_DAYS = 30

interface APIUsageLog {
  timestamp: Date
  source: 'cache' | 'usda' | 'openfoodfacts'
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
    // Telemetry failure must not break the lookup
    logger.error('Failed to log API usage', error as Error)
  }
}

export async function GET(request: NextRequest) {
  // Rate limit: 10 requests per minute per IP/user (matches SEC-006 intent)
  const rateLimitResponse = await rateLimit(request, 'fetch-url')
  if (rateLimitResponse) return rateLimitResponse

  try {
    // Optional auth — lookup works anonymously, but logs userId when available
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    let userId: string | undefined
    if (idToken) {
      try {
        const decodedToken = await verifyIdToken(idToken)
        userId = decodedToken.uid
      } catch {
        // Invalid token — continue anonymously
      }
    }

    const barcode = request.nextUrl.searchParams.get('barcode')
    if (!barcode) {
      return NextResponse.json({ error: 'Missing barcode parameter' }, { status: 400 })
    }

    // Step 1: cache check
    const productRef = adminDb.collection('product_database').doc(barcode)
    const productDoc = await productRef.get()

    if (productDoc.exists) {
      const productData = productDoc.data()
      const updatedAt = productData?.updatedAt?.toDate?.() || new Date(0)
      const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceUpdate < CACHE_FRESHNESS_DAYS) {
        await logAPIUsage({
          timestamp: new Date(),
          source: 'cache',
          barcode,
          userId,
          found: true,
          cacheFreshnessDays: Math.round(daysSinceUpdate)
        })

        return NextResponse.json({
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
              fiber_100g: productData?.nutrition?.fiber || 0,
            },
            categories: productData?.category || '',
            ingredients_text: ''
          },
          _cached: true,
          _cacheFreshnessDays: Math.round(daysSinceUpdate)
        })
      }
      logger.debug(`Cache stale for barcode ${barcode} (${Math.round(daysSinceUpdate)} days old)`)
    }

    // Step 2: cache miss or stale — USDA-first, OpenFoodFacts-fallback
    const product = await lookupProductByBarcode(barcode)

    await logAPIUsage({
      timestamp: new Date(),
      source: product?.source || 'openfoodfacts',
      barcode,
      userId,
      found: !!product
    })

    if (!product) {
      return NextResponse.json({
        code: barcode,
        status: 0,
        status_verbose: 'product not found',
        _cached: false
      })
    }

    // Step 3: update cache
    try {
      const now = new Date()
      const nutriments = product.nutriments || {}
      const baseUpdate = {
        barcode,
        productName: product.product_name || 'Unknown Product',
        brand: product.brands || '',
        imageUrl: product.image_url || '',
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
        await productRef.update({
          ...baseUpdate,
          'stats.lastSeenAt': now
        })
      } else {
        await productRef.set({
          ...baseUpdate,
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
            dataSource: product.source,
            confidence: 50
          },
          createdAt: now
        })
      }
    } catch (error) {
      // Cache write failure must not break the response
      logger.error('Failed to update product cache', error as Error, { barcode })
    }

    return NextResponse.json({
      code: barcode,
      status: 1,
      status_verbose: `product found (${product.source})`,
      product: {
        code: barcode,
        product_name: product.product_name,
        brands: product.brands || '',
        quantity: product.quantity || '',
        serving_size: product.serving_size || '',
        image_url: product.image_url || '',
        image_front_url: product.image_url || '',
        nutriments: product.nutriments,
        categories: product.categories || '',
        ingredients_text: product.ingredients_text || ''
      },
      _cached: false,
      _source: product.source
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/products/lookup',
      operation: 'barcode_lookup'
    })
  }
}
