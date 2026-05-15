/**
 * Backfill: default receipt line quantity to 1 where missing.
 *
 * Mirror of the saveOrderReceipt-time default added in 0b0c605, applied
 * to receipts that were ingested BEFORE that commit. Any
 * order_receipts.items[i].quantity that's null / undefined / <= 0 is
 * rewritten to 1. The rawName stays as-is (carries the weight / "3 @
 * 0.79" text for receipts that did print quantities differently).
 *
 * Run:
 *   npx tsx scripts/backfill-receipt-line-quantity.ts            # dry-run
 *   npx tsx scripts/backfill-receipt-line-quantity.ts --live     # write
 *
 * Idempotent. Running twice is a no-op (the second pass finds zero
 * lines needing the default since the first pass set them all to 1).
 */

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

function findServiceAccountPath(): string {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const c = path.join(dir, 'service_account_key.json')
    if (fs.existsSync(c)) return c
    const p = path.dirname(dir)
    if (p === dir) break
    dir = p
  }
  throw new Error('service_account_key.json not found')
}

if (getApps().length === 0) {
  initializeApp({ credential: cert(require(findServiceAccountPath())) })
}
const db = getFirestore(getApp())

const LIVE = process.argv.includes('--live')

interface ReceiptLine {
  lineId?: string
  quantity?: number | null
  [k: string]: unknown
}

async function main() {
  console.log(`Mode: ${LIVE ? 'LIVE (will write)' : 'DRY RUN'}`)
  const snap = await db.collection('order_receipts').get()
  console.log(`Total receipts in collection: ${snap.size}`)

  let receiptsTouched = 0
  let receiptsSkipped = 0
  let linesFixed = 0
  let batch = db.batch()
  let pendingWrites = 0

  for (const doc of snap.docs) {
    const data = doc.data() || {}
    const items = Array.isArray(data.items) ? (data.items as ReceiptLine[]) : []
    if (items.length === 0) {
      receiptsSkipped++
      continue
    }

    let touched = false
    const next = items.map((line) => {
      const q = line.quantity
      const needsDefault = q == null || (typeof q === 'number' && q <= 0)
      if (!needsDefault) return line
      touched = true
      linesFixed++
      return { ...line, quantity: 1 }
    })

    if (!touched) {
      receiptsSkipped++
      continue
    }

    receiptsTouched++
    console.log(
      `  Receipt ${doc.id}: ${items.filter((l) => l.quantity == null || (typeof l.quantity === 'number' && l.quantity <= 0)).length} of ${items.length} lines need defaulting`,
    )

    if (LIVE) {
      batch.update(doc.ref, { items: next })
      pendingWrites++
      // Firestore batch limit is 500; flush periodically.
      if (pendingWrites >= 400) {
        await batch.commit()
        batch = db.batch()
        pendingWrites = 0
      }
    }
  }

  if (LIVE && pendingWrites > 0) {
    await batch.commit()
  }

  console.log('\n--- Summary ---')
  console.log(`Receipts touched: ${receiptsTouched}`)
  console.log(`Receipts skipped (already correct or empty): ${receiptsSkipped}`)
  console.log(`Lines defaulted to qty=1: ${linesFixed}`)
  if (!LIVE && receiptsTouched > 0) {
    console.log('\nDry-run only. Re-run with --live to apply.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FATAL:', err)
    process.exit(1)
  })
