/**
 * One-shot: delete all order_receipts docs owned by a single user.
 *
 * Scope clarifier:
 *   - Matches on `userId == TARGET_USER_ID`
 *   - Deletes regardless of status (draft / applied / void)
 *   - Does NOT roll back the inventory writes that an `applied` receipt
 *     performed. Inventory rows touched by an applied receipt stay as-is;
 *     only the receipt audit doc is removed. (For this session's test
 *     scenario the receipts never reached `applied` — they're all
 *     drafts — so this matters in theory only.)
 *
 * Run:
 *   npx tsx scripts/delete-user-receipts.ts            # dry-run, prints count + first 5 docs
 *   npx tsx scripts/delete-user-receipts.ts --live     # actually deletes
 */

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

const TARGET_USER_ID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'

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

async function main() {
  console.log(`Mode: ${LIVE ? 'LIVE (will delete)' : 'DRY RUN'}`)
  console.log(`Target userId: ${TARGET_USER_ID}`)

  const snap = await db
    .collection('order_receipts')
    .where('userId', '==', TARGET_USER_ID)
    .get()

  console.log(`Matched docs: ${snap.size}`)
  if (snap.size === 0) {
    console.log('Nothing to delete.')
    return
  }

  const byStatus: Record<string, number> = {}
  for (const doc of snap.docs) {
    const status = (doc.data().status as string | undefined) ?? 'unknown'
    byStatus[status] = (byStatus[status] ?? 0) + 1
  }
  console.log('By status:', byStatus)

  console.log('\nFirst 5 docs:')
  for (const doc of snap.docs.slice(0, 5)) {
    const d = doc.data() as Record<string, unknown>
    console.log(`  ${doc.id} · receiptNumber=${d.receiptNumber} · status=${d.status} · store=${d.store} · createdAt=${d.createdAt}`)
  }

  if (!LIVE) {
    console.log('\n(dry run — pass --live to actually delete)')
    return
  }

  console.log('\nDeleting...')
  let deleted = 0
  let batch = db.batch()
  let pendingWrites = 0
  for (const doc of snap.docs) {
    batch.delete(doc.ref)
    pendingWrites++
    if (pendingWrites >= 400) {
      await batch.commit()
      deleted += pendingWrites
      console.log(`  committed ${deleted}/${snap.size}`)
      batch = db.batch()
      pendingWrites = 0
    }
  }
  if (pendingWrites > 0) {
    await batch.commit()
    deleted += pendingWrites
  }
  console.log(`Done. Deleted ${deleted} receipts.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
