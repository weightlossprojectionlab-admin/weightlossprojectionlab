import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { lookupProductHybrid } from '@/lib/product-lookup-server'
import { errorResponse } from '@/lib/api-response'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { resolveProductDoc } from '@/lib/barcode-variants'
import { extractNutritionFromProduct } from '@/lib/nutrition-extraction'

/**
 * POST /api/admin/products/[barcode]/fetch-nutrition
 *
 * Auto-cascading nutrition fetch for the admin edit page. Tries USDA first
 * (authoritative for US branded foods), then falls back to OpenFoodFacts
 * when USDA has no record — single click, both sources tried. The button
 * in the admin UI is labeled "Fetch from OpenFoodFacts" because OFF is the
 * coverage backstop; USDA is the preferred source when available.
 *
 * `quality.dataSource` is set from the actual winning source ('usda',
 * 'openfoodfacts', or 'usda+off' when both contributed) so admins can see
 * provenance per row.
 *
 * Note: the migrate-to-usda batch route uses strict-USDA mode (deletes
 * non-USDA rows) — different intent. This route is non-strict by design.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ barcode: string }> }
) {
  let params: { barcode: string } | undefined
  try {
    // Resolve params first (Next.js 15 requirement)
    params = await context.params
    const barcode = params.barcode

    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token with Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuper = isSuperAdmin(adminEmail)

    if (!isSuper && adminData?.role !== 'admin' && adminData?.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Check if product exists in database via the shared resolver — admin
    // URLs accept any plausible variant of the barcode and land on the
    // canonical doc.
    const resolved = await resolveProductDoc(adminDb, barcode)
    if (!resolved) {
      return NextResponse.json({ error: 'Product not found in database' }, { status: 404 })
    }
    const productRef = resolved.ref
    const resolvedBarcode = resolved.resolvedId

    // Auto-cascade: USDA-first (preferred), OFF as fallback. `strictUsdaNutrition: false`
    // lets lookupProductHybrid return OFF data when USDA misses. The
    // product.source field on the returned ProductData tells us which won
    // ('usda' | 'openfoodfacts' | 'usda+off') and is mirrored to quality.dataSource.
    logger.info(`Fetching cascading nutrition (USDA → OFF) for barcode ${resolvedBarcode}`)
    const product = await lookupProductHybrid(resolvedBarcode, { strictUsdaNutrition: false })

    if (!product) {
      return NextResponse.json({
        error: 'Product not found in USDA or OpenFoodFacts. Enter values manually on the edit page.'
      }, { status: 404 })
    }

    // Extract nutrition with proper per-serving math. The shared helper
    // converts per-100g → per-serving when serving_quantity is known, and
    // flags the row's basis (`per: '100g' | 'serving'`) when conversion
    // isn't possible — display layer reads `per` to label correctly.
    const nutrition: Record<string, any> = extractNutritionFromProduct(product)

    // Prepare update data — record exactly which sources contributed
    const updateData: Record<string, any> = {
      nutrition,
      'quality.dataSource': product.source, // 'usda' | 'openfoodfacts' | 'usda+off'
      updatedAt: new Date()
    }

    // Optionally update product name and brand if they were missing or generic
    const currentData = resolved.snap.data()
    if (!currentData?.productName || currentData.productName === 'Unknown Product') {
      if (product.product_name) {
        updateData['productName'] = product.product_name
      }
    }
    if (!currentData?.brand || currentData.brand === 'Unknown Brand') {
      if (product.brands) {
        updateData['brand'] = product.brands
      }
    }

    // Update image if better quality available. lookupProductHybrid already
    // merged the OFF image into product.image_url when USDA won the nutrition
    // lookup, so this is a single source of truth.
    const newImageUrl = product.image_url
    if (newImageUrl && (!currentData?.imageUrl || currentData.imageUrl.length < newImageUrl.length)) {
      updateData['imageUrl'] = newImageUrl
    }

    // Update the product
    await productRef.update(updateData)

    // Get updated product
    const updatedDoc = await productRef.get()
    const updatedProduct = updatedDoc.data()

    logger.info(`Successfully updated nutrition data for barcode ${resolvedBarcode}`, {
      admin: adminEmail,
      calories: updateData.nutrition.calories,
      protein: updateData.nutrition.protein
    })

    return NextResponse.json({
      success: true,
      message: 'Nutrition data updated successfully',
      product: {
        barcode: resolvedBarcode,
        ...updatedProduct,
        stats: {
          ...updatedProduct?.stats,
          firstSeenAt: updatedProduct?.stats?.firstSeenAt?.toDate?.()?.toISOString() || updatedProduct?.stats?.firstSeenAt,
          lastSeenAt: updatedProduct?.stats?.lastSeenAt?.toDate?.()?.toISOString() || updatedProduct?.stats?.lastSeenAt
        },
        updatedAt: updatedProduct?.updatedAt?.toDate?.()?.toISOString() || updatedProduct?.updatedAt,
        createdAt: updatedProduct?.createdAt?.toDate?.()?.toISOString() || updatedProduct?.createdAt
      }
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/products/[barcode]/fetch-nutrition',
      operation: 'create'
    })
  }
}
