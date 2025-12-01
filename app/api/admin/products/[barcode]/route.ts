import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

interface ScanEvent {
  id: string
  scannedAt: string
  region?: string
  store?: string
  priceCents?: number
  purchased?: boolean
  context?: string
}

/**
 * GET /api/admin/products/[barcode]
 * Get detailed product information and analytics
 */
export async function GET(
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

    if (!isSuperAdmin && adminData?.role !== 'admin' && adminData?.role !== 'moderator' && adminData?.role !== 'support') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Fetch product document
    const productDoc = await adminDb.collection('product_database').doc(barcode).get()

    if (!productDoc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const productData = productDoc.data()

    // Fetch scan events from subcollection
    const scansSnapshot = await adminDb
      .collection('product_database')
      .doc(barcode)
      .collection('scans')
      .orderBy('scannedAt', 'desc')
      .limit(100)
      .get()

    const scanEvents: ScanEvent[] = scansSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        scannedAt: data.scannedAt?.toDate?.()?.toISOString() || data.scannedAt,
        region: data.region,
        store: data.store,
        priceCents: data.priceCents,
        purchased: data.purchased,
        context: data.context
      }
    })

    // Calculate scan timeline (scans per day for last 30 days)
    const scanTimeline: Record<string, number> = {}
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    scanEvents.forEach(scan => {
      const scanDate = new Date(scan.scannedAt)
      if (scanDate >= thirtyDaysAgo) {
        const dateKey = scanDate.toISOString().split('T')[0]
        scanTimeline[dateKey] = (scanTimeline[dateKey] || 0) + 1
      }
    })

    // Regional breakdown
    const regionalData: Record<string, { scans: number; stores: Set<string>; prices: number[] }> = {}
    scanEvents.forEach(scan => {
      if (scan.region) {
        if (!regionalData[scan.region]) {
          regionalData[scan.region] = { scans: 0, stores: new Set(), prices: [] }
        }
        regionalData[scan.region].scans++
        if (scan.store) regionalData[scan.region].stores.add(scan.store)
        if (scan.priceCents) regionalData[scan.region].prices.push(scan.priceCents)
      }
    })

    const regionalBreakdown = Object.entries(regionalData).map(([region, data]) => ({
      region,
      scans: data.scans,
      stores: Array.from(data.stores),
      avgPriceCents: data.prices.length > 0
        ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length)
        : 0
    }))

    // Store breakdown
    const storeData: Record<string, number> = {}
    scanEvents.forEach(scan => {
      if (scan.store) {
        storeData[scan.store] = (storeData[scan.store] || 0) + 1
      }
    })

    const storeBreakdown = Object.entries(storeData)
      .map(([store, scans]) => ({ store, scans }))
      .sort((a, b) => b.scans - a.scans)

    // Purchase conversion rate
    const totalScansWithContext = scanEvents.length
    const totalPurchases = scanEvents.filter(s => s.purchased).length
    const conversionRate = totalScansWithContext > 0
      ? ((totalPurchases / totalScansWithContext) * 100).toFixed(1)
      : '0.0'

    // Context breakdown
    const contextBreakdown: Record<string, number> = {}
    scanEvents.forEach(scan => {
      const context = scan.context || 'unknown'
      contextBreakdown[context] = (contextBreakdown[context] || 0) + 1
    })

    return NextResponse.json({
      product: {
        barcode,
        ...productData,
        stats: {
          ...productData?.stats,
          firstSeenAt: productData?.stats?.firstSeenAt?.toDate?.()?.toISOString() || productData?.stats?.firstSeenAt,
          lastSeenAt: productData?.stats?.lastSeenAt?.toDate?.()?.toISOString() || productData?.stats?.lastSeenAt
        },
        regional: {
          ...productData?.regional,
          lastPriceUpdate: productData?.regional?.lastPriceUpdate?.toDate?.()?.toISOString() || productData?.regional?.lastPriceUpdate
        },
        quality: {
          ...productData?.quality,
          lastVerified: productData?.quality?.lastVerified?.toDate?.()?.toISOString() || productData?.quality?.lastVerified
        },
        createdAt: productData?.createdAt?.toDate?.()?.toISOString() || productData?.createdAt,
        updatedAt: productData?.updatedAt?.toDate?.()?.toISOString() || productData?.updatedAt
      },
      analytics: {
        scanTimeline: Object.entries(scanTimeline).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
        regionalBreakdown,
        storeBreakdown,
        contextBreakdown: Object.entries(contextBreakdown).map(([context, count]) => ({ context, count })),
        conversionRate: parseFloat(conversionRate),
        recentScans: scanEvents.slice(0, 20)
      }
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/products/[barcode]',
      operation: 'fetch'
    })
  }
}

/**
 * PUT /api/admin/products/[barcode]
 * Update product information
 */
export async function PUT(
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
    const body = await request.json()

    // Validate required fields
    if (!body.productName || !body.brand || !body.category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get current product data for comparison (for edit history)
    const productRef = adminDb.collection('product_database').doc(barcode)
    const currentProduct = await productRef.get()

    if (!currentProduct.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const currentData = currentProduct.data()

    // Prepare update data
    const now = new Date()
    const updateData: any = {
      productName: body.productName,
      brand: body.brand,
      imageUrl: body.imageUrl || '',
      category: body.category,
      nutrition: {
        calories: body.nutrition?.calories || 0,
        protein: body.nutrition?.protein || 0,
        carbs: body.nutrition?.carbs || 0,
        fat: body.nutrition?.fat || 0,
        fiber: body.nutrition?.fiber || 0,
        sodium: body.nutrition?.sodium || 0,
        servingSize: body.nutrition?.servingSize || ''
      },
      'quality.verified': body.quality?.verified || false,
      'quality.dataSource': body.quality?.dataSource || 'openfoodfacts',
      'quality.confidence': body.quality?.confidence || 50,
      updatedAt: now
    }

    // If manually verified, update verification metadata
    if (body.quality?.verified && !currentData?.quality?.verified) {
      updateData['quality.lastVerified'] = now
      updateData['quality.verificationCount'] = (currentData?.quality?.verificationCount || 0) + 1
    }

    // Update the product
    await productRef.update(updateData)

    // Track changes for edit history
    const changes: any = {}

    if (currentData?.productName !== body.productName) {
      changes.productName = { before: currentData?.productName, after: body.productName }
    }
    if (currentData?.brand !== body.brand) {
      changes.brand = { before: currentData?.brand, after: body.brand }
    }
    if (currentData?.category !== body.category) {
      changes.category = { before: currentData?.category, after: body.category }
    }
    if (currentData?.imageUrl !== body.imageUrl) {
      changes.imageUrl = { before: currentData?.imageUrl, after: body.imageUrl }
    }

    // Track nutrition changes
    const nutritionFields = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium', 'servingSize']
    nutritionFields.forEach(field => {
      if (currentData?.nutrition?.[field] !== body.nutrition?.[field]) {
        changes[`nutrition.${field}`] = {
          before: currentData?.nutrition?.[field],
          after: body.nutrition?.[field]
        }
      }
    })

    // Add edit history entry
    await productRef.collection('edit_history').add({
      editedBy: adminUid,
      editedByEmail: adminEmail,
      editedAt: now,
      action: 'edit',
      changes
    })

    logger.info(`Product ${barcode} edited by ${adminEmail}`, { changes })

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      barcode
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/products/[barcode]',
      operation: 'update'
    })
  }
}
