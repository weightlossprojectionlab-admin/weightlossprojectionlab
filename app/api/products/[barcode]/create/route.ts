import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { resolveProductDoc, barcodeVariants } from '@/lib/barcode-variants'

/**
 * POST /api/products/[barcode]/create
 *
 * Creates a new global catalog entry from user-supplied data — name + brand
 * + category + (optional) imageUrl. Used by /inventory's UPC tab when the
 * user adds a barcode that isn't in product_database yet (USDA + OFF missed
 * it, no other user has scanned it).
 *
 * Why a new endpoint vs. extending /name:
 *   - Naming alone is one field with a tight contract ("don't overwrite
 *     curated"). Creating a full row carries more fields, distinct guards.
 *   - Audit action is different — `create_full` vs `rename_unknown` — so
 *     admin tooling can filter user-supplied creates separately.
 *
 * Guards:
 *   - Auth required, attributable userId in audit trail.
 *   - Rate-limited (same fetch-url bucket as /lookup and /name).
 *   - If the canonical doc already has a non-empty productName, returns
 *     409. Curated/scraped names are not silently overwritten — caller
 *     should fall back to "Add as alternate" without creating.
 *   - Image upload happens client-side (lib/product-image-upload.ts) so
 *     this route only persists the resulting URL, not bytes.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ barcode: string }> },
) {
  const rateLimitResponse = await rateLimit(request, 'fetch-url')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { barcode } = await context.params

    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    let userId: string
    let userEmail: string
    try {
      const decoded = await verifyIdToken(idToken)
      userId = decoded.uid
      userEmail = decoded.email || 'unknown'
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const productName = (body?.productName || '').toString().trim()
    const brand = (body?.brand || '').toString().trim()
    const category = (body?.category || 'other').toString().trim()
    const imageUrl = (body?.imageUrl || '').toString().trim()

    if (!productName) {
      return NextResponse.json({ error: 'productName is required' }, { status: 400 })
    }
    if (productName.length > 200 || brand.length > 100) {
      return NextResponse.json({ error: 'Field too long' }, { status: 400 })
    }

    const resolved = await resolveProductDoc(adminDb, barcode)
    const now = new Date()

    if (resolved) {
      const data = resolved.snap.data() || {}
      const existingName = (data.productName || '').toString()
      const isEmptyOrPlaceholder =
        !existingName || existingName.toLowerCase() === 'unknown product'
      if (!isEmptyOrPlaceholder) {
        return NextResponse.json(
          {
            error: 'This barcode already exists in the catalog with a name.',
            currentName: existingName,
            barcode: resolved.resolvedId,
          },
          { status: 409 },
        )
      }

      // Sparse doc — likely created by addProductImage's stub path. Fill
      // in the curated fields the user just supplied. Image is left alone
      // if already set (don't overwrite a curated upload).
      const updates: Record<string, unknown> = {
        productName,
        updatedAt: now,
      }
      if (brand && !data.brand) updates.brand = brand
      if (category && (!data.category || data.category === 'other')) updates.category = category
      if (imageUrl && !data.imageUrl) updates.imageUrl = imageUrl
      await resolved.ref.update(updates)

      try {
        await resolved.ref.collection('edit_history').add({
          editedBy: userId,
          editedByEmail: userEmail,
          editedAt: now,
          action: 'create_full',
          changes: {
            productName: { before: existingName, after: productName },
            ...(brand ? { brand: { before: data.brand || '', after: brand } } : {}),
            ...(category ? { category: { before: data.category || '', after: category } } : {}),
            ...(imageUrl && !data.imageUrl ? { imageUrl: { before: '', after: imageUrl } } : {}),
          },
        })
      } catch (auditErr) {
        logger.error('[Create] audit-write failed (sparse upgrade)', auditErr as Error, {
          barcode: resolved.resolvedId,
          userId,
        })
      }

      return NextResponse.json({
        success: true,
        barcode: resolved.resolvedId,
        productName,
        upgraded: true,
      })
    }

    // No doc at all — create from scratch.
    const newRef = adminDb.collection('product_database').doc(barcode)
    const aliases = barcodeVariants(barcode)
    await newRef.set({
      barcode,
      productName,
      brand,
      imageUrl,
      category,
      aliases,
      nutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sodium: 0,
        servingSize: '',
      },
      stats: {
        totalScans: 0,
        uniqueUsers: 0,
        totalPurchases: 0,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      quality: {
        verified: false,
        verificationCount: 0,
        dataSource: 'user',
        confidence: 30,
      },
      createdAt: now,
      updatedAt: now,
    })
    try {
      await newRef.collection('edit_history').add({
        editedBy: userId,
        editedByEmail: userEmail,
        editedAt: now,
        action: 'create_full',
        changes: {
          productName: { before: '', after: productName },
          brand: { before: '', after: brand },
          category: { before: '', after: category },
          imageUrl: { before: '', after: imageUrl },
        },
      })
    } catch (auditErr) {
      logger.error('[Create] audit-write failed (new doc)', auditErr as Error, {
        barcode,
        userId,
      })
    }

    logger.info('[Create] user-supplied catalog entry created', {
      barcode,
      userId,
      productName,
      hasBrand: !!brand,
      hasImage: !!imageUrl,
    })
    return NextResponse.json({
      success: true,
      barcode,
      productName,
      created: true,
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/products/[barcode]/create',
      operation: 'create_full',
    })
  }
}
