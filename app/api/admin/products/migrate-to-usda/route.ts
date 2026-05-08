import { NextRequest, NextResponse, after } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { lookupProductHybrid } from '@/lib/product-lookup-server'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { extractNutritionFromProduct } from '@/lib/nutrition-extraction'

/**
 * POST /api/admin/products/migrate-to-usda
 *
 * Chunked, self-chaining migration of the entire product_database. Each
 * invocation processes BATCH_SIZE products, updates the
 * `migrations/migrate-to-usda` status doc with progress + cursor, then
 * fires a fire-and-forget self-call (via Next.js `after()`) to process
 * the next batch. Loop ends when no more docs remain.
 *
 * Behavior per product:
 *   - Look up via USDA-strict hybrid (USDA for nutrition, OFF for image only)
 *   - USDA hit  → REPLACE the row with USDA nutrition + OFF image
 *   - USDA miss → DELETE the row
 *
 * Why chunked: a 465k catalog at 200ms / item is ~26 hours of work. Single
 * synchronous invocation hits HTTP timeouts long before completion. Chunked
 * + checkpointed survives serverless time limits and is naturally resumable
 * — the cursor lives in the status doc, so a manual re-trigger picks up
 * where the chain stopped.
 *
 * Status doc shape (`migrations/migrate-to-usda`):
 *   - status: 'running' | 'complete' | 'failed' | 'paused'
 *   - total, processed, migrated, deleted, errors (counts)
 *   - cursor: last-processed doc id (for resume)
 *   - runId: distinguishes restarts (set on first invocation, threaded through)
 *   - startedAt, finishedAt
 *   - performedBy, performedByEmail
 *   - errorMessage (only when status='failed')
 *
 * Query params:
 *   - cursor   — last processed doc id; omit to start a new run
 *   - runId    — thread runId through the chain; omit on first invocation
 *   - dryRun=1 — counts only, no writes
 */

const BATCH_SIZE = 100
const PER_ITEM_DELAY_MS = 200

type Stats = {
  migrated: number
  deleted: number
  errors: number
}

export async function POST(request: NextRequest) {
  let adminUid = ''
  let adminEmail = ''
  try {
    // Admin auth
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    adminUid = decodedToken.uid
    adminEmail = decodedToken.email || 'unknown'

    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuper = isSuperAdmin(adminEmail)
    if (!isSuper && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin role required' }, { status: 403 })
    }

    const params = request.nextUrl.searchParams
    const cursorParam = params.get('cursor') // null means "start a new run"
    const runIdParam = params.get('runId')
    const dryRun = params.get('dryRun') === '1'

    const statusRef = adminDb.collection('migrations').doc('migrate-to-usda')

    // First invocation — initialize status doc with total + reset counters.
    let runId = runIdParam
    if (!cursorParam) {
      const totalSnap = await adminDb.collection('product_database').count().get()
      const total = totalSnap.data().count
      runId = runIdParam || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      logger.info('[Migrate→USDA] Starting new run', {
        admin: adminEmail,
        runId,
        total,
        dryRun,
      })
      if (!dryRun) {
        await statusRef.set({
          status: 'running',
          runId,
          total,
          processed: 0,
          migrated: 0,
          deleted: 0,
          errors: 0,
          cursor: null,
          startedAt: new Date(),
          performedBy: adminUid,
          performedByEmail: adminEmail,
          finishedAt: null,
          errorMessage: null,
        })
      }
    }

    // RunId guard — if the status doc shows a different active runId, this
    // chain is stale (a newer migration was started). Abort silently to
    // avoid double-processing.
    if (cursorParam) {
      const statusSnap = await statusRef.get()
      const liveRunId = statusSnap.data()?.runId
      if (liveRunId && runId && liveRunId !== runId) {
        logger.info('[Migrate→USDA] stale chain — aborting', {
          ourRunId: runId,
          liveRunId,
        })
        return NextResponse.json({ done: true, stale: true })
      }
    }

    // Build the batch query — orderBy doc id so cursor pagination is stable.
    let query = adminDb
      .collection('product_database')
      .orderBy('__name__')
      .limit(BATCH_SIZE)
    if (cursorParam) {
      query = query.startAfter(cursorParam)
    }
    const batch = await query.get()

    if (batch.empty) {
      // No more docs — mark complete.
      if (!dryRun) {
        await statusRef.update({
          status: 'complete',
          finishedAt: new Date(),
          cursor: null,
        })
        try {
          const final = (await statusRef.get()).data()
          await adminDb.collection('admin_actions').add({
            action: 'migrate_to_usda',
            performedBy: adminUid,
            performedByEmail: adminEmail,
            stats: {
              total: final?.total ?? 0,
              migrated: final?.migrated ?? 0,
              deleted: final?.deleted ?? 0,
              errors: final?.errors ?? 0,
            },
            runId,
            timestamp: new Date(),
          })
        } catch (e) {
          logger.warn('[Migrate→USDA] audit log write failed', { error: (e as Error).message })
        }
      }
      logger.info('[Migrate→USDA] Run complete', { runId, admin: adminEmail })
      return NextResponse.json({ done: true })
    }

    // Process this batch.
    const stats: Stats = { migrated: 0, deleted: 0, errors: 0 }
    let lastDocId = cursorParam ?? ''
    for (const productDoc of batch.docs) {
      const barcode = productDoc.id
      try {
        const product = await lookupProductHybrid(barcode, { strictUsdaNutrition: true })
        if (product) {
          // Shared extractor — converts per-100g → per-serving when
          // serving_quantity is known, flags row's basis otherwise.
          const nutrition: Record<string, any> = extractNutritionFromProduct(product)
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
        } else {
          if (!dryRun) {
            await productDoc.ref.delete()
          }
          stats.deleted++
        }
        await new Promise((r) => setTimeout(r, PER_ITEM_DELAY_MS))
      } catch (error) {
        stats.errors++
        logger.error('[Migrate→USDA] row error', error as Error, { barcode })
      }
      lastDocId = barcode
    }

    // Atomic increment so concurrent updates (shouldn't happen, but defensive)
    // don't clobber each other.
    if (!dryRun) {
      await statusRef.update({
        processed: FieldValue.increment(batch.size),
        migrated: FieldValue.increment(stats.migrated),
        deleted: FieldValue.increment(stats.deleted),
        errors: FieldValue.increment(stats.errors),
        cursor: lastDocId,
      })
    }

    // Self-chain — fire-and-forget call to process the next batch. `after()`
    // runs after the response is sent, so the next invocation kicks off
    // server-side and the admin can close their tab. The chain ends
    // naturally when a batch returns empty.
    const isFinalBatch = batch.size < BATCH_SIZE
    if (!dryRun && !isFinalBatch && runId) {
      const selfUrl = new URL('/api/admin/products/migrate-to-usda', request.nextUrl.origin)
      selfUrl.searchParams.set('cursor', lastDocId)
      selfUrl.searchParams.set('runId', runId)
      const forwardAuth = authHeader || ''
      const forwardCookie = request.headers.get('cookie') || ''
      after(async () => {
        try {
          await fetch(selfUrl.toString(), {
            method: 'POST',
            headers: {
              ...(forwardAuth ? { authorization: forwardAuth } : {}),
              ...(forwardCookie ? { cookie: forwardCookie } : {}),
            },
          })
        } catch (e) {
          logger.error('[Migrate→USDA] self-chain failed', e as Error, {
            cursor: lastDocId,
            runId,
          })
          try {
            await statusRef.update({
              status: 'paused',
              errorMessage: `Chain broken at cursor ${lastDocId}: ${(e as Error).message}`,
            })
          } catch (writeErr) {
            logger.warn('[Migrate→USDA] paused-status write failed', {
              error: (writeErr as Error).message,
            })
          }
        }
      })
    } else if (!dryRun && isFinalBatch) {
      // Smaller-than-batch-size means we just hit the tail. Mark complete.
      await statusRef.update({
        status: 'complete',
        finishedAt: new Date(),
        cursor: null,
      })
      try {
        const final = (await statusRef.get()).data()
        await adminDb.collection('admin_actions').add({
          action: 'migrate_to_usda',
          performedBy: adminUid,
          performedByEmail: adminEmail,
          stats: {
            total: final?.total ?? 0,
            migrated: final?.migrated ?? 0,
            deleted: final?.deleted ?? 0,
            errors: final?.errors ?? 0,
          },
          runId,
          timestamp: new Date(),
        })
      } catch (e) {
        logger.warn('[Migrate→USDA] audit log write failed', { error: (e as Error).message })
      }
      logger.info('[Migrate→USDA] Run complete (tail)', { runId, admin: adminEmail })
    }

    return NextResponse.json({
      done: isFinalBatch,
      processed: batch.size,
      cursor: lastDocId,
      runId,
      stats,
    })
  } catch (error) {
    logger.error('[Migrate→USDA] fatal error', error as Error)
    try {
      const statusRef = adminDb.collection('migrations').doc('migrate-to-usda')
      await statusRef.update({
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Migration failed',
      })
    } catch (writeErr) {
      logger.warn('[Migrate→USDA] failed-status write also failed', {
        error: (writeErr as Error).message,
      })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 },
    )
  }
}
