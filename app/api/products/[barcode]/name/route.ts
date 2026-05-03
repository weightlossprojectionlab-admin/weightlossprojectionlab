import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { resolveProductDoc } from '@/lib/barcode-variants'

/**
 * POST /api/products/[barcode]/name
 *
 * Lets any authenticated user supply a real name for a product whose
 * canonical doc currently has no useful name (empty or "Unknown Product").
 *
 * Why a separate endpoint: the existing PUT /api/admin/products/[barcode]
 * is admin-only and lets the editor change every field. We want the gentler
 * "fill in the blank" path to be available to regular users at scan time
 * — but with strong guards:
 *
 *   - Only writes if the doc's current productName is empty or
 *     "Unknown Product". Curated names are never overwritten.
 *   - Captures audit trail to product_database/{barcode}/edit_history
 *     with userId + email + the before/after, same shape the admin PUT
 *     route uses, so admin tooling can review user-supplied changes.
 *   - Rate-limited (per the existing fetch-url bucket) to prevent
 *     abuse / spam.
 *
 * Resolution: barcode is run through resolveProductDoc so any plausible
 * variant of the input lands on the canonical doc. The audit entry and
 * response carry the resolved id, not the raw input.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ barcode: string }> }
) {
  const rateLimitResponse = await rateLimit(request, 'fetch-url')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { barcode } = await context.params

    // Auth required — we want this attributable
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
    const proposedName = (body?.name || '').toString().trim()

    if (!proposedName) {
      return NextResponse.json({ error: 'Missing name' }, { status: 400 })
    }
    if (proposedName.length > 200) {
      return NextResponse.json({ error: 'Name too long (max 200 chars)' }, { status: 400 })
    }

    // Resolve any canonical-form variant to the actual doc
    const resolved = await resolveProductDoc(adminDb, barcode)
    if (!resolved) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    const data = resolved.snap.data() || {}
    const before = (data.productName || '').toString()

    // Guard: only overwrite empty / placeholder names. Curated names stay safe.
    const isEmptyOrPlaceholder =
      !before || before.toLowerCase() === 'unknown product' || before === ''
    if (!isEmptyOrPlaceholder) {
      return NextResponse.json(
        {
          error: 'This product already has a name. Only admins can rename existing products.',
          currentName: before,
        },
        { status: 409 }
      )
    }

    const now = new Date()
    await resolved.ref.update({
      productName: proposedName,
      updatedAt: now,
    })

    // Audit trail — same edit_history subcollection the admin PUT route uses.
    // Distinct action 'rename_unknown' so admins can filter user-supplied
    // renames in tooling.
    try {
      await resolved.ref.collection('edit_history').add({
        editedBy: userId,
        editedByEmail: userEmail,
        editedAt: now,
        action: 'rename_unknown',
        changes: {
          productName: { before, after: proposedName },
        },
      })
    } catch (auditErr) {
      // Audit failure shouldn't fail the rename — the rename is the primary
      // operation, the audit is best-effort.
      logger.error('[Rename] failed to write audit entry', auditErr as Error, {
        barcode: resolved.resolvedId,
        userId,
      })
    }

    logger.info('[Rename] user-supplied product name set', {
      barcode: resolved.resolvedId,
      userId,
      before,
      after: proposedName,
    })

    return NextResponse.json({
      success: true,
      barcode: resolved.resolvedId,
      productName: proposedName,
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/products/[barcode]/name',
      operation: 'rename_unknown',
    })
  }
}
