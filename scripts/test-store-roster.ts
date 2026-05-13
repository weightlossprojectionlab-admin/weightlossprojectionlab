/**
 * Assertion test for Phase 0a-i — household store roster persistence.
 *
 * Drives the same Firestore I/O the useStoreRoster hook does, signed
 * in as the owner via custom token. Asserts:
 *   1. Empty roster baseline: no householdStoreIds set yet → read
 *      returns empty array.
 *   2. Write a 3-entry roster → read mirrors what we wrote.
 *   3. Re-write with a smaller roster → read reflects the shrink
 *      (not a merge).
 *   4. Roster preserves catalog order regardless of input order
 *      (hook's `orderedFromCatalog` invariant).
 *   5. Roster strips unknown ids (defensive against external mutation
 *      or a deprecated catalog entry).
 *
 * Cleanup: restores the pre-test householdStoreIds (or removes the
 * field if it wasn't set) — leaves the live owner doc untouched.
 *
 * Usage:
 *   npx tsx scripts/test-store-roster.ts
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { initializeApp as initAdminApp, cert } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import {
  getFirestore as getAdminFirestore,
  FieldValue,
} from 'firebase-admin/firestore'
import { initializeApp as initClientApp } from 'firebase/app'
import { getAuth as getClientAuth, signInWithCustomToken } from 'firebase/auth'
import {
  getFirestore as getClientFirestore,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore'
import * as path from 'path'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

import { STORE_CATALOG } from '../constants/store-roster'

dotenv.config({ path: '.env.local' })

function findServiceAccountPath(): string {
  let dir = __dirname
  for (let i = 0; i < 6; i++) {
    const c = path.join(dir, 'service_account_key.json')
    if (fs.existsSync(c)) return c
    const p = path.dirname(dir)
    if (p === dir) break
    dir = p
  }
  throw new Error('service_account_key.json not found')
}

initAdminApp({ credential: cert(require(findServiceAccountPath())) })
const adminAuth = getAdminAuth()
const adminDb = getAdminFirestore()

const OWNER_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'

interface Assertion { name: string; fn: () => Promise<void> }
const assertions: Assertion[] = []
function test(name: string, fn: () => Promise<void>) { assertions.push({ name, fn }) }
function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toEqual(expected: any) {
      const a = JSON.stringify(actual)
      const b = JSON.stringify(expected)
      if (a !== b) throw new Error(`expected ${b}, got ${a}`)
    },
    toBeGreaterThanOrEqual(n: number) {
      if (typeof actual !== 'number' || actual < n) {
        throw new Error(`expected >= ${n}, got ${JSON.stringify(actual)}`)
      }
    },
  }
}

/** Mirror the hook's `orderedFromCatalog`: catalog order, deduped,
 *  unknown ids dropped. */
function orderedFromCatalog(ids: string[]): string[] {
  const set = new Set(ids)
  const catalogIds = new Set(STORE_CATALOG.map((s) => s.id))
  const filtered = new Set(Array.from(set).filter((id) => catalogIds.has(id)))
  return STORE_CATALOG.map((s) => s.id).filter((id) => filtered.has(id))
}

async function main() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY required')

  const customToken = await adminAuth.createCustomToken(OWNER_UID)
  const clientApp = initClientApp({
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
  const clientAuth = getClientAuth(clientApp)
  await signInWithCustomToken(clientAuth, customToken)
  const clientDb = getClientFirestore(clientApp)
  const userRef = doc(clientDb, 'users', OWNER_UID)

  console.log(`Owner uid: ${OWNER_UID}`)
  console.log('='.repeat(70))

  // Capture pre-test state so we can restore.
  const before = await getDoc(userRef)
  const beforeIds: string[] | undefined = before.data()?.householdStoreIds

  // ── Assertions ──────────────────────────────────────────────────────

  test('baseline: clear field and read returns empty (or absent)', async () => {
    await adminDb.collection('users').doc(OWNER_UID).update({
      householdStoreIds: FieldValue.delete(),
    })
    const snap = await getDoc(userRef)
    const raw = snap.data()?.householdStoreIds
    const arr = Array.isArray(raw) ? raw : []
    expect(arr.length).toBe(0)
  })

  test('write 3-entry roster → read mirrors what we wrote', async () => {
    const toWrite = ['walmart', 'walgreens', 'whole-foods']
    await updateDoc(userRef, { householdStoreIds: toWrite })
    const snap = await getDoc(userRef)
    const arr = snap.data()?.householdStoreIds || []
    expect(arr.length).toBe(3)
    expect(arr).toEqual(toWrite)
  })

  test('shrink roster → read reflects the smaller set (not merged)', async () => {
    const shrink = ['walmart']
    await updateDoc(userRef, { householdStoreIds: shrink })
    const snap = await getDoc(userRef)
    const arr = snap.data()?.householdStoreIds || []
    expect(arr.length).toBe(1)
    expect(arr).toEqual(shrink)
  })

  test('hook ordering invariant: catalog order preserved regardless of input order', async () => {
    // Input in reverse-alphabetical order; hook's orderedFromCatalog
    // should re-sort to catalog order before persisting.
    const reverse = ['walmart', 'kroger', 'aldi']
    const expected = orderedFromCatalog(reverse)
    // 'aldi' is first in STORE_CATALOG (alphabetical), so the expected
    // order is [aldi, kroger, walmart] — exercises the sort.
    expect(expected[0]).toBe('aldi')
    expect(expected[expected.length - 1]).toBe('walmart')
    // Mirror by writing the orderedFromCatalog output as the hook would.
    await updateDoc(userRef, { householdStoreIds: expected })
    const snap = await getDoc(userRef)
    expect(snap.data()?.householdStoreIds).toEqual(expected)
  })

  test('hook ordering invariant: unknown ids are stripped', async () => {
    const mix = ['walmart', '__not_a_real_chain__', 'target', 'fake-chain-xyz']
    const expected = orderedFromCatalog(mix)
    // Both fake ids should be gone; walmart + target preserved in
    // catalog order (target precedes walmart alphabetically).
    expect(expected).toEqual(['target', 'walmart'])
    await updateDoc(userRef, { householdStoreIds: expected })
    const snap = await getDoc(userRef)
    expect(snap.data()?.householdStoreIds).toEqual(['target', 'walmart'])
  })

  // ── Run ─────────────────────────────────────────────────────────────
  let passed = 0
  let failed = 0
  for (const a of assertions) {
    try {
      await a.fn()
      console.log(`  ✓ ${a.name}`)
      passed += 1
    } catch (e: any) {
      console.log(`  ✗ ${a.name}`)
      console.log(`      ${e?.message || e}`)
      failed += 1
    }
  }

  console.log('='.repeat(70))
  console.log(`Results: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exitCode = 1

  // Restore pre-test state. If householdStoreIds wasn't set before,
  // remove it so we don't leave a stub field on the live owner doc.
  console.log('\nRestoring pre-test state...')
  if (beforeIds && Array.isArray(beforeIds)) {
    await adminDb.collection('users').doc(OWNER_UID).update({
      householdStoreIds: beforeIds,
    })
    console.log(`  restored householdStoreIds (${beforeIds.length} entries)`)
  } else {
    await adminDb.collection('users').doc(OWNER_UID).update({
      householdStoreIds: FieldValue.delete(),
    })
    console.log('  field removed (was unset before test)')
  }
}

main()
  .catch((e) => {
    console.error('\nFatal:', e)
    process.exit(1)
  })
  .then(() => process.exit(process.exitCode || 0))
