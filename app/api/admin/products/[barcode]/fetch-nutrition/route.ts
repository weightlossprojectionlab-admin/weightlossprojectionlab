import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { lookupBarcodeServer } from '@/lib/openfoodfacts-server'

/**
 * POST /api/admin/products/[barcode]/fetch-nutrition
 * Fetch and update nutrition data from OpenFoodFacts
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
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail.toLowerCase())

    if (!isSuperAdmin && adminData?.role !== 'admin' && adminData?.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Check if product exists in database
    const productRef = adminDb.collection('product_database').doc(barcode)
    const productDoc = await productRef.get()

    if (!productDoc.exists) {
      return NextResponse.json({ error: 'Product not found in database' }, { status: 404 })
    }

    // Fetch from OpenFoodFacts
    logger.info(`Fetching nutrition data for barcode ${barcode}`)
    const offResponse = await lookupBarcodeServer(barcode)

    if (offResponse.status !== 1 || !offResponse.product) {
      return NextResponse.json({
        error: 'Product not found in OpenFoodFacts',
        details: offResponse.status_verbose
      }, { status: 404 })
    }

    const product = offResponse.product
    const nutriments = product.nutriments || {}

    // Extract nutrition data (prefer per-serving, fallback to per-100g)
    const calories = nutriments['energy-kcal_serving'] || nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0
    const protein = nutriments.proteins_serving || nutriments.proteins_100g || nutriments.proteins || 0
    const carbs = nutriments.carbohydrates_serving || nutriments.carbohydrates_100g || nutriments.carbohydrates || 0
    const fat = nutriments.fat_serving || nutriments.fat_100g || nutriments.fat || 0
    const fiber = nutriments.fiber_serving || nutriments.fiber_100g || nutriments.fiber || 0
    const sodium = nutriments.sodium_serving || nutriments.sodium_100g || nutriments.sodium || 0

    // Prepare update data
    const updateData: Record<string, any> = {
      nutrition: {
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        fiber: Math.round(fiber * 10) / 10,
        sodium: Math.round(sodium),
        servingSize: product.serving_size || product.quantity || ''
      },
      'quality.dataSource': 'openfoodfacts',
      updatedAt: new Date()
    }

    // Optionally update product name and brand if they were missing or generic
    const currentData = productDoc.data()
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

    // Update image if better quality available
    const newImageUrl = product.image_front_url || product.image_url
    if (newImageUrl && (!currentData?.imageUrl || currentData.imageUrl.length < newImageUrl.length)) {
      updateData['imageUrl'] = newImageUrl
    }

    // Update the product
    await productRef.update(updateData)

    // Get updated product
    const updatedDoc = await productRef.get()
    const updatedProduct = updatedDoc.data()

    logger.info(`Successfully updated nutrition data for barcode ${barcode}`, {
      admin: adminEmail,
      calories: updateData.nutrition.calories,
      protein: updateData.nutrition.protein
    })

    return NextResponse.json({
      success: true,
      message: 'Nutrition data updated successfully',
      product: {
        barcode,
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
    logger.error('Error fetching nutrition data', error as Error, {
      barcode: params?.barcode
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch nutrition data' },
      { status: 500 }
    )
  }
}
