/**
 * Integration assertion for scan-event capture on shopping_sessions.
 *
 * Verifies the data SHAPE of the bridge:
 *   - scanSequence accumulates entries across appends (preserves order
 *     for the ML aisle-order learner)
 *   - per-event fields land: itemId, scannedAt, category (when set)
 *   - itemsScanned counter still increments per call (legacy count
 *     still works)
 *
 * Exercises Firestore arrayUnion mechanic directly via admin SDK
 * (same operation shoppingSessionManager.incrementItemsScanned wraps
 * with the client SDK). Doesn't sign in as a user — the data shape is
 * what matters; auth + rules are tested elsewhere
 * (test-caregiver-shopping-query / test-shopping-bell-fanout).
 *
 * Cleanup: every seeded session deleted in finally.
 *
 * Usage:
 *   npx tsx scripts/test-scan-event-capture.ts
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { initializeApp, cert } from 'firebase-admin/app'
import {
  getFirestore,
  Timestamp,
  FieldValue,
} from 'firebase-admin/firestore'
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

initializeApp({ credential: cert(require(findServiceAccountPath())) })
const db = getFirestore()

const OWNER_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'
const CAREGIVER_UID = 'X0exvZzk4iPc5OV0lEOBQglWDoA3'

interface Assertion { name: string; fn: () => Promise<void> }
const assertions: Assertion[] = []
function test(name: string, fn: () => Promise<void>) { assertions.push({ name, fn }) }
function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toBeGreaterThanOrEqual(n: number) {
      if (typeof actual !== 'number' || actual < n) throw new Error(`expected >= ${n}, got ${JSON.stringify(actual)}`)
    },
    toEqual(expected: any) {
      const a = JSON.stringify(actual)
      const b = JSON.stringify(expected)
      if (a !== b) throw new Error(`expected ${b}, got ${a}`)
    },
  }
}

const cleanup: Array<() => Promise<void>> = []

async function seedSession(): Promise<string> {
  const stamp = Date.now()
  const sessionId = `__test_scan_capture_${stamp}`
  await db.collection('shopping_sessions').doc(sessionId).set({
    householdId: OWNER_UID,
    userId: CAREGIVER_UID,
    userName: 'Test Caregiver',
    userRole: 'caregiver',
    status: 'active',
    startedAt: Timestamp.now(),
    lastActivityAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(stamp + 2 * 60 * 60_000),
    deviceId: '__test_device',
    itemsScanned: 0,
    metadata: { appVersion: '1.0.0', deviceType: 'mobile', platform: 'test' },
  })
  cleanup.push(async () => {
    await db.collection('shopping_sessions').doc(sessionId).delete()
  })
  return sessionId
}

/**
 * Mirror of shoppingSessionManager.incrementItemsScanned via admin SDK.
 * Exercises the same arrayUnion + increment mechanic the client wraps.
 */
async function recordScan(
  sessionId: string,
  itemContext?: { itemId: string; category?: string },
): Promise<void> {
  const updates: Record<string, unknown> = {
    itemsScanned: FieldValue.increment(1),
    lastActivityAt: Timestamp.now(),
  }
  if (itemContext?.itemId) {
    const event: Record<string, unknown> = {
      itemId: itemContext.itemId,
      scannedAt: Timestamp.now(),
    }
    if (itemContext.category) event.category = itemContext.category
    updates.scanSequence = FieldValue.arrayUnion(event)
  }
  await db.collection('shopping_sessions').doc(sessionId).update(updates)
}

async function main() {
  console.log('Scan-event capture — bridge integration tests')
  console.log('='.repeat(70))

  test('legacy count-only path: incrementItemsScanned without context still increments counter', async () => {
    const sessionId = await seedSession()
    await recordScan(sessionId) // no itemContext
    await recordScan(sessionId)
    const snap = await db.collection('shopping_sessions').doc(sessionId).get()
    const data = snap.data() || {}
    expect(data.itemsScanned).toBe(2)
    // scanSequence should NOT exist (legacy callers don't populate it)
    expect(Array.isArray(data.scanSequence)).toBe(false)
  })

  test('with item context: scanSequence accumulates entries in order', async () => {
    const sessionId = await seedSession()
    await recordScan(sessionId, { itemId: 'item-A', category: 'produce' })
    // Small delay so timestamps differ (forces distinct deep-equal objects)
    await new Promise((r) => setTimeout(r, 20))
    await recordScan(sessionId, { itemId: 'item-B', category: 'frozen' })
    await new Promise((r) => setTimeout(r, 20))
    await recordScan(sessionId, { itemId: 'item-C', category: 'dairy' })

    const snap = await db.collection('shopping_sessions').doc(sessionId).get()
    const data = snap.data() || {}
    expect(Array.isArray(data.scanSequence)).toBe(true)
    expect(data.scanSequence.length).toBe(3)
    expect(data.scanSequence[0].itemId).toBe('item-A')
    expect(data.scanSequence[1].itemId).toBe('item-B')
    expect(data.scanSequence[2].itemId).toBe('item-C')
    expect(data.itemsScanned).toBe(3)
  })

  test('category copied at scan time — survives the round trip', async () => {
    const sessionId = await seedSession()
    await recordScan(sessionId, { itemId: 'cat-A', category: 'produce' })
    await new Promise((r) => setTimeout(r, 20))
    await recordScan(sessionId, { itemId: 'cat-B', category: 'frozen' })
    const snap = await db.collection('shopping_sessions').doc(sessionId).get()
    const data = snap.data() || {}
    expect(data.scanSequence[0].category).toBe('produce')
    expect(data.scanSequence[1].category).toBe('frozen')
  })

  test('event without category: itemId required, category optional', async () => {
    const sessionId = await seedSession()
    await recordScan(sessionId, { itemId: 'no-cat-A' })
    const snap = await db.collection('shopping_sessions').doc(sessionId).get()
    const data = snap.data() || {}
    expect(data.scanSequence.length).toBe(1)
    expect(data.scanSequence[0].itemId).toBe('no-cat-A')
    // category field should be absent on the event object
    expect('category' in data.scanSequence[0]).toBe(false)
  })

  test('scannedAt is a Timestamp on every event', async () => {
    const sessionId = await seedSession()
    await recordScan(sessionId, { itemId: 'ts-test', category: 'pantry' })
    const snap = await db.collection('shopping_sessions').doc(sessionId).get()
    const data = snap.data() || {}
    const event = data.scanSequence[0]
    // Timestamp instances from admin SDK have toMillis(); plain objects do not.
    expect(typeof event.scannedAt?.toMillis).toBe('function')
    // And the value is sensible — within the last minute.
    const tsMs = event.scannedAt.toMillis()
    const now = Date.now()
    expect(tsMs).toBeGreaterThanOrEqual(now - 60_000)
  })

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
}

main()
  .catch((e) => {
    console.error('\nFatal:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    for (const fn of cleanup) {
      try { await fn() } catch { /* ignore */ }
    }
    process.exit(process.exitCode || 0)
  })
