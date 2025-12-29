import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * GET /api/admin/products?search=&category=&limit=50&pageToken=
 * Get products from global product database
 */
export async function GET(request: NextRequest) {
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
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weightlossprojectionlab@gmail.com'].includes(adminEmail.toLowerCase())

    if (!isSuperAdmin && adminData?.role !== 'admin' && adminData?.role !== 'moderator' && adminData?.role !== 'support') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const sortBy = searchParams.get('sortBy') || 'scans' // scans, recent, name

    // Build query
    let query = adminDb.collection('product_database')

    // Filter by category if provided
    if (category && category !== 'all') {
      query = query.where('category', '==', category) as any
    }

    // Sort
    if (sortBy === 'scans') {
      query = query.orderBy('stats.totalScans', 'desc') as any
    } else if (sortBy === 'recent') {
      query = query.orderBy('stats.lastSeenAt', 'desc') as any
    } else if (sortBy === 'name') {
      query = query.orderBy('productName', 'asc') as any
    }

    query = query.limit(limit) as any

    const snapshot = await query.get()

    let products = snapshot.docs.map(doc => ({
      barcode: doc.id,
      ...doc.data()
    }))

    // Client-side search filter (Firestore doesn't support full-text search)
    if (search) {
      const searchLower = search.toLowerCase()
      products = products.filter((product: any) =>
        product.productName?.toLowerCase().includes(searchLower) ||
        product.brand?.toLowerCase().includes(searchLower) ||
        product.barcode?.includes(searchLower)
      )
    }

    // Calculate aggregate stats
    const allProductsSnapshot = await adminDb.collection('product_database').get()
    const totalProducts = allProductsSnapshot.size

    const stats = {
      totalProducts,
      totalScans: allProductsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().stats?.totalScans || 0), 0),
      totalPurchases: allProductsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().stats?.totalPurchases || 0), 0),
      uniqueUsers: new Set(allProductsSnapshot.docs.map(doc => doc.data().stats?.uniqueUsers || 0)).size,
    }

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {}
    allProductsSnapshot.docs.forEach(doc => {
      const cat = doc.data().category
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1
    })

    return NextResponse.json({
      products,
      stats,
      categoryBreakdown,
      count: products.length
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/products',
      operation: 'fetch'
    })
  }
}
