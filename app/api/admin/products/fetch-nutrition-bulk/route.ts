import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { lookupBarcodeServer } from '@/lib/openfoodfacts-server'

/**
 * POST /api/admin/products/fetch-nutrition-bulk
 * Fetch and update nutrition data for multiple products from OpenFoodFacts
 */
export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const body = await request.json()
    const { barcodes } = body

    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      return NextResponse.json({ error: 'Invalid barcodes array' }, { status: 400 })
    }

    if (barcodes.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 products can be updated at once' }, { status: 400 })
    }

    logger.info(`Bulk fetching nutrition data for ${barcodes.length} products`, { admin: adminEmail })

    const results: Array<{
      barcode: string
      success: boolean
      error?: string
      updated?: boolean
    }> = []

    // Process each barcode
    for (const barcode of barcodes) {
      try {
        // Check if product exists
        const productRef = adminDb.collection('product_database').doc(barcode)
        const productDoc = await productRef.get()

        if (!productDoc.exists) {
          results.push({
            barcode,
            success: false,
            error: 'Product not found in database'
          })
          continue
        }

        // Fetch from OpenFoodFacts
        const offResponse = await lookupBarcodeServer(barcode)

        if (offResponse.status !== 1 || !offResponse.product) {
          results.push({
            barcode,
            success: false,
            error: 'Not found in OpenFoodFacts'
          })
          continue
        }

        const product = offResponse.product
        const nutriments = product.nutriments || {}

        // Extract nutrition data (prefer per-serving, fallback to per-100g)
        const calories = nutriments['energy-kcal_serving'] || nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0
        const protein = nutriments.proteins_serving || nutriments.proteins_100g || nutriments.proteins || 0
        const carbs = nutriments.carbohydrates_serving || nutriments.carbohydrates_100g || nutriments.carbohydrates || 0
        const fat = nutriments.fat_serving || nutriments.fat_100g || nutriments.fat || 0
        const fiber = nutriments.fiber_serving || nutriments.fiber_100g || nutriments.fiber || 0

        // Prepare update data
        const updateData: Record<string, any> = {
          nutrition: {
            calories: Math.round(calories),
            protein: Math.round(protein * 10) / 10,
            carbs: Math.round(carbs * 10) / 10,
            fat: Math.round(fat * 10) / 10,
            fiber: Math.round(fiber * 10) / 10,
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

        results.push({
          barcode,
          success: true,
          updated: true
        })

        // Small delay to avoid rate limiting (100ms between requests)
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        logger.error(`Error updating barcode ${barcode}`, error as Error)
        results.push({
          barcode,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Calculate summary
    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    logger.info(`Bulk nutrition fetch completed: ${successCount} success, ${failedCount} failed`, {
      admin: adminEmail,
      totalRequested: barcodes.length
    })

    return NextResponse.json({
      success: true,
      summary: {
        total: barcodes.length,
        successful: successCount,
        failed: failedCount
      },
      results
    })
  } catch (error) {
    logger.error('Error in bulk nutrition fetch', error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch nutrition data' },
      { status: 500 }
    )
  }
}
