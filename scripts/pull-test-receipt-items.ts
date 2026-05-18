/**
 * One-shot: pull a handful of real product_database entries so the
 * synthetic test receipts (public/sprouts-receipt-*.html) use UPCs that
 * actually exist in the 456k-product catalog. Without this, Phase 0i
 * per-line UPC lookup silently no-ops on every line because the UPCs
 * I made up aren't in Firestore.
 *
 * Run: npx tsx scripts/pull-test-receipt-items.ts
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

interface ProductDoc {
  productName?: string
  brand?: string
  category?: string
}

// Known-good barcodes from scripts/diag-product-database.ts — we know
// at least these exist (or did at last diag run).
const KNOWN_BARCODES = [
  '016000275645', // Cheerios
  '012000001819', // Pepsi
  '013000004411', // Heinz Ketchup
  '078742433042', // GV sweetened condensed milk
  '044000060794', // Oreo
]

async function main() {
  const { adminDb } = await import('../lib/firebase-admin')
  const col = adminDb.collection('product_database')

  console.log('\n=== Confirming known barcodes ===')
  for (const upc of KNOWN_BARCODES) {
    const doc = await col.doc(upc).get()
    if (doc.exists) {
      const d = doc.data() as ProductDoc
      console.log(`  ✓ ${upc}  ${(d.productName || '').slice(0, 60)}`)
    } else {
      console.log(`  ✗ ${upc}  NOT FOUND`)
    }
  }

  console.log('\n=== Sampling a few products by category-relevant keywords ===')
  // Try common grocery items — these may or may not match depending
  // on how the DB indexes productName. We're just looking for stuff
  // that *would* fit on a Sprouts-style receipt.
  const wantedKeywords = ['milk', 'eggs', 'bread', 'banana', 'apple', 'avocado', 'chicken', 'yogurt', 'chocolate']

  for (const kw of wantedKeywords) {
    // Firestore can't do contains-substring; closest is name-prefix.
    // We approximate by trying capitalized + uppercase variants.
    const variants = [
      kw[0].toUpperCase() + kw.slice(1),
      kw.toUpperCase(),
      kw,
    ]
    let found: { upc: string; name: string } | null = null
    for (const v of variants) {
      if (found) break
      const snap = await col
        .where('productName', '>=', v)
        .where('productName', '<', v + '')
        .limit(1)
        .get()
      if (!snap.empty) {
        const doc = snap.docs[0]
        const data = doc.data() as ProductDoc
        found = { upc: doc.id, name: data.productName || '' }
      }
    }
    if (found) {
      console.log(`  [${kw.padEnd(10)}] ${found.upc}  ${found.name.slice(0, 60)}`)
    } else {
      console.log(`  [${kw.padEnd(10)}] no name-prefix match`)
    }
  }

  // Also dump 10 totally random entries so we see what's actually in there
  console.log('\n=== 10 random entries (whatever the DB returns first) ===')
  const random = await col.limit(10).get()
  random.docs.forEach((d, i) => {
    const data = d.data() as ProductDoc
    console.log(`  [${i + 1}] ${d.id}  ${(data.productName || '').slice(0, 60)}  brand="${data.brand || '-'}"`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
