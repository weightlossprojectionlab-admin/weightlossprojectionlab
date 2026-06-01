/**
 * Smoke-check the allergen keystone (commit 97d5204): after scanning a product
 * in the live UI, confirm product_database/{barcode}.allergenTags was written
 * with lowercase canonical tokens.
 *
 *   npx tsx scripts/check-catalog-allergens.ts 3017620422003
 *
 * Read-only. Prints the catalog doc's name + allergenTags, and flags whether the
 * field is present (populated by a scan) vs absent (legacy doc, not yet scanned
 * since the keystone shipped).
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

function findServiceAccountPath(): string {
  let dir = __dirname
  for (let i = 0; i < 6; i++) {
    const c = path.join(dir, 'service_account_key.json')
    if (fs.existsSync(c)) return c
    dir = path.dirname(dir)
  }
  throw new Error('service_account_key.json not found')
}

initializeApp({ credential: cert(require(findServiceAccountPath())) })
const db = getFirestore()

;(async () => {
  const barcode = process.argv[2]
  if (!barcode) {
    console.error('Usage: npx tsx scripts/check-catalog-allergens.ts <barcode>')
    process.exit(1)
  }

  const snap = await db.collection('product_database').doc(barcode).get()
  if (!snap.exists) {
    console.log(`✗ product_database/${barcode} does not exist — was the scan saved?`)
    process.exit(0)
  }

  const d = snap.data() as { productName?: string; allergenTags?: string[] }
  console.log(`product_database/${barcode}`)
  console.log(`  name:         ${d.productName ?? '(none)'}`)
  if (d.allergenTags === undefined) {
    console.log('  allergenTags: ABSENT — legacy doc, not re-scanned since the keystone')
  } else if (d.allergenTags.length === 0) {
    console.log('  allergenTags: [] — parsed at scan, none declared by OFF')
  } else {
    console.log(`  allergenTags: [${d.allergenTags.join(', ')}]  ✓ populated`)
  }
  process.exit(0)
})()
