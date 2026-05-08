import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { resolveProductDoc, barcodeVariants } from '@/lib/barcode-variants'

/**
 * POST /api/products/[barcode]/image
 *
 * Persists a product imageUrl onto the global catalog (product_database/{barcode}).
 * The image bytes themselves are uploaded to Firebase Storage client-side
 * (lib/product-image-upload.ts); this endpoint only writes the resulting
 * download URL to Firestore — which the client SDK can't do directly because
 * firestore.rules blocks user writes to product_database (server-only).
 *
 * Modes:
 *   - Default (gentle write): only sets imageUrl when the doc currently has
 *     none. Drive-by scan paths (first-time scan with camera capture) use
 *     this default so accidental captures can't clobber curated images.
 *   - { replace: true }: force-overwrites the existing imageUrl. Used by
 *     explicit-intent surfaces (Inventory Image tab "Replace photo") where
 *     the user is deliberately picking THIS photo for THIS barcode.
 *
 * Behavior:
 *   - Resolves the input barcode through resolveProductDoc so any plausible
 *     variant lands on the canonical doc.
 *   - If no doc exists, creates a sparse stub (same shape as /name's upsert
 *     path) so the image isn't orphaned.
 *   - Writes an edit_history entry with action 'set_image' or 'replace_image'
 *     so admin tooling can filter user-supplied changes.
 *
 * Returns: { success, barcode, imageUrl, replaced }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ barcode: string }> }
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
    const imageUrl = (body?.imageUrl || '').toString().trim()
    const replace = body?.replace === true

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 })
    }
    if (imageUrl.length > 2048) {
      return NextResponse.json({ error: 'imageUrl too long (max 2048)' }, { status: 400 })
    }

    const resolved = await resolveProductDoc(adminDb, barcode)
    const now = new Date()

    // No existing doc → create a sparse stub. Mirrors /name's upsert path.
    if (!resolved) {
      const newRef = adminDb.collection('product_database').doc(barcode)
      const aliases = barcodeVariants(barcode)
      await newRef.set({
        barcode,
        productName: '',
        brand: '',
        imageUrl,
        category: 'other',
        aliases,
        nutrition: {
          calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, servingSize: '',
        },
        stats: {
          totalScans: 0, uniqueUsers: 0, totalPurchases: 0,
          firstSeenAt: now, lastSeenAt: now,
        },
        quality: {
          verified: false, verificationCount: 0,
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
          action: 'set_image_create',
          changes: { imageUrl: { before: '', after: imageUrl } },
        })
      } catch (auditErr) {
        logger.error('[Product Image] audit-on-create failed', auditErr as Error, {
          barcode, userId,
        })
      }
      logger.info('[Product Image] created sparse stub with image', {
        barcode, userId,
      })
      return NextResponse.json({
        success: true,
        barcode,
        imageUrl,
        replaced: false,
        created: true,
      })
    }

    const data = resolved.snap.data() || {}
    const before = (data.imageUrl || '').toString()

    // Gentle-write guard: skip when an image already exists and caller
    // didn't ask for replace. Surface a 409 so the client knows it didn't
    // win — most call sites can ignore this since the user already has
    // their Storage upload regardless.
    if (before && !replace) {
      return NextResponse.json(
        {
          error: 'Catalog already has an image. Pass replace:true to overwrite.',
          currentImageUrl: before,
        },
        { status: 409 }
      )
    }

    await resolved.ref.update({
      imageUrl,
      updatedAt: now,
    })

    try {
      await resolved.ref.collection('edit_history').add({
        editedBy: userId,
        editedByEmail: userEmail,
        editedAt: now,
        action: replace && before ? 'replace_image' : 'set_image',
        changes: { imageUrl: { before, after: imageUrl } },
      })
    } catch (auditErr) {
      logger.error('[Product Image] audit entry failed', auditErr as Error, {
        barcode: resolved.resolvedId, userId,
      })
    }

    logger.info('[Product Image] catalog imageUrl updated', {
      barcode: resolved.resolvedId,
      userId,
      mode: replace && before ? 'replace' : 'set',
    })

    return NextResponse.json({
      success: true,
      barcode: resolved.resolvedId,
      imageUrl,
      replaced: !!before,
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/products/[barcode]/image',
      operation: 'set_image',
    })
  }
}
