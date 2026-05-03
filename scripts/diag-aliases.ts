/**
 * Read-only diagnostic for the alias backfill on a single doc.
 *
 * Run: npx tsx scripts/diag-aliases.ts <docId>
 *
 * Output: the doc's `aliases` array (if any), or "no aliases yet".
 */
import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  const docId = process.argv[2]
  if (!docId) {
    console.error('Usage: npx tsx scripts/diag-aliases.ts <docId>')
    process.exit(1)
  }
  const { adminDb } = await import('../lib/firebase-admin')
  const snap = await adminDb.collection('product_database').doc(docId).get()
  if (!snap.exists) {
    console.log(`✗ doc ${docId} not found`)
    process.exit(0)
  }
  const data = snap.data()!
  console.log(`✓ doc ${docId} — productName="${data.productName}"`)
  if (Array.isArray(data.aliases) && data.aliases.length > 0) {
    console.log(`  aliases (${data.aliases.length}):`)
    for (const a of data.aliases) console.log(`    - ${a}`)
  } else {
    console.log('  no aliases yet (backfill not triggered or pending)')
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
