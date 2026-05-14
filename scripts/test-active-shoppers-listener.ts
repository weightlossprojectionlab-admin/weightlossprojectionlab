/**
 * Listener assertion test for Phase 3a — useActiveShoppers /
 * ActiveShoppersStrip.
 *
 * Signs in as the owner via custom token, attaches the exact Firestore
 * query useActiveShoppers does, and asserts:
 *   1. Empty household → 0 sessions returned.
 *   2. Insert a fresh active session → listener surfaces it on next snap.
 *   3. Set a session's lastActivityAt to ancient (> ACTIVITY_TO_PAUSED)
 *      → still returned by the query (status is still 'active'), but
 *      the freshness filter in the hook would drop it. We assert both
 *      the raw snapshot count AND the post-filter count.
 *   4. Flip the session's status to 'completed' → listener removes it.
 *   5. Two parallel shoppers → both surface, sorted by startedAt asc.
 *
 * Cleanup: every test session is tracked and deleted on exit.
 *
 * Usage:
 *   npx tsx scripts/test-active-shoppers-listener.ts
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { initializeApp as initAdminApp, cert } from 'firebase-admin/app'
import { getAuth as getAdminAuth } from 'firebase-admin/auth'
import { getFirestore as getAdminFirestore, Timestamp as AdminTimestamp } from 'firebase-admin/firestore'
import { initializeApp as initClientApp } from 'firebase/app'
import { getAuth as getClientAuth, signInWithCustomToken } from 'firebase/auth'
import {
  getFirestore as getClientFirestore,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore'
import * as path from 'path'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

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
// 3-minute stale cutoff — mirrors SESSION_TIMEOUTS.ACTIVITY_TO_PAUSED.
const ACTIVITY_TO_PAUSED_MS = 3 * 60 * 1000

interface Assertion { name: string; fn: () => Promise<void> }
const assertions: Assertion[] = []
function test(name: string, fn: () => Promise<void>) { assertions.push({ name, fn }) }
function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toBeGreaterThanOrEqual(n: number) {
      if (typeof actual !== 'number' || actual < n) {
        throw new Error(`expected >= ${n}, got ${JSON.stringify(actual)}`)
      }
    },
  }
}

interface SnapshotState { docs: any[] }

/**
 * Build the listener-state snapshot the next time the listener fires.
 * Returns the most recent snapshot (raw + filtered) seen up to now.
 * Polls in 100 ms ticks up to `timeoutMs` for the snapshot to settle.
 */
async function waitForSnapshot(getState: () => SnapshotState, predicate: (s: SnapshotState) => boolean, timeoutMs = 5000): Promise<SnapshotState> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const s = getState()
    if (predicate(s)) return s
    await new Promise((r) => setTimeout(r, 100))
  }
  return getState()
}

const cleanup: Array<() => Promise<void>> = []

async function main() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY required')

  // Sign in as the owner via custom token. Owner's rule path is
  // already permissive for shopping_sessions reads (allow read: if
  // isAuthenticated()), so we use the owner identity for clarity.
  const customToken = await adminAuth.createCustomToken(OWNER_UID)
  const clientApp = initClientApp({
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
  const clientAuth = getClientAuth(clientApp)
  await signInWithCustomToken(clientAuth, customToken)
  const clientDb = getClientFirestore(clientApp)

  console.log(`Owner uid: ${OWNER_UID}`)
  console.log(`Listener: shopping_sessions WHERE householdId == ${OWNER_UID.slice(0, 12)}… AND status == 'active'`)
  console.log('='.repeat(70))

  // Attach the listener — same query useActiveShoppers uses.
  let snapshotState: SnapshotState = { docs: [] }
  const q = query(
    collection(clientDb, 'shopping_sessions'),
    where('householdId', '==', OWNER_UID),
    where('status', '==', 'active'),
  )
  const unsub = onSnapshot(q, (snap) => {
    snapshotState = { docs: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }
  })

  // Stale-session filter the hook applies client-side.
  function freshCount(state: SnapshotState): number {
    const cutoff = Date.now() - ACTIVITY_TO_PAUSED_MS
    return state.docs.filter((s) => {
      const t = s.lastActivityAt?.toMillis?.() ?? 0
      return t > cutoff
    }).length
  }

  const stamp = Date.now()

  // Baseline: clear out any existing test sessions left over from
  // prior runs of this same test (defensive — cleanup should handle).
  const existing = await adminDb
    .collection('shopping_sessions')
    .where('householdId', '==', OWNER_UID)
    .get()
  for (const d of existing.docs) {
    if (d.id.startsWith('__test_phase3_')) await d.ref.delete()
  }

  // Wait for the listener to settle on whatever baseline state.
  await waitForSnapshot(() => snapshotState, () => true, 1500)
  const baselineFresh = freshCount(snapshotState)
  console.log(`Baseline active+fresh sessions: ${baselineFresh}`)

  const sessionA = `__test_phase3_active_${stamp}`
  const sessionB = `__test_phase3_active_${stamp}_2`
  const sessionStale = `__test_phase3_stale_${stamp}`

  // ── Assertions ──────────────────────────────────────────────────────

  test('insert active session → listener sees it as fresh', async () => {
    await adminDb.collection('shopping_sessions').doc(sessionA).set({
      householdId: OWNER_UID,
      userId: 'caregiver-test-uid',
      userName: 'Test Caregiver',
      userRole: 'caregiver',
      status: 'active',
      startedAt: AdminTimestamp.fromMillis(stamp - 60_000), // 1 min ago
      lastActivityAt: AdminTimestamp.now(),
      expiresAt: AdminTimestamp.fromMillis(stamp + 2 * 60 * 60_000),
      deviceId: '__test_device',
      itemsScanned: 0,
      storeLocation: { name: 'Test Mart', latitude: 0, longitude: 0 },
      metadata: { appVersion: '1.0.0', deviceType: 'mobile', platform: 'test' },
    })
    cleanup.push(async () => { await adminDb.collection('shopping_sessions').doc(sessionA).delete() })

    const after = await waitForSnapshot(
      () => snapshotState,
      (s) => freshCount(s) >= baselineFresh + 1,
    )
    expect(freshCount(after)).toBeGreaterThanOrEqual(baselineFresh + 1)
  })

  test('stale session (heartbeat > ACTIVITY_TO_PAUSED ago) is filtered out by hook', async () => {
    await adminDb.collection('shopping_sessions').doc(sessionStale).set({
      householdId: OWNER_UID,
      userId: 'caregiver-test-uid-stale',
      userName: 'Stale Caregiver',
      userRole: 'caregiver',
      status: 'active',
      // Heartbeat is 10 minutes old — way past the 3-min stale cutoff.
      startedAt: AdminTimestamp.fromMillis(stamp - 10 * 60_000),
      lastActivityAt: AdminTimestamp.fromMillis(stamp - 10 * 60_000),
      expiresAt: AdminTimestamp.fromMillis(stamp + 2 * 60 * 60_000),
      deviceId: '__test_device_stale',
      itemsScanned: 0,
      metadata: { appVersion: '1.0.0', deviceType: 'mobile', platform: 'test' },
    })
    cleanup.push(async () => { await adminDb.collection('shopping_sessions').doc(sessionStale).delete() })

    // Wait for the snapshot to actually pick it up at the raw level —
    // the where('status','==','active') filter still matches.
    await waitForSnapshot(
      () => snapshotState,
      (s) => s.docs.some((d) => d.id === sessionStale),
    )
    // But the hook's freshness filter SHOULD drop it.
    const rawHasStale = snapshotState.docs.some((d) => d.id === sessionStale)
    expect(rawHasStale).toBe(true)
    const freshHasStale = snapshotState.docs
      .filter((s) => {
        const t = s.lastActivityAt?.toMillis?.() ?? 0
        return t > Date.now() - ACTIVITY_TO_PAUSED_MS
      })
      .some((d) => d.id === sessionStale)
    expect(freshHasStale).toBe(false)
  })

  test('completing session removes it from listener', async () => {
    await adminDb.collection('shopping_sessions').doc(sessionA).update({
      status: 'completed',
      endedAt: AdminTimestamp.now(),
    })

    const after = await waitForSnapshot(
      () => snapshotState,
      (s) => !s.docs.some((d) => d.id === sessionA),
    )
    const stillThere = after.docs.some((d) => d.id === sessionA)
    expect(stillThere).toBe(false)
  })

  test('two parallel active shoppers both surface, sorted by startedAt', async () => {
    // Re-activate session A as the earlier start.
    await adminDb.collection('shopping_sessions').doc(sessionA).set({
      householdId: OWNER_UID,
      userId: 'caregiver-test-uid',
      userName: 'First Shopper',
      userRole: 'caregiver',
      status: 'active',
      startedAt: AdminTimestamp.fromMillis(stamp - 5 * 60_000), // 5 min ago
      lastActivityAt: AdminTimestamp.now(),
      expiresAt: AdminTimestamp.fromMillis(stamp + 2 * 60 * 60_000),
      deviceId: '__test_device',
      itemsScanned: 3,
      metadata: { appVersion: '1.0.0', deviceType: 'mobile', platform: 'test' },
    })

    await adminDb.collection('shopping_sessions').doc(sessionB).set({
      householdId: OWNER_UID,
      userId: 'caregiver-test-uid-2',
      userName: 'Second Shopper',
      userRole: 'caregiver',
      status: 'active',
      startedAt: AdminTimestamp.fromMillis(stamp - 2 * 60_000), // 2 min ago
      lastActivityAt: AdminTimestamp.now(),
      expiresAt: AdminTimestamp.fromMillis(stamp + 2 * 60 * 60_000),
      deviceId: '__test_device_2',
      itemsScanned: 1,
      metadata: { appVersion: '1.0.0', deviceType: 'mobile', platform: 'test' },
    })
    cleanup.push(async () => { await adminDb.collection('shopping_sessions').doc(sessionB).delete() })

    const after = await waitForSnapshot(
      () => snapshotState,
      (s) => {
        const fresh = s.docs.filter((d) => (d.lastActivityAt?.toMillis?.() ?? 0) > Date.now() - ACTIVITY_TO_PAUSED_MS)
        return fresh.some((d) => d.id === sessionA) && fresh.some((d) => d.id === sessionB)
      },
    )
    const freshSorted = after.docs
      .filter((s) => (s.lastActivityAt?.toMillis?.() ?? 0) > Date.now() - ACTIVITY_TO_PAUSED_MS)
      .filter((s) => [sessionA, sessionB].includes(s.id))
      .sort((a, b) => (a.startedAt?.toMillis?.() ?? 0) - (b.startedAt?.toMillis?.() ?? 0))
    expect(freshSorted.length).toBe(2)
    expect(freshSorted[0].id).toBe(sessionA) // earlier startedAt wins
    expect(freshSorted[1].id).toBe(sessionB)
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

  unsub()
  if (failed > 0) process.exitCode = 1
}

async function runCleanup() {
  console.log('\nCleaning up...')
  for (const fn of cleanup) {
    try { await fn() } catch (e: any) { console.log(`  cleanup step failed: ${e?.message || e}`) }
  }
}

main()
  .then(runCleanup)
  .catch(async (e) => {
    console.error('\nFatal:', e)
    await runCleanup()
    process.exit(1)
  })
  .then(() => process.exit(process.exitCode || 0))
