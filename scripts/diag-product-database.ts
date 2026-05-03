/**
 * Read-only diagnostic for product_database wire-up.
 *
 * Checks:
 *   1. Total doc count in product_database
 *   2. Sample 10 random doc IDs to inspect format (length, leading zeros)
 *   3. Hit /api/products/lookup for 3 known UPCs and report cache-hit status
 *
 * Run: npm run diag:products
 */
import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const SAMPLE_BARCODES = [
  '016000275645', // Cheerios
  '012000001819', // Pepsi
  '013000004411', // Heinz Ketchup
  '078742433042', // Walmart Great Value sweetened condensed milk
  '044000060794', // Nabisco Oreo
]

async function main() {
  const { adminDb } = await import('../lib/firebase-admin')
  const collection = adminDb.collection('product_database')

  // ── 1. Count ────────────────────────────────────────────────────────────
  const countSnap = await collection.count().get()
  const total = countSnap.data().count
  console.log(`\n[1] Total docs in product_database: ${total.toLocaleString()}`)
  if (total < 100_000) {
    console.log('    ⚠️  Lower than expected for the 456k bulk import — something may have failed to persist.')
  } else {
    console.log('    ✓ Looks like the bulk import persisted as expected')
  }

  // ── 2. Sample doc IDs to inspect format ─────────────────────────────────
  console.log('\n[2] Sampling 10 doc IDs to inspect barcode format:')
  const sample = await collection.limit(10).get()
  const lengths: Record<number, number> = {}
  sample.docs.forEach((doc, i) => {
    const id = doc.id
    const data = doc.data()
    lengths[id.length] = (lengths[id.length] || 0) + 1
    console.log(`    [${i + 1}] ${id.padEnd(15)} (${id.length} chars) name="${(data.productName || '').slice(0, 40)}"`)
  })
  console.log('\n    Length distribution in sample:')
  for (const [len, n] of Object.entries(lengths)) {
    console.log(`      ${len} chars: ${n} docs`)
  }

  // ── 3. End-to-end check via direct doc lookup ───────────────────────────
  console.log('\n[3] Direct doc lookups for known UPCs (simulates what /api/products/lookup does):')
  for (const barcode of SAMPLE_BARCODES) {
    const t0 = Date.now()
    const doc = await collection.doc(barcode).get()
    const elapsed = Date.now() - t0
    if (doc.exists) {
      const d = doc.data()
      console.log(`    ✓ ${barcode}: HIT in ${elapsed}ms — name="${(d?.productName || '').slice(0, 50)}", source=${d?.quality?.dataSource}, hasImage=${!!d?.imageUrl}`)
    } else {
      console.log(`    ✗ ${barcode}: MISS in ${elapsed}ms`)
      // Try common variants
      const variants = [
        barcode.replace(/^0+/, ''), // strip leading zeros
        '0' + barcode,               // add leading zero
        barcode.padStart(13, '0'),   // pad to 13 digits
        barcode.padStart(14, '0'),   // pad to 14 digits
      ].filter(v => v !== barcode)
      for (const v of variants) {
        const vDoc = await collection.doc(v).get()
        if (vDoc.exists) {
          const vd = vDoc.data()
          console.log(`         ↳ FOUND under variant "${v}" — name="${(vd?.productName || '').slice(0, 50)}"`)
          console.log(`            ⚠️  This means scans of ${barcode} won't find this product as-is — needs normalization`)
          break
        }
      }
    }
  }

  console.log('\n[Done]')
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
