/**
 * Seed (and --clean) four-corner inventory items for the e2e attention test.
 *   npx tsx scripts/seed-attention-e2e.ts          # seed
 *   npx tsx scripts/seed-attention-e2e.ts --clean  # remove
 *
 * Items land in `shopping_items` under the E2E test user, inStock=true, all in
 * the pantry location, each with an explicit expiresAt (the inventory query
 * orderBy('expiresAt') excludes docs missing it).
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
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
const EMAIL = 'weightlossprojectionlab@gmail.com'
const DAY = 86_400_000
const IDS = ['e2e-attn-expired', 'e2e-attn-low', 'e2e-attn-spoiling', 'e2e-attn-plenty', 'e2e-attn-erratic']

;(async () => {
  const clean = process.argv.includes('--clean')
  if (clean) {
    for (const id of IDS) await db.collection('shopping_items').doc(id).delete()
    console.log('Cleaned', IDS.length, 'e2e attention items')
    process.exit(0)
  }

  const uid = (await getAuth().getUserByEmail(EMAIL)).uid
  const now = Date.now()
  const base = {
    userId: uid,
    inStock: true,
    needed: false,
    location: 'pantry',
    brand: '',
    imageUrl: '',
    isManual: false,
    priority: 'medium',
    purchaseHistory: [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }
  // Four corners — expected rank by compareAttention: expired, low, spoiling, plenty.
  const items = [
    { id: 'e2e-attn-expired',  productName: 'E2E Expired Yogurt',   category: 'dairy',   isPerishable: true,  quantity: 2,  expiresAt: Timestamp.fromMillis(now - 2 * DAY), expectedPriceCents: 350 }, // discard + priced waste ($3.50)
    { id: 'e2e-attn-low',      productName: 'E2E Low Coffee',       category: 'pantry',  isPerishable: false, quantity: 1,  expiresAt: Timestamp.fromMillis(now + 300 * DAY) }, // restock (cold-start low)
    { id: 'e2e-attn-spoiling', productName: 'E2E Spoiling Bananas', category: 'produce', isPerishable: true,  quantity: 4,  expiresAt: Timestamp.fromMillis(now + 1 * DAY) },   // use-soon
    { id: 'e2e-attn-plenty',   productName: 'E2E Plenty Rice',      category: 'pantry',  isPerishable: false, quantity: 10, expiresAt: Timestamp.fromMillis(now + 300 * DAY) }, // ok (no badge)
    // Erratic cadence (intervals 3d, 14d) → low-confidence on the Restocking Report.
    { id: 'e2e-attn-erratic',  productName: 'E2E Erratic Coffee',   category: 'pantry',  isPerishable: false, quantity: 5,  expiresAt: Timestamp.fromMillis(now + 300 * DAY),
      averageDaysBetweenPurchases: 8, lastPurchased: Timestamp.fromMillis(now),
      purchaseHistory: [
        { date: Timestamp.fromMillis(now - 17 * DAY) },
        { date: Timestamp.fromMillis(now - 14 * DAY) },
        { date: Timestamp.fromMillis(now) },
      ] },
  ]
  for (const { id, ...data } of items) {
    await db.collection('shopping_items').doc(id).set({ ...base, ...data })
  }
  console.log('Seeded', items.length, 'four-corner items for', EMAIL, '(uid', uid + ')')
  process.exit(0)
})()
