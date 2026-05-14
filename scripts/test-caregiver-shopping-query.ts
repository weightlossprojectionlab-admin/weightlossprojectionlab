/**
 * Test: does the caregiver's shopping_items query work against the
 * deployed Firestore rules?
 *
 * Mints a custom token for the caregiver, exchanges it for an ID token,
 * then runs the EXACT query useShopping does. If this succeeds, the
 * browser-side denial we keep seeing is stale-cache / stuck-listener,
 * not a rule bug. If it fails here too, the rule is genuinely wrong.
 */

import { initializeApp as initAdminApp, cert } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { initializeApp as initClientApp } from 'firebase/app'
import {
  getAuth as getClientAuth,
  signInWithCustomToken,
} from 'firebase/auth'
import {
  getFirestore as getClientFirestore,
  collection,
  query,
  where,
  orderBy as _orderBy,
  getDocs,
} from 'firebase/firestore'
const orderBy = _orderBy
import * as path from 'path'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Dev cert is self-signed.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

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

const CAREGIVER_UID = 'X0exvZzk4iPc5OV0lEOBQglWDoA3'
const OWNER_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'

async function main() {
  console.log('Test: caregiver shopping_items query against deployed rules')
  console.log('='.repeat(70))

  initAdminApp({ credential: cert(require(findServiceAccountPath())) })
  const customToken = await getAdminAuth().createCustomToken(CAREGIVER_UID)
  console.log('Got custom token for caregiver:', CAREGIVER_UID.slice(0, 16), '…')

  const clientApp = initClientApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
  const clientAuth = getClientAuth(clientApp)
  const cred = await signInWithCustomToken(clientAuth, customToken)
  console.log('Client signed in. uid:', cred.user.uid, ' email:', cred.user.email || '<none>')

  const db = getClientFirestore(clientApp)

  // Query 1: the EXACT shape useShopping runs.
  console.log(`\n[1] query: where('userId', '==', '${OWNER_UID.slice(0, 12)}…').orderBy('updatedAt', 'desc')`)
  try {
    const q = query(
      collection(db, 'shopping_items'),
      where('userId', '==', OWNER_UID),
      orderBy('updatedAt', 'desc'),
    )
    const snap = await getDocs(q)
    console.log(`    OK — ${snap.size} docs returned`)
  } catch (e: any) {
    console.log(`    FAILED — ${e?.code}: ${e?.message}`)
  }

  // Query 2: same query but no orderBy.
  console.log(`\n[2] query: where('userId', '==', '${OWNER_UID.slice(0, 12)}…')  (no orderBy)`)
  try {
    const q = query(collection(db, 'shopping_items'), where('userId', '==', OWNER_UID))
    const snap = await getDocs(q)
    console.log(`    OK — ${snap.size} docs returned`)
  } catch (e: any) {
    console.log(`    FAILED — ${e?.code}: ${e?.message}`)
  }

  // Query 3: filter by householdId instead.
  console.log(`\n[3] query: where('householdId', '==', '${OWNER_UID.slice(0, 12)}…')`)
  try {
    const q = query(collection(db, 'shopping_items'), where('householdId', '==', OWNER_UID))
    const snap = await getDocs(q)
    console.log(`    OK — ${snap.size} docs returned`)
  } catch (e: any) {
    console.log(`    FAILED — ${e?.code}: ${e?.message}`)
  }

  // Query 3b: same but with the orderBy useShopping uses — tests
  // whether the composite index (householdId, updatedAt desc) exists.
  console.log(`\n[3b] query: where('householdId', '==', '${OWNER_UID.slice(0, 12)}…').orderBy('updatedAt', 'desc')`)
  try {
    const q = query(
      collection(db, 'shopping_items'),
      where('householdId', '==', OWNER_UID),
      orderBy('updatedAt', 'desc'),
    )
    const snap = await getDocs(q)
    console.log(`    OK — ${snap.size} docs returned`)
  } catch (e: any) {
    console.log(`    FAILED — ${e?.code}: ${e?.message}`)
  }

  // Query 4: stores under the owner (should work after deploy + re-key).
  console.log(`\n[4] query: users/${OWNER_UID.slice(0, 12)}…/stores`)
  try {
    const snap = await getDocs(collection(db, 'users', OWNER_UID, 'stores'))
    console.log(`    OK — ${snap.size} docs returned`)
  } catch (e: any) {
    console.log(`    FAILED — ${e?.code}: ${e?.message}`)
  }

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
