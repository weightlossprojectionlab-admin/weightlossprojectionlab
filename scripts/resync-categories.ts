/**
 * One-shot category resync.
 *
 * Walks every shopping_items doc, looks up its barcode in
 * product_database, and updates the item's category to match the
 * canonical (admin-curated) value when it differs and is a recognized
 * ProductCategory enum value.
 *
 * Why: scan-add used to source category from a client-side heuristic
 * that frequently misclassified (e.g. Heinz Ketchup -> Produce, Sweet
 * Baby Ray's BBQ -> Dairy). The fix landed in commit 8a49ac1, but
 * existing rows in users' inventories still carry the old wrong
 * categories. This script patches them up in place.
 *
 * Run modes:
 *   --dry      Print what would change, don't write
 *   --live     Actually update Firestore (default is dry-run safety)
 *
 * Run: npm run resync:categories -- --live
 */
import * as path from 'path'
import * as dotenv from 'dotenv'
import { mapUsdaCategory } from '../lib/usda-category-map'
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const VALID_CATEGORIES = new Set([
  'produce',
  'meat',
  'dairy',
  'bakery',
  'deli',
  'eggs',
  'herbs',
  'spices',
  'seafood',
  'frozen',
  'pantry',
  'beverages',
  'condiments',
  'baby',
  'pet-food',
  'pet-supplies',
  'other',
])

async function main() {
  const args = process.argv.slice(2)
  const live = args.includes('--live')
  const mode = live ? 'LIVE' : 'DRY-RUN'

  const { adminDb } = await import('../lib/firebase-admin')
  const items = adminDb.collection('shopping_items')
  const products = adminDb.collection('product_database')

  console.log(`\n[Resync] Starting in ${mode} mode`)
  console.log('[Resync] Scanning shopping_items for barcode-bearing rows…\n')

  // Cache product_database lookups so we don't refetch the same UPC
  // for every row that references it. With ~hundreds of rows but lots
  // of repeated UPCs, this saves real reads.
  const productCache = new Map<string, string | null>()

  let scanned = 0
  let candidates = 0 // had a barcode + matching product_database doc
  let mismatches = 0 // category differs from canonical
  let updated = 0
  let skippedNoBarcode = 0
  let skippedNoCanonical = 0
  let skippedInvalidCanonical = 0

  // Stream in pages of 500 to keep memory bounded
  let lastDocId: string | null = null
  while (true) {
    let q: FirebaseFirestore.Query = items.orderBy('__name__').limit(500)
    if (lastDocId) {
      const lastSnap = await items.doc(lastDocId).get()
      if (lastSnap.exists) q = q.startAfter(lastSnap)
    }
    const snap = await q.get()
    if (snap.empty) break

    for (const doc of snap.docs) {
      scanned++
      const data = doc.data()
      const barcode = (data.barcode || '').toString().trim()
      if (!barcode) {
        skippedNoBarcode++
        continue
      }

      let canonicalCategory = productCache.get(barcode)
      if (canonicalCategory === undefined) {
        const prodSnap = await products.doc(barcode).get()
        canonicalCategory = prodSnap.exists ? ((prodSnap.data()?.category || '') as string) : null
        productCache.set(barcode, canonicalCategory)
      }

      if (canonicalCategory === null) {
        skippedNoCanonical++
        continue
      }
      const lowered = canonicalCategory.toLowerCase().trim()
      // Direct match against the ProductCategory enum, OR map a USDA
      // branded_food_category string (e.g. "Ketchup, Mustard, BBQ &
      // Cheese Sauce" → "condiments") via the shared lookup table so
      // resync agrees with the scan-add path's pickCategory().
      let normalized: string | null = null
      if (VALID_CATEGORIES.has(lowered)) {
        normalized = lowered
      } else {
        const mapped = mapUsdaCategory(canonicalCategory)
        if (mapped) normalized = mapped
      }
      if (!normalized) {
        skippedInvalidCanonical++
        continue
      }
      candidates++

      const currentCategory = (data.category || '').toString().toLowerCase().trim()
      if (currentCategory === normalized) continue

      mismatches++
      console.log(
        `  ${doc.id.slice(0, 8)}…  ${(data.productName || '').slice(0, 35).padEnd(35)}  ${currentCategory.padEnd(11)} -> ${normalized}`
      )

      if (live) {
        try {
          await doc.ref.update({ category: normalized, updatedAt: new Date() })
          updated++
        } catch (e) {
          console.error(`    ! update failed for ${doc.id}: ${(e as Error).message}`)
        }
      }
    }

    lastDocId = snap.docs[snap.docs.length - 1].id
    if (snap.size < 500) break
  }

  console.log('\n[Resync] Complete')
  console.log(`  scanned:                ${scanned}`)
  console.log(`  skippedNoBarcode:       ${skippedNoBarcode} (manual entries, no UPC)`)
  console.log(`  skippedNoCanonical:     ${skippedNoCanonical} (UPC not in product_database)`)
  console.log(`  skippedInvalidCanonical:${skippedInvalidCanonical} (canonical isn't a known ProductCategory)`)
  console.log(`  candidates:             ${candidates}`)
  console.log(`  mismatches:             ${mismatches}`)
  console.log(`  updated:                ${updated} ${live ? '' : '(dry-run, nothing actually written)'}`)
  if (!live && mismatches > 0) {
    console.log(`\n  Re-run with --live to apply.`)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
