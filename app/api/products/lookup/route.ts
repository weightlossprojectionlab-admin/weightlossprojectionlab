import { NextRequest, NextResponse, after } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { lookupProductHybrid } from '@/lib/product-lookup-server'
import { fetchOpenFoodFactsImageOnly } from '@/lib/openfoodfacts-server'
import { barcodeVariants, resolveProductDoc } from '@/lib/barcode-variants'
import { allergensFromProductFields } from '@/lib/allergen-parser'
import { extractNutrientPanel, type Nutriments } from '@/lib/nutrition-extract'

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

    // Step 1: cache check via the shared resolver. Tries direct doc.get,
    // then the array-contains alias index, then variant fan-out as a last
    // resort. Returns the canonical doc id under `resolvedId`, plus a
    // `hadAliases` flag we use to schedule lazy backfill below.
    const resolved = await resolveProductDoc(adminDb, barcode)
    const productRef = resolved?.ref ?? adminDb.collection('product_database').doc(barcode)
    const productDoc = resolved?.snap ?? (await productRef.get())
    const resolvedBarcode = resolved?.resolvedId ?? barcode

    if (resolved && resolvedBarcode !== barcode) {
      logger.info('[Lookup] resolved via barcode variant', { input: barcode, resolved: resolvedBarcode })
    }

    if (productDoc.exists) {
      const productData = productDoc.data()
      const updatedAt = productData?.updatedAt?.toDate?.() || new Date(0)
      const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceUpdate < CACHE_FRESHNESS_DAYS) {
        await logAPIUsage({
          timestamp: new Date(),
          source: 'cache',
          barcode: resolvedBarcode,
          userId,
          found: true,
          cacheFreshnessDays: Math.round(daysSinceUpdate)
        })

        // Lazy image enrichment: if this cache hit has no image (typically
        // because it came from the USDA bulk import, which doesn't supply
        // images), schedule a background OFF lookup. The user gets the
        // cached response immediately; the next scanner of this product
        // gets the enriched doc with an image attached.
        //
        // Uses Next.js `after()` which keeps the serverless function alive
        // briefly after the response is sent, completing the background
        // work without blocking the user.
        if (!productData?.imageUrl) {
          after(async () => {
            try {
              const offImage = await fetchOpenFoodFactsImageOnly(resolvedBarcode)
              if (offImage) {
                await productRef.update({
                  imageUrl: offImage,
                  updatedAt: new Date(),
                })
                logger.info('[Lookup] background image enrichment succeeded', { barcode: resolvedBarcode })
              }
            } catch (e) {
              // Non-critical — image stays empty, will retry on next scan
              logger.debug('[Lookup] background image enrichment failed', {
                barcode: resolvedBarcode,
                error: (e as Error).message,
              })
            }
          })
        }

        // Lazy allergen backfill: a cached doc created before allergen tagging
        // existed carries no allergenTags, so the safety banner can't fire. Re-look
        // up OFF in the background and stamp canonical tags; the next scan serves
        // them from cache. Mirrors the image/alias lazy-enrichment pattern.
        if (!productData?.allergenTags) {
          after(async () => {
            try {
              const fresh = await lookupProductHybrid(resolvedBarcode)
              const allergenTags = allergensFromProductFields(
                fresh?.allergens,
                fresh?.ingredients_text,
                fresh?.allergens_tags,
              )
              if (allergenTags.length > 0) {
                await productRef.update({ allergenTags, updatedAt: new Date() })
                logger.info('[Lookup] backfilled allergenTags', { barcode: resolvedBarcode, allergenTags })
              }
            } catch (e) {
              logger.debug('[Lookup] allergen backfill failed', {
                barcode: resolvedBarcode,
                error: (e as Error).message,
              })
            }
          })
        }

        // Lazy nutrient-panel backfill: a doc cached before Tier-2 has no
        // `nutrients` panel, so cache-hit items get D=1. Re-look up OFF and
        // stamp the normalized panel; the next scan serves it. Same pattern.
        if (!productData?.nutrients) {
          after(async () => {
            try {
              const fresh = await lookupProductHybrid(resolvedBarcode)
              const panel = extractNutrientPanel(fresh?.nutriments as Nutriments | undefined, fresh?.serving_size)
              if (panel) {
                await productRef.update({ nutrients: panel, updatedAt: new Date() })
                logger.info('[Lookup] backfilled nutrient panel', { barcode: resolvedBarcode, basis: panel.basis })
              }
            } catch (e) {
              logger.debug('[Lookup] nutrient backfill failed', {
                barcode: resolvedBarcode,
                error: (e as Error).message,
              })
            }
          })
        }

        // Lazy alias backfill: if this doc still doesn't have an `aliases`
        // array, write one based on its canonical id. Future scans of any
        // variant resolve via the array-contains query in a single read,
        // skipping the variant fan-out path entirely.
        if (resolved && !resolved.hadAliases) {
          after(async () => {
            try {
              const aliases = barcodeVariants(resolvedBarcode)
              await productRef.update({ aliases, updatedAt: new Date() })
              logger.info('[Lookup] backfilled aliases', { barcode: resolvedBarcode, count: aliases.length })
            } catch (e) {
              logger.debug('[Lookup] alias backfill failed', {
                barcode: resolvedBarcode,
                error: (e as Error).message,
              })
            }
          })
        }

        return NextResponse.json({
          code: resolvedBarcode,
          status: 1,
          status_verbose: 'product found (cached)',
          product: {
            code: resolvedBarcode,
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
            ingredients_text: '',
            // Forward the catalog's stored canonical allergen tags so a cache hit
            // still tags the item (the field the safety banner depends on).
            allergens_tags: productData?.allergenTags || [],
            // Forward the stored per-serving panel so a cache hit still feeds D.
            nutrients: productData?.nutrients ?? undefined,
            container_size: productData?.containerSize ?? undefined,
            container_unit: productData?.containerUnit ?? undefined,
          },
          _cached: true,
          _cacheFreshnessDays: Math.round(daysSinceUpdate)
        })
      }
      logger.debug(`Cache stale for barcode ${barcode} (${Math.round(daysSinceUpdate)} days old)`)
    }

    // Step 2: cache miss or stale — hybrid lookup (USDA nutrition + OFF image)
    const product = await lookupProductHybrid(barcode)

    await logAPIUsage({
      timestamp: new Date(),
      // Telemetry source field accepts 'cache' | 'usda' | 'openfoodfacts'.
      // 'usda+off' (hybrid hit) is normalized to 'usda' since USDA was the
      // primary nutrition source — OFF image is a supplement, not a hit.
      source: product?.source === 'usda+off' ? 'usda' : (product?.source || 'openfoodfacts'),
      barcode: resolvedBarcode,
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

    // Normalized per-serving nutrient panel for the health-demand weight D.
    // Extracted once here (outside the cache-write try) so it's in scope for both
    // the catalog write and the response. Stored on the catalog so cache hits can
    // forward it (the client no longer re-extracts). null when OFF has no panel.
    const nutrientPanel = extractNutrientPanel(product.nutriments as Nutriments | undefined, product.serving_size)

    // Step 3: update cache.
    //
    // Write-side guard: if the doc was located via variant resolution
    // (productDoc.exists), update IT — never set a fresh doc under the raw
    // input. That would create a duplicate when an existing canonical-id
    // doc lives under a different form than the scanner's emission.
    //
    // For genuinely-new products, set under the input id and seed the
    // `aliases` field so future scans of any variant of this product
    // resolve in a single read via the array-contains index.
    try {
      const now = new Date()
      const nutriments = product.nutriments || {}
      const writeId = productDoc.exists ? resolvedBarcode : barcode
      const aliases = barcodeVariants(writeId)
      // Prefer per-serving nutrient values when present (USDA's
      // labelNutrients overlay supplies these for branded items;
      // OFF carries them on most curated rows). Falls back to
      // 100g values, then 0. Only includes a field when at least
      // one source had a non-zero value — keeps Firestore docs
      // free of garbage zeros that aren't meaningful absence.
      const pickNutrient = (
        ...candidates: Array<number | undefined>
      ): number | undefined => {
        for (const v of candidates) {
          if (typeof v === 'number' && v > 0) return v
        }
        return undefined
      }
      const richNutrition = {
        sodium: pickNutrient(nutriments.sodium_serving, nutriments.sodium_100g, nutriments.sodium),
        sugars: pickNutrient(nutriments.sugars_serving, nutriments.sugars_100g, nutriments.sugars),
        saturatedFat: pickNutrient(
          // OFF spells these with a hyphen (saturated-fat); the underscore form
          // is always undefined, so catalog nutrition.saturatedFat was never set.
          nutriments['saturated-fat_serving'],
          nutriments['saturated-fat_100g'],
          nutriments['saturated-fat']
        ),
        cholesterol: pickNutrient(
          nutriments.cholesterol_serving,
          nutriments.cholesterol_100g,
          nutriments.cholesterol
        ),
        calcium: pickNutrient(nutriments.calcium_serving, nutriments.calcium_100g, nutriments.calcium),
        iron: pickNutrient(nutriments.iron_serving, nutriments.iron_100g, nutriments.iron),
        potassium: pickNutrient(
          nutriments.potassium_serving,
          nutriments.potassium_100g,
          nutriments.potassium
        ),
      }
      // Strip undefined keys so Firestore doesn't trip on them.
      const cleanedRichNutrition = Object.fromEntries(
        Object.entries(richNutrition).filter(([, v]) => v !== undefined)
      )

      const baseUpdate = {
        barcode: writeId,
        productName: product.product_name || 'Unknown Product',
        brand: product.brands || '',
        imageUrl: product.image_url || '',
        nutrition: {
          calories: nutriments['energy-kcal'] || nutriments['energy-kcal_100g'] || 0,
          protein: nutriments.proteins || nutriments.proteins_100g || 0,
          carbs: nutriments.carbohydrates || nutriments.carbohydrates_100g || 0,
          fat: nutriments.fat || nutriments.fat_100g || 0,
          fiber: nutriments.fiber || nutriments.fiber_100g || 0,
          servingSize: product.serving_size || '',
          // Extended nutrient set — sodium / sugars / saturatedFat /
          // cholesterol / calcium / iron / potassium. Drives medical-
          // condition caps in lib/portion-recommendation.ts and
          // unblocks renal / cardiac / hypertension recommendations.
          ...cleanedRichNutrition,
        },
        aliases,
        // Canonical allergen tags from OFF — parsed once here so the catalog is
        // the product-level source of truth. Omitted when empty so a sparse
        // lookup never ERASES a previously-found set (do-no-harm).
        ...(() => {
          const allergenTags = allergensFromProductFields(
            product.allergens,
            product.ingredients_text,
            product.allergens_tags,
          )
          return allergenTags.length > 0 ? { allergenTags } : {}
        })(),
        ...(nutrientPanel ? { nutrients: nutrientPanel } : {}),
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
      code: productDoc.exists ? resolvedBarcode : barcode,
      status: 1,
      status_verbose: `product found (${product.source})`,
      product: {
        code: productDoc.exists ? resolvedBarcode : barcode,
        product_name: product.product_name,
        brands: product.brands || '',
        quantity: product.quantity || '',
        serving_size: product.serving_size || '',
        image_url: product.image_url || '',
        image_front_url: product.image_url || '',
        nutriments: product.nutriments,
        categories: product.categories || '',
        ingredients_text: product.ingredients_text || '',
        // Forward the allergen signal so the client's addOrUpdateShoppingItem can
        // tag the item. allergens_tags is OFF's locale-proof canonical source.
        allergens: product.allergens || '',
        allergens_tags: product.allergens_tags || [],
        // Pre-extracted per-serving panel for the health-demand weight D.
        nutrients: nutrientPanel ?? undefined
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
