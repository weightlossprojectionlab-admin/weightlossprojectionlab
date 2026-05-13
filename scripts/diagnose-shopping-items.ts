/**
 * Diagnose: what does a shopping_items doc actually look like for the
 * Weight Loss Project owner? The Firestore rule branch I added is:
 *   isHouseholdMember(resource.data.userId)
 * which only fires when `userId` field points at the owner uid. If items
 * are written with a different userId (e.g., a household doc id), the
 * caregiver still gets denied.
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

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

initializeApp({ credential: cert(require(findServiceAccountPath())) })
const db = getFirestore()

const OWNER_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'
const CAREGIVER_UID = 'X0exvZzk4iPc5OV0lEOBQglWDoA3'

async function main() {
  console.log(`Inspecting shopping_items for owner ${OWNER_UID}`)
  console.log('='.repeat(70))

  // Query 1: items with userId == owner uid
  const byOwnerUid = await db
    .collection('shopping_items')
    .where('userId', '==', OWNER_UID)
    .get()
  console.log(`\nshopping_items WHERE userId == ${OWNER_UID.slice(0, 12)}…:`)
  console.log(`  count: ${byOwnerUid.size}`)
  if (byOwnerUid.size > 0) {
    const sample = byOwnerUid.docs[0].data()
    console.log('  sample doc fields:', Object.keys(sample).join(', '))
    console.log('  userId:', sample.userId)
    console.log('  householdId:', sample.householdId ?? '<unset>')
    console.log('  productName:', sample.productName ?? '<unset>')
    console.log('  needed:', sample.needed ?? '<unset>')
    console.log('  inStock:', sample.inStock ?? '<unset>')
  }

  // Query 2: items with householdId == owner uid
  const byHouseholdId = await db
    .collection('shopping_items')
    .where('householdId', '==', OWNER_UID)
    .get()
  console.log(`\nshopping_items WHERE householdId == ${OWNER_UID.slice(0, 12)}…:`)
  console.log(`  count: ${byHouseholdId.size}`)

  // Query 3: items where userId == caregiver
  const byCaregiverUid = await db
    .collection('shopping_items')
    .where('userId', '==', CAREGIVER_UID)
    .get()
  console.log(`\nshopping_items WHERE userId == caregiver (${CAREGIVER_UID.slice(0, 12)}…):`)
  console.log(`  count: ${byCaregiverUid.size}`)

  // Query 4: items where addedBy or requestedBy contains caregiver
  console.log('\nDistinct userId values across ALL shopping_items:')
  const all = await db.collection('shopping_items').get()
  const userIds = new Set<string>()
  for (const d of all.docs) {
    const u = d.data().userId
    if (u) userIds.add(u)
  }
  console.log(`  total items: ${all.size}`)
  console.log(`  distinct userId values: ${userIds.size}`)
  for (const u of Array.from(userIds).slice(0, 20)) {
    const count = all.docs.filter((d) => d.data().userId === u).length
    console.log(`    ${u}  → ${count} items`)
  }

  // Verify the familyMembers doc the rule needs
  console.log(`\nVerifying rule path: /users/${OWNER_UID}/familyMembers/${CAREGIVER_UID}`)
  const fmRef = db
    .collection('users')
    .doc(OWNER_UID)
    .collection('familyMembers')
    .doc(CAREGIVER_UID)
  const fm = await fmRef.get()
  console.log(`  exists: ${fm.exists}`)
  if (fm.exists) {
    const d = fm.data() || {}
    console.log('  status:', d.status ?? '<unset>')
    console.log('  userId field:', d.userId ?? '<unset>')
    console.log('  permissions keys:', Object.keys(d.permissions || {}).join(', '))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
