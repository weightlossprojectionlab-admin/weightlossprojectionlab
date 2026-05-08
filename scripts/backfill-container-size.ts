/**
 * One-shot backfill for Phase 2a: containerSize + containerUnit on
 * existing product_database docs.
 *
 * Approach (efficient direction): load branded_food.csv into an
 * in-memory Map<upc, {size, unit, raw}>, then iterate product_database
 * (paged in chunks of 500). For each doc that's missing containerSize,
 * look up by doc.id in the map and patch it via batched writes.
 *
 * Why this direction: the catalog has ~456k docs but the CSV has
 * ~1.99M rows. Iterating the smaller side and looking up the larger
 * side in memory is ~4x fewer Firestore ops. Each doc gets at most
 * one read (via the batched listing) and one write.
 *
 * Idempotent: skips docs that already have containerSize set, so
 * re-runs are cheap and safe.
 *
 * Run modes:
 *   --dry  Print a summary, don't write
 *   --live Actually update Firestore
 *
 * Run: npm run backfill:container -- <path-to-branded_food.csv> --live
 */
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import csvParser from 'csv-parser'
import { parsePackageWeight, type ParsedPackageWeight } from '../lib/package-weight'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const BATCH_LIMIT = 450 // Firestore caps at 500 ops/batch
const PAGE_SIZE = 500
const DEFAULT_CSV_PATH = process.env.USDA_BRANDED_CSV_PATH || ''

interface CsvEntry {
  parsed: ParsedPackageWeight
  raw: string
}

function normalizeUpc(raw: string): string {
  return (raw || '').replace(/\D/g, '')
}

async function loadCsvIntoMap(csvPath: string): Promise<Map<string, CsvEntry>> {
  console.log('[Backfill] Streaming branded_food.csv into memory…')
  const map = new Map<string, CsvEntry>()
  let scanned = 0
  let kept = 0
  const stream = fs.createReadStream(csvPath).pipe(csvParser())

  for await (const row of stream as AsyncIterable<Record<string, string>>) {
    scanned++
    if (scanned % 250_000 === 0) {
      console.log(`  scanned ${scanned.toLocaleString()} rows, kept ${kept.toLocaleString()}`)
    }
    const upc = normalizeUpc(row.gtin_upc)
    if (!upc) continue
    const parsed = parsePackageWeight(row.package_weight || '')
    if (!parsed) continue
    // Multiple CSV rows can share a UPC (different fdc_ids); keep the
    // first one with parseable package_weight. They tend to agree.
    if (!map.has(upc)) {
      map.set(upc, { parsed, raw: row.package_weight || '' })
      kept++
    }
  }
  console.log(`  done: ${scanned.toLocaleString()} scanned, ${kept.toLocaleString()} unique UPCs with parseable package_weight\n`)
  return map
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

  console.log(`\n[Backfill] ${live ? 'LIVE' : 'DRY-RUN'} mode`)
  console.log(`[Backfill] Reading: ${csvPath}\n`)

  const csvMap = await loadCsvIntoMap(csvPath)

  const { adminDb } = await import('../lib/firebase-admin')
  const collection = adminDb.collection('product_database')

  console.log('[Backfill] Iterating product_database in pages of', PAGE_SIZE)

  let docsScanned = 0
  let docsAlreadySet = 0
  let docsNoCsvMatch = 0
  let docsCandidate = 0
  let docsUpdated = 0

  let batch = adminDb.batch()
  let batchSize = 0

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

  let lastDocId: string | null = null
  while (true) {
    let q: FirebaseFirestore.Query = collection.orderBy('__name__').limit(PAGE_SIZE)
    if (lastDocId) {
      const lastSnap = await collection.doc(lastDocId).get()
      if (lastSnap.exists) q = q.startAfter(lastSnap)
    }
    const snap = await q.get()
    if (snap.empty) break

    for (const doc of snap.docs) {
      docsScanned++
      const data = doc.data()
      // Idempotency — skip docs that already have containerSize.
      if (typeof data.containerSize === 'number' && data.containerSize > 0) {
        docsAlreadySet++
        continue
      }
      const csvHit = csvMap.get(doc.id)
      if (!csvHit) {
        docsNoCsvMatch++
        continue
      }
      docsCandidate++

      batch.update(doc.ref, {
        containerSize: csvHit.parsed.size,
        containerUnit: csvHit.parsed.unit,
        packageWeightRaw: csvHit.raw,
        updatedAt: new Date(),
      })
      batchSize++
      docsUpdated++

      if (batchSize >= BATCH_LIMIT) await flush()
    }

    if (docsScanned % 25_000 === 0) {
      console.log(`  scanned ${docsScanned.toLocaleString()} docs, updated ${docsUpdated.toLocaleString()}`)
    }

    lastDocId = snap.docs[snap.docs.length - 1].id
    if (snap.size < PAGE_SIZE) break
  }
  await flush()

  console.log('\n[Backfill] Complete')
  console.log(`  docsScanned:     ${docsScanned.toLocaleString()}`)
  console.log(`  docsAlreadySet:  ${docsAlreadySet.toLocaleString()}`)
  console.log(`  docsNoCsvMatch:  ${docsNoCsvMatch.toLocaleString()} (UPC not in branded_food.csv or unparseable package_weight)`)
  console.log(`  docsCandidate:   ${docsCandidate.toLocaleString()}`)
  console.log(`  docsUpdated:     ${docsUpdated.toLocaleString()} ${live ? '' : '(dry-run, no writes)'}`)
  if (!live && docsCandidate > 0) {
    console.log(`\n  Re-run with --live to apply.`)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
