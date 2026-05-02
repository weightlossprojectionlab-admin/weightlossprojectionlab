import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { lookupProductHybrid } from '@/lib/product-lookup-server'
import { isSuperAdmin } from '@/lib/admin/permissions'

/**
 * POST /api/admin/products/migrate-to-usda
 *
 * One-shot destructive migration of the entire product_database.
 *
 * For each product currently cached:
 *   - Look up via USDA-strict hybrid (USDA for nutrition, OFF for image only)
 *   - USDA hit  → REPLACE the row with USDA nutrition + OFF image
 *   - USDA miss → DELETE the row
 *
 * Outcome: product_database contains only USDA-quality data. Future user
 * scans of deleted barcodes will repopulate via /api/products/lookup using
 * the lenient hybrid (OFF nutrition fallback for non-US products).
 *
 * IRREVERSIBLE for deleted rows. Inventory and shopping_items collections
 * are not affected — user-owned items keep their snapshot data.
 *
 * Optional `?dryRun=1` returns counts without writing.
 */
export async function POST(request: NextRequest) {
  try {
    // Admin auth
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuper = isSuperAdmin(adminEmail)

    // Migration is destructive — restrict to super-admin or admin role only
    // (not moderator), since moderator is typically a less-privileged role.
    if (!isSuper && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 })
    }

    const dryRun = request.nextUrl.searchParams.get('dryRun') === '1'

    logger.info('[Migrate→USDA] Starting', { admin: adminEmail, dryRun })

    const allProducts = await adminDb.collection('product_database').get()
    const stats = {
      total: allProducts.size,
      migrated: 0,
      deleted: 0,
      errors: 0,
      dryRun,
      details: [] as Array<{ barcode: string; action: 'migrate' | 'delete' | 'error'; source?: string; error?: string }>
    }

    for (const productDoc of allProducts.docs) {
      const barcode = productDoc.id
      try {
        const product = await lookupProductHybrid(barcode, { strictUsdaNutrition: true })

        if (product) {
          // USDA hit — extract nutrition (same shape as fetch-nutrition endpoint)
          const n = product.nutriments || {}
          const nutrition: Record<string, any> = {
            calories: Math.round(n['energy-kcal_serving'] || n['energy-kcal_100g'] || n['energy-kcal'] || 0),
            protein: Math.round((n.proteins_serving || n.proteins_100g || n.proteins || 0) * 10) / 10,
            carbs: Math.round((n.carbohydrates_serving || n.carbohydrates_100g || n.carbohydrates || 0) * 10) / 10,
            fat: Math.round((n.fat_serving || n.fat_100g || n.fat || 0) * 10) / 10,
            fiber: Math.round((n.fiber_serving || n.fiber_100g || n.fiber || 0) * 10) / 10,
            sodium: Math.round(n.sodium_serving || n.sodium_100g || n.sodium || 0),
            servingSize: product.serving_size || product.quantity || ''
          }
          const optional: Record<string, number | undefined> = {
            saturatedFat: n['saturated-fat_serving'] || n['saturated-fat_100g'] || n['saturated-fat'],
            transFat: n['trans-fat_serving'] || n['trans-fat_100g'] || n['trans-fat'],
            sugars: n.sugars_serving || n.sugars_100g || n.sugars,
            cholesterol: n.cholesterol_serving || n.cholesterol_100g || n.cholesterol,
            vitaminD: n['vitamin-d_serving'] || n['vitamin-d_100g'] || n['vitamin-d'],
            calcium: n.calcium_serving || n.calcium_100g || n.calcium,
            iron: n.iron_serving || n.iron_100g || n.iron,
            potassium: n.potassium_serving || n.potassium_100g || n.potassium,
          }
          for (const [k, v] of Object.entries(optional)) {
            if (v !== undefined) nutrition[k] = Math.round(v * 10) / 10
          }

          if (!dryRun) {
            await productDoc.ref.update({
              productName: product.product_name || productDoc.data()?.productName || 'Unknown Product',
              brand: product.brands || productDoc.data()?.brand || '',
              imageUrl: product.image_url || productDoc.data()?.imageUrl || '',
              nutrition,
              'quality.dataSource': product.source,
              updatedAt: new Date(),
            })
          }
          stats.migrated++
          stats.details.push({ barcode, action: 'migrate', source: product.source })
        } else {
          // USDA miss — delete the row
          if (!dryRun) {
            await productDoc.ref.delete()
          }
          stats.deleted++
          stats.details.push({ barcode, action: 'delete' })
        }

        // Conservative pacing — USDA gateway allows 1000/hour. 200ms = 5/sec
        // = 18,000/hour theoretical. Plenty of headroom.
        await new Promise((r) => setTimeout(r, 200))
      } catch (error) {
        stats.errors++
        stats.details.push({
          barcode,
          action: 'error',
          error: error instanceof Error ? error.message : String(error),
        })
        logger.error('[Migrate→USDA] row error', error as Error, { barcode })
      }
    }

    // Audit log entry — non-blocking
    if (!dryRun) {
      try {
        await adminDb.collection('admin_actions').add({
          action: 'migrate_to_usda',
          performedBy: adminUid,
          performedByEmail: adminEmail,
          stats: { total: stats.total, migrated: stats.migrated, deleted: stats.deleted, errors: stats.errors },
          timestamp: new Date(),
        })
      } catch (e) {
        logger.warn('[Migrate→USDA] audit log write failed', { error: (e as Error).message })
      }
    }

    logger.info('[Migrate→USDA] Done', {
      admin: adminEmail,
      dryRun,
      total: stats.total,
      migrated: stats.migrated,
      deleted: stats.deleted,
      errors: stats.errors,
    })

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    logger.error('[Migrate→USDA] fatal error', error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 }
    )
  }
}
