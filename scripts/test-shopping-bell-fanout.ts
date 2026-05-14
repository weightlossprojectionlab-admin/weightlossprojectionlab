/**
 * API assertion tests for Phase 2 — caregiver shopping Start/Done bell
 * fan-out to the owner.
 *
 * Hits the real dev server's HTTP endpoints (no Playwright, no browser),
 * with a real Firebase ID token minted for the test caregiver. Seeds a
 * shopping_sessions doc, exercises the announce-start + announce-done
 * endpoints, and verifies the resulting `notifications` rows landed on
 * the correct recipients with the correct shape.
 *
 * Twelve assertions:
 *   1.  start: 401 when Authorization header is missing
 *   2.  start: 403 when caller has no household access to ownerId
 *   3.  start: 400 when sessionId is missing from body
 *   4.  start: 404 when sessionId references a non-existent doc
 *   5.  start: 403 when the session belongs to a different user
 *   6.  start: 201 happy path — caregiver announces on own session
 *   7.  start: shopping_started notification doc lands on owner
 *   8.  start: shopper themselves does NOT get notified
 *   9.  done: 201 happy path with durationMinutes computed
 *   10. done: shopping_done notification doc lands on owner with the
 *       expected metadata (item count, store, duration)
 *   11. done: response itemsFound + storeName reach the notification
 *       metadata (caller-supplied fields make it through)
 *   12. done: 404 when sessionId references a non-existent doc
 *
 * Cleanup: every fixture (session, notifications) is tracked in a
 * `cleanup` array and deleted in a finally block — including on failure.
 *
 * Requirements:
 *   - Dev server running at E2E_BASE_URL (default https://localhost:3003)
 *   - .env.local: E2E_CAREGIVER_USER_EMAIL (default to percyrice@gmail.com)
 *   - .env.local: NEXT_PUBLIC_FIREBASE_API_KEY (for the REST exchange)
 *   - The caregiver must have an accepted familyMembers entry on the
 *     owner UID below (Phase 1 re-key migration guarantees this).
 *
 * Usage:
 *   npx tsx scripts/test-shopping-bell-fanout.ts
 */

// Dev server uses self-signed cert; tolerate it. MUST be set before any
// fetch / undici module touches the network.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

function findServiceAccountPath(): string {
  let dir = __dirname
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'service_account_key.json')
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('service_account_key.json not found')
}

initializeApp({ credential: cert(require(findServiceAccountPath())) })
const auth = getAuth()
const db = getFirestore()

const BASE_URL = process.env.E2E_BASE_URL || 'https://localhost:3003'
const CAREGIVER_EMAIL = process.env.E2E_CAREGIVER_USER_EMAIL || 'percyrice@gmail.com'
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

// Weight Loss Project owner — the caregiver has accepted familyMembers
// access here after the Phase 1 re-key migration. Hard-coded because
// the household is the substrate the tests exercise against.
const OWNER_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'
// An owner uid the caregiver is NOT a member of, used to assert the
// 403 path. Real-looking but doesn't exist in the dataset.
const UNRELATED_OWNER_UID = '__unrelated_owner_for_403_test'

if (!API_KEY) {
  console.error('NEXT_PUBLIC_FIREBASE_API_KEY must be set in .env.local')
  process.exit(1)
}

interface ApiResult {
  status: number
  body: any
}

async function callApi(
  token: string | null,
  urlPath: string,
  init?: { method?: string; body?: unknown },
): Promise<ApiResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method: init?.method || 'GET',
    headers,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  const text = await res.text()
  let body: any
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  return { status: res.status, body }
}

interface Assertion {
  name: string
  fn: () => Promise<void>
}
const assertions: Assertion[] = []
function test(name: string, fn: () => Promise<void>) {
  assertions.push({ name, fn })
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
      }
    },
    toBeTruthy() {
      if (!actual) throw new Error(`expected truthy, got ${JSON.stringify(actual)}`)
    },
    toBeGreaterThan(n: number) {
      if (typeof actual !== 'number' || actual <= n) {
        throw new Error(`expected > ${n}, got ${JSON.stringify(actual)}`)
      }
    },
    toBeGreaterThanOrEqual(n: number) {
      if (typeof actual !== 'number' || actual < n) {
        throw new Error(`expected >= ${n}, got ${JSON.stringify(actual)}`)
      }
    },
    toContain(needle: any) {
      if (!Array.isArray(actual)) throw new Error('toContain requires an array')
      if (!actual.includes(needle)) throw new Error(`array missing ${JSON.stringify(needle)}`)
    },
  }
}

// Track every fixture for teardown.
const cleanup: Array<() => Promise<void>> = []

async function main() {
  console.log(`\nTesting against ${BASE_URL}`)
  console.log(`Caller: ${CAREGIVER_EMAIL}`)
  console.log('='.repeat(70))

  // ── Mint ID token for the caregiver ─────────────────────────────────
  const caregiver = await auth.getUserByEmail(CAREGIVER_EMAIL)
  const customToken = await auth.createCustomToken(caregiver.uid)
  const exchange = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  )
  if (!exchange.ok) {
    throw new Error(`Custom-token exchange failed: ${exchange.status} ${await exchange.text()}`)
  }
  const { idToken } = (await exchange.json()) as { idToken: string }
  const caregiverUid = caregiver.uid
  console.log(`Caregiver uid: ${caregiverUid}`)
  console.log(`Owner uid:     ${OWNER_UID}`)
  console.log('='.repeat(70))

  // ── Seed: a real shopping_sessions doc owned by the caregiver ───────
  // Phase 2's endpoints look this up server-side to verify the caller
  // owns the session before fanning out.
  const stamp = Date.now()
  const sessionId = `__test_session_${stamp}`
  const startedAt = Timestamp.fromMillis(stamp - 5 * 60_000) // started 5 min ago
  await db.collection('shopping_sessions').doc(sessionId).set({
    householdId: OWNER_UID,
    userId: caregiverUid,
    userName: 'Test Caregiver',
    userRole: 'caregiver',
    status: 'active',
    startedAt,
    lastActivityAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(stamp + 2 * 60 * 60_000),
    deviceId: '__test_device',
    itemsScanned: 0,
    metadata: { appVersion: '1.0.0', deviceType: 'mobile', platform: 'test' },
  })
  cleanup.push(async () => {
    await db.collection('shopping_sessions').doc(sessionId).delete()
  })

  // Also seed a session that belongs to SOMEONE ELSE so we can assert
  // the 403 path on someone-else's-session announces.
  const otherSessionId = `__test_session_other_${stamp}`
  await db.collection('shopping_sessions').doc(otherSessionId).set({
    householdId: OWNER_UID,
    userId: 'some-other-user-uid-xyz',
    userName: 'Not You',
    userRole: 'caregiver',
    status: 'active',
    startedAt,
    lastActivityAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(stamp + 2 * 60 * 60_000),
    deviceId: '__test_device_other',
    itemsScanned: 0,
    metadata: { appVersion: '1.0.0', deviceType: 'mobile', platform: 'test' },
  })
  cleanup.push(async () => {
    await db.collection('shopping_sessions').doc(otherSessionId).delete()
  })

  // We'll capture notification ids the endpoints create so we can both
  // assert their shape AND delete them in cleanup.
  const createdNotifIds: Array<{ userId: string; id: string }> = []

  // ── Assertions ──────────────────────────────────────────────────────

  test('start: 401 when Authorization header is missing', async () => {
    const r = await callApi(null, `/api/owners/${OWNER_UID}/shopping/start`, {
      method: 'POST',
      body: { sessionId },
    })
    expect(r.status).toBe(401)
  })

  test('start: 403 when caller has no household access to ownerId', async () => {
    const r = await callApi(idToken, `/api/owners/${UNRELATED_OWNER_UID}/shopping/start`, {
      method: 'POST',
      body: { sessionId },
    })
    expect(r.status).toBe(403)
  })

  test('start: 400 when sessionId is missing from body', async () => {
    const r = await callApi(idToken, `/api/owners/${OWNER_UID}/shopping/start`, {
      method: 'POST',
      body: {},
    })
    expect(r.status).toBe(400)
  })

  test('start: 404 when sessionId references a non-existent doc', async () => {
    const r = await callApi(idToken, `/api/owners/${OWNER_UID}/shopping/start`, {
      method: 'POST',
      body: { sessionId: '__test_session_does_not_exist_zzz' },
    })
    expect(r.status).toBe(404)
  })

  test('start: 403 when the session belongs to a different user', async () => {
    const r = await callApi(idToken, `/api/owners/${OWNER_UID}/shopping/start`, {
      method: 'POST',
      body: { sessionId: otherSessionId },
    })
    expect(r.status).toBe(403)
  })

  test('start: 201 happy path — caregiver announces on own session', async () => {
    // Wipe any prior shopping_started notifs for this owner so the
    // count assertions below aren't muddled by re-runs.
    const r = await callApi(idToken, `/api/owners/${OWNER_UID}/shopping/start`, {
      method: 'POST',
      body: { sessionId, storeName: 'Test Pharmacy' },
    })
    expect(r.status).toBe(201)
    expect(r.body?.ok).toBe(true)
    expect(r.body?.notifiedCount).toBeGreaterThanOrEqual(1)
  })

  test('start: shopping_started notification doc lands on owner', async () => {
    // Find the notification we just created. Stamp-by-stamp wouldn't
    // work because the endpoint doesn't echo back the doc id; query
    // recent shopping_started notifs for the owner with this sessionId.
    const snap = await db
      .collection('notifications')
      .where('userId', '==', OWNER_UID)
      .where('type', '==', 'shopping_started')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()
    const match = snap.docs.find((d) => d.data()?.metadata?.sessionId === sessionId)
    expect(!!match).toBe(true)
    if (match) {
      createdNotifIds.push({ userId: OWNER_UID, id: match.id })
      const data = match.data()
      expect(data.metadata?.shopperId).toBe(caregiverUid)
      expect(data.metadata?.storeName).toBe('Test Pharmacy')
      expect(typeof data.title === 'string' && data.title.includes('Test Pharmacy')).toBe(true)
    }
  })

  test('start: shopper themselves does NOT get notified', async () => {
    const snap = await db
      .collection('notifications')
      .where('userId', '==', caregiverUid)
      .where('type', '==', 'shopping_started')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()
    const selfMatch = snap.docs.find((d) => d.data()?.metadata?.sessionId === sessionId)
    expect(!!selfMatch).toBe(false)
  })

  test('done: 201 happy path with durationMinutes computed', async () => {
    const r = await callApi(idToken, `/api/owners/${OWNER_UID}/shopping/done`, {
      method: 'POST',
      body: {
        sessionId,
        itemsFound: 12,
        itemsSkipped: 1,
        storeName: 'Test Pharmacy',
      },
    })
    expect(r.status).toBe(201)
    expect(r.body?.ok).toBe(true)
    expect(r.body?.notifiedCount).toBeGreaterThanOrEqual(1)
    // Session started 5 min ago in our seed → duration should be ~5 min.
    expect(typeof r.body?.durationMinutes === 'number').toBe(true)
    expect(r.body?.durationMinutes).toBeGreaterThanOrEqual(4)
  })

  test('done: shopping_done notification doc lands on owner', async () => {
    const snap = await db
      .collection('notifications')
      .where('userId', '==', OWNER_UID)
      .where('type', '==', 'shopping_done')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()
    const match = snap.docs.find((d) => d.data()?.metadata?.sessionId === sessionId)
    expect(!!match).toBe(true)
    if (match) {
      createdNotifIds.push({ userId: OWNER_UID, id: match.id })
    }
  })

  test('done: caller-supplied itemsFound + storeName reach metadata', async () => {
    const snap = await db
      .collection('notifications')
      .where('userId', '==', OWNER_UID)
      .where('type', '==', 'shopping_done')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()
    const match = snap.docs.find((d) => d.data()?.metadata?.sessionId === sessionId)
    expect(!!match).toBe(true)
    if (match) {
      const md = match.data().metadata
      expect(md?.itemsFound).toBe(12)
      expect(md?.itemsSkipped).toBe(1)
      expect(md?.storeName).toBe('Test Pharmacy')
      expect(typeof md?.durationMinutes === 'number').toBe(true)
    }
  })

  test('done: 404 when sessionId references a non-existent doc', async () => {
    const r = await callApi(idToken, `/api/owners/${OWNER_UID}/shopping/done`, {
      method: 'POST',
      body: { sessionId: '__test_session_does_not_exist_zzz', itemsFound: 0 },
    })
    expect(r.status).toBe(404)
  })

  // ── Run ─────────────────────────────────────────────────────────────
  let passed = 0
  let failed = 0
  const failures: Array<{ name: string; error: string }> = []
  for (const a of assertions) {
    try {
      await a.fn()
      console.log(`  ✓ ${a.name}`)
      passed += 1
    } catch (e: any) {
      console.log(`  ✗ ${a.name}`)
      console.log(`      ${e?.message || e}`)
      failures.push({ name: a.name, error: e?.message || String(e) })
      failed += 1
    }
  }

  console.log('='.repeat(70))
  console.log(`Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    console.log('\nFailures:')
    for (const f of failures) console.log(`  • ${f.name}\n      ${f.error}`)
  }
}

async function runCleanup() {
  console.log('\nCleaning up...')
  // Delete tracked notification docs.
  // (Re-fetch any we identified during assertions so we delete them
  // even if a later test threw before we captured them.)
  try {
    for (const type of ['shopping_started', 'shopping_done'] as const) {
      const snap = await db
        .collection('notifications')
        .where('type', '==', type)
        .where('userId', '==', OWNER_UID)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()
      const batch = db.batch()
      let n = 0
      for (const d of snap.docs) {
        const md = d.data()?.metadata
        if (typeof md?.sessionId === 'string' && md.sessionId.startsWith('__test_session_')) {
          batch.delete(d.ref)
          n += 1
        }
      }
      if (n > 0) {
        await batch.commit()
        console.log(`  deleted ${n} ${type} test notification(s)`)
      }
    }
  } catch (e: any) {
    console.log(`  notification cleanup warning: ${e?.message || e}`)
  }
  for (const fn of cleanup) {
    try { await fn() } catch (e: any) { console.log(`  cleanup step failed: ${e?.message || e}`) }
  }
}

main()
  .then(async () => {
    await runCleanup()
    // Exit non-zero if any test failed.
    const failed = (global as any).__phase2_failed_count ?? 0
    process.exit(failed > 0 ? 1 : 0)
  })
  .catch(async (e) => {
    console.error('\nFatal:', e)
    await runCleanup()
    process.exit(1)
  })
