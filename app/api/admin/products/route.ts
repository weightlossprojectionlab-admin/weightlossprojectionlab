import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { errorResponse } from '@/lib/api-response'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { resolveProductDoc } from '@/lib/barcode-variants'

/**
 * GET /api/admin/products
 *
 * Cursor-paginated, server-side-filtered product list for /admin/barcodes.
 * Refactored from the original "fetch 500 + filter client-side + scan
 * entire collection for stats" implementation that became unusable when
 * product_database grew to ~456k entries (page loads were taking 6-7
 * minutes each).
 *
 * Query params:
 *   limit       Page size (default 50, max 100)
 *   cursor      Firestore doc ID to start after (for next-page navigation)
 *   search      If all digits, exact barcode match. Otherwise prefix
 *               match on productName (case-sensitive — USDA stores
 *               products in uppercase, so user input is upper-cased
 *               server-side).
 *   category    Filter by category field (exact match)
 *   sortBy      'scans' | 'recent' | 'name' (default 'scans'; ignored
 *               when search is active so the prefix range query has the
 *               right orderBy)
 *
 * Response:
 *   products       Array of product docs (just this page)
 *   nextCursor     Doc ID to pass back as ?cursor= for next page (or null)
 *   total          Total docs matching the filter, via count() aggregation.
 *                  This is a separate single-aggregation read, not a full
 *                  collection scan.
 */
export async function GET(request: NextRequest) {
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

    if (!isSuper && adminData?.role !== 'admin' && adminData?.role !== 'moderator' && adminData?.role !== 'support') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = (searchParams.get('search') || '').trim()
    const category = searchParams.get('category')
    const cursor = searchParams.get('cursor')
    const limitRaw = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Math.min(Math.max(limitRaw, 1), 100)
    const sortBy = searchParams.get('sortBy') || 'scans'

    // Build query
    let query: FirebaseFirestore.Query = adminDb.collection('product_database')

    // Category filter (exact match)
    if (category && category !== 'all') {
      query = query.where('category', '==', category)
    }

    // Search: special-case barcode (all digits) for exact lookup; otherwise
    // do a prefix range query on productName.
    const isBarcodeSearch = /^\d+$/.test(search)
    if (search) {
      if (isBarcodeSearch) {
        // Exact barcode lookup short-circuits everything else. Use the
        // shared resolver so that admins typing/pasting any plausible
        // variant of a stored UPC (UPC-E, UPC-A, EAN-13, GTIN-14) land
        // on the canonical doc.
        const resolved = await resolveProductDoc(adminDb, search)
        if (resolved) {
          return NextResponse.json({
            products: [{ barcode: resolved.resolvedId, ...resolved.snap.data() }],
            nextCursor: null,
            total: 1,
          })
        }
        return NextResponse.json({ products: [], nextCursor: null, total: 0 })
      }
      // Text search → uppercase prefix range on productName.
      // USDA products are stored in UPPERCASE so this matches reliably for
      // the bulk-imported catalog. User-edited products with mixed case are
      // a minor blind spot — acceptable until we add a productName_lower
      // field via migration.
      const upper = search.toUpperCase()
      query = query
        .where('productName', '>=', upper)
        .where('productName', '<=', upper + '')
        .orderBy('productName')
    } else {
      // Sort (only honored when not searching — search forces orderBy productName)
      if (sortBy === 'scans') query = query.orderBy('stats.totalScans', 'desc')
      else if (sortBy === 'recent') query = query.orderBy('stats.lastSeenAt', 'desc')
      else if (sortBy === 'name') query = query.orderBy('productName', 'asc')
    }

    // Cursor pagination — startAfter(<lastDocSnapshot>). The cursor we
    // accept from the client is the last doc's ID, so we look it up first
    // and pass the snapshot to startAfter. (You can't startAfter by
    // arbitrary value when the orderBy is on a different field.)
    if (cursor) {
      const cursorDoc = await adminDb.collection('product_database').doc(cursor).get()
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc)
      }
    }

    query = query.limit(limit)

    // Total count via aggregation — single read, not a full scan
    let totalQuery: FirebaseFirestore.Query = adminDb.collection('product_database')
    if (category && category !== 'all') {
      totalQuery = totalQuery.where('category', '==', category)
    }
    if (search && !isBarcodeSearch) {
      const upper = search.toUpperCase()
      totalQuery = totalQuery
        .where('productName', '>=', upper)
        .where('productName', '<=', upper + '')
    }

    const [snapshot, countSnap] = await Promise.all([
      query.get(),
      totalQuery.count().get(),
    ])

    const products = snapshot.docs.map((doc) => ({
      barcode: doc.id,
      ...doc.data(),
    }))

    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null

    return NextResponse.json({
      products,
      nextCursor,
      total: countSnap.data().count,
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/products',
      operation: 'fetch',
    })
  }
}
