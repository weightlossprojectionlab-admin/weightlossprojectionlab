import { NextRequest, NextResponse } from 'next/server'
import { FieldPath } from 'firebase-admin/firestore'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'
import { resolveProductDoc, barcodeVariants } from '@/lib/barcode-variants'
import { lookupProductHybrid } from '@/lib/product-lookup-server'

/**
 * GET /api/products/search?q={query}&category={category}&limit={limit}
 *
 * Text/barcode search across the global product_database catalog. Used by
 * /inventory's hybrid lookup so a user can find products that aren't yet
 * in their personal inventory and add them.
 *
 * Mirrors /api/admin/products' query pattern (uppercase-prefix range on
 * productName, special-case for all-digit barcode lookup) but drops the
 * admin gate — any signed-in user can hit this. Capped at 20 results to
 * keep response sizes small and discourage scraping.
 */

const MAX_LIMIT = 20

export async function GET(request: NextRequest) {
  // Rate-limit per user/IP — same bucket as the barcode lookup route.
  const rateLimitResponse = await rateLimit(request, 'fetch-url')
  if (rateLimitResponse) return rateLimitResponse

  try {
    // Auth required (any signed-in user, no role gate).
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await verifyIdToken(idToken)

    const params = request.nextUrl.searchParams
    const q = (params.get('q') || '').trim()
    const category = params.get('category')
    const limitRaw = parseInt(params.get('limit') || String(MAX_LIMIT), 10)
    const limit = Math.min(Math.max(limitRaw, 1), MAX_LIMIT)

    if (!q) {
      return NextResponse.json({ results: [] })
    }

    // Barcode path — all-digit query. First do an exact-canonical lookup
    // (resolveProductDoc canonicalizes UPC-A / EAN-13 / UPC-E variants so
    // a paste of any equivalent form lands on the same doc). Then do a
    // prefix-range query on the document ID so partial UPC entry surfaces
    // candidates (e.g. typing "81011" returns all products starting with
    // that brand prefix). Exact match floats to the top.
    if (/^\d+$/.test(q)) {
      const seen = new Set<string>()
      const results: Array<Record<string, unknown>> = []

      const resolved = await resolveProductDoc(adminDb, q)
      if (resolved) {
        const data = resolved.snap.data() as Record<string, unknown> | undefined
        seen.add(resolved.resolvedId)
        results.push({
          barcode: resolved.resolvedId,
          productName: data?.productName ?? '',
          brand: data?.brand ?? '',
          category: data?.category ?? null,
          imageUrl: data?.imageUrl ?? '',
          containerSize: data?.containerSize ?? null,
          containerUnit: data?.containerUnit ?? null,
          nutrition: data?.nutrition ?? null,
        })
      }

      // Field query on the `barcode` property — catches docs whose doc id
      // differs from the stored barcode field (some bulk-import paths set
      // doc id from a different source key). resolveProductDoc only checks
      // doc id + aliases + id variants, so this is a defensive layer.
      const fieldSnap = await adminDb
        .collection('product_database')
        .where('barcode', '==', q)
        .limit(limit)
        .get()
      for (const doc of fieldSnap.docs) {
        if (seen.has(doc.id)) continue
        if (results.length >= limit) break
        const data = doc.data()
        seen.add(doc.id)
        results.push({
          barcode: doc.id,
          productName: data.productName ?? '',
          brand: data.brand ?? '',
          category: data.category ?? null,
          imageUrl: data.imageUrl ?? '',
          containerSize: data.containerSize ?? null,
          containerUnit: data.containerUnit ?? null,
          nutrition: data.nutrition ?? null,
        })
      }

      // Prefix range on doc ID — Firestore's `` is the standard
      // upper-bound sentinel for "everything starting with this string".
      const prefixSnap = await adminDb
        .collection('product_database')
        .orderBy(FieldPath.documentId())
        .startAt(q)
        .endAt(q + '')
        .limit(limit)
        .get()
      for (const doc of prefixSnap.docs) {
        if (seen.has(doc.id)) continue
        if (results.length >= limit) break
        const data = doc.data()
        seen.add(doc.id)
        results.push({
          barcode: doc.id,
          productName: data.productName ?? '',
          brand: data.brand ?? '',
          category: data.category ?? null,
          imageUrl: data.imageUrl ?? '',
          containerSize: data.containerSize ?? null,
          containerUnit: data.containerUnit ?? null,
          nutrition: data.nutrition ?? null,
        })
      }

      // External fallback — when a typed-in-full UPC misses the local
      // catalog, try USDA + OpenFoodFacts. If found, write a sparse cache
      // doc so the next lookup of any variant resolves locally, and surface
      // the product as a result. This mirrors the cache-then-external
      // contract /api/products/lookup uses for scan-time barcode hits.
      if (results.length === 0) {
        try {
          const external = await lookupProductHybrid(q)
          if (external) {
            const productName = external.product_name || ''
            const brand = external.brands || ''
            const imageUrl = external.image_url || ''
            const now = new Date()
            const aliases = barcodeVariants(q)
            try {
              await adminDb
                .collection('product_database')
                .doc(q)
                .set(
                  {
                    barcode: q,
                    productName,
                    brand,
                    imageUrl,
                    category: 'other',
                    aliases,
                    createdAt: now,
                    updatedAt: now,
                    quality: {
                      verified: false,
                      verificationCount: 0,
                      dataSource: 'usda+off',
                      confidence: 60,
                    },
                  },
                  { merge: true },
                )
            } catch (writeErr) {
              logger.warn('[products/search] sparse catalog write failed', {
                error: (writeErr as Error).message,
                barcode: q,
              })
            }
            results.push({
              barcode: q,
              productName,
              brand,
              category: 'other',
              imageUrl,
              containerSize: null,
              containerUnit: null,
              nutrition: null,
            })
          }
        } catch (lookupErr) {
          logger.warn('[products/search] external lookup failed', {
            error: (lookupErr as Error).message,
            barcode: q,
          })
        }
      }

      return NextResponse.json({ results })
    }

    // Text path — uppercase prefix-range query on productName. The bulk-
    // imported USDA catalog uses uppercase, so this matches reliably; the
    // long tail of mixed-case user-edited entries is a known blind spot
    // (acceptable until we add a productName_lower migration).
    const upper = q.toUpperCase()
    let query: FirebaseFirestore.Query = adminDb.collection('product_database')
    if (category && category !== 'all') {
      query = query.where('category', '==', category)
    }
    query = query
      .where('productName', '>=', upper)
      .where('productName', '<=', upper + '')
      .orderBy('productName')
      .limit(limit)

    const snap = await query.get()
    const results = snap.docs.map((d) => {
      const data = d.data()
      return {
        barcode: d.id,
        productName: data.productName ?? '',
        brand: data.brand ?? '',
        category: data.category ?? null,
        imageUrl: data.imageUrl ?? '',
        containerSize: data.containerSize ?? null,
        containerUnit: data.containerUnit ?? null,
        nutrition: data.nutrition ?? null,
      }
    })

    return NextResponse.json({ results })
  } catch (error) {
    logger.error('[products/search] Failed', error as Error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
