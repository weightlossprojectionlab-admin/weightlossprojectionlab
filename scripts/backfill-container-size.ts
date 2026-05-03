/**
 * One-shot backfill for Phase 2a: containerSize + containerUnit on
 * existing product_database docs.
 *
 * Streams branded_food.csv, parses each row's package_weight via
 * parsePackageWeight(), and writes containerSize + containerUnit +
 * packageWeightRaw onto the matching product_database doc identified
 * by the normalized gtin_upc.
 *
 * Why a separate script vs re-importing the catalog:
 *   - Re-import deletes + re-creates 456k docs (~3 hours of streaming
 *     nutrient data we already have). This script just patches three
 *     fields per doc.
 *   - Skips docs that already have a containerSize set (idempotent —
 *     re-runs are cheap).
 *   - Doesn't touch docs created via the user-rename flow (their
 *     barcodes won't appear in branded_food.csv).
 *
 * Run modes:
 *   --dry  Print a summary, don't write
 *   --live Actually update Firestore
 *
 * Run: npm run backfill:container -- --live
 */
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import csvParser from 'csv-parser'
import { parsePackageWeight } from '../lib/package-weight'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const BATCH_LIMIT = 450 // Firestore caps at 500 ops/batch
const DEFAULT_CSV_PATH = process.env.USDA_BRANDED_CSV_PATH || ''

function normalizeUpc(raw: string): string {
  return (raw || '').replace(/\D/g, '')
}

async function main() {
  const args = process.argv.slice(2)
  const live = args.includes('--live')
  const csvPathArg = args.find((a) => !a.startsWith('--'))
  const csvPath = csvPathArg || DEFAULT_CSV_PATH

  if (!csvPath) {
    console.error(
      'Usage: tsx scripts/backfill-container-size.ts <path-to-branded_food.csv> [--live]\n' +
        'Or set USDA_BRANDED_CSV_PATH in .env.local'
    )
    process.exit(1)
  }
  if (!fs.existsSync(csvPath)) {
    console.error(`branded_food.csv not found at: ${csvPath}`)
    process.exit(1)
  }

  const { adminDb } = await import('../lib/firebase-admin')
  const collection = adminDb.collection('product_database')

  console.log(`\n[Backfill] ${live ? 'LIVE' : 'DRY-RUN'} mode`)
  console.log(`[Backfill] Reading: ${csvPath}\n`)

  let scanned = 0
  let parsed = 0
  let updated = 0
  let skippedNoUpc = 0
  let skippedUnparseable = 0
  let skippedNoDoc = 0
  let skippedAlreadySet = 0

  let batch = adminDb.batch()
  let batchSize = 0
  let pendingFlush: Promise<unknown> = Promise.resolve()

  const flush = async () => {
    if (batchSize === 0) return
    const toCommit = batch
    batch = adminDb.batch()
    batchSize = 0
    if (live) {
      try {
        await toCommit.commit()
      } catch (e) {
        console.error(`  ! batch commit failed: ${(e as Error).message}`)
      }
    }
  }

  const stream = fs.createReadStream(csvPath).pipe(csvParser())

  for await (const row of stream as AsyncIterable<Record<string, string>>) {
    scanned++
    if (scanned % 50_000 === 0) {
      console.log(`  scanned ${scanned.toLocaleString()}, updated ${updated.toLocaleString()}`)
    }

    const upc = normalizeUpc(row.gtin_upc)
    if (!upc) {
      skippedNoUpc++
      continue
    }
    const parsedPkg = parsePackageWeight(row.package_weight)
    if (!parsedPkg) {
      skippedUnparseable++
      continue
    }
    parsed++

    // Cheap existence/idempotency check — if the doc already has a
    // containerSize, leave it alone. Saves ~half the writes on re-runs.
    const docRef = collection.doc(upc)
    const snap = await docRef.get()
    if (!snap.exists) {
      skippedNoDoc++
      continue
    }
    const existing = snap.data() || {}
    if (typeof existing.containerSize === 'number' && existing.containerSize > 0) {
      skippedAlreadySet++
      continue
    }

    batch.update(docRef, {
      containerSize: parsedPkg.size,
      containerUnit: parsedPkg.unit,
      packageWeightRaw: row.package_weight || '',
      updatedAt: new Date(),
    })
    batchSize++
    updated++

    if (batchSize >= BATCH_LIMIT) {
      await pendingFlush
      pendingFlush = flush()
    }
  }
  await pendingFlush
  await flush()

  console.log('\n[Backfill] Complete')
  console.log(`  scanned:           ${scanned.toLocaleString()}`)
  console.log(`  parsed:            ${parsed.toLocaleString()}`)
  console.log(`  updated:           ${updated.toLocaleString()} ${live ? '' : '(dry-run, no writes)'}`)
  console.log(`  skippedNoUpc:      ${skippedNoUpc.toLocaleString()}`)
  console.log(`  skippedUnparseable:${skippedUnparseable.toLocaleString()}`)
  console.log(`  skippedNoDoc:      ${skippedNoDoc.toLocaleString()}`)
  console.log(`  skippedAlreadySet: ${skippedAlreadySet.toLocaleString()}`)
  if (!live && updated > 0) {
    console.log(`\n  Re-run with --live to apply.`)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
