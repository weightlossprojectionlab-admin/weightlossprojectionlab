/**
 * API assertion tests for the new caregiver endpoints.
 *
 * Self-contained Node script — no browser, no Playwright. Mints a Firebase
 * ID token for the configured test user via admin SDK + the public REST
 * exchange endpoint, then hits the local dev server. Asserts status codes
 * + payload shape on:
 *
 *   /api/owners/[ownerId]/display-name   (S3 endpoint)
 *   /api/owners/[ownerId]/handoff-notes  (P3 endpoints)
 *
 * Requirements:
 *   - Dev server running at E2E_BASE_URL (default https://localhost:3003)
 *   - .env.local has E2E_TEST_USER_EMAIL + Firebase admin credentials
 *   - .env.local has NEXT_PUBLIC_FIREBASE_API_KEY for the REST exchange
 *
 * Usage:
 *   npx tsx scripts/test-caregiver-apis.ts
 */

// Dev server uses self-signed cert; tolerate it. MUST be set before any
// fetch / undici module touches the network.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
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

const BASE_URL = process.env.E2E_BASE_URL || 'https://localhost:3003'
const TEST_EMAIL = process.env.E2E_TEST_USER_EMAIL
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

if (!TEST_EMAIL) {
  console.error('E2E_TEST_USER_EMAIL must be set in .env.local')
  process.exit(1)
}
if (!API_KEY) {
  console.error('NEXT_PUBLIC_FIREBASE_API_KEY must be set in .env.local')
  process.exit(1)
}

interface ApiResult {
  status: number
  body: any
}

async function callApi(token: string, urlPath: string, init?: { method?: string; body?: unknown }): Promise<ApiResult> {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method: init?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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
      if (actual !== expected) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toBeTruthy() {
      if (!actual) throw new Error(`expected truthy, got ${JSON.stringify(actual)}`)
    },
    toContain(needle: any) {
      if (!Array.isArray(actual)) throw new Error('toContain requires an array')
      if (!actual.includes(needle)) throw new Error(`array missing ${JSON.stringify(needle)}`)
    },
  }
}

async function main() {
  // ── Mint ID token for the test user ─────────────────────────────────
  const user = await auth.getUserByEmail(TEST_EMAIL!)
  const customToken = await auth.createCustomToken(user.uid)
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
  const ownerUserId = user.uid

  console.log(`\nTesting against ${BASE_URL}`)
  console.log(`Caller: ${TEST_EMAIL} (${ownerUserId})`)
  console.log('='.repeat(70))

  // ── Assertions ──────────────────────────────────────────────────────
  test('display-name: caller can fetch their own display name (200)', async () => {
    const r = await callApi(idToken, `/api/owners/${ownerUserId}/display-name`)
    expect(r.status).toBe(200)
    expect(r.body?.id).toBe(ownerUserId)
    expect(typeof r.body?.displayName === 'string' && r.body.displayName.length > 0).toBe(true)
  })

  test('display-name: 403 for an unrelated owner', async () => {
    const stranger = 'definitely-not-a-relationship-uid-zzz'
    const r = await callApi(idToken, `/api/owners/${stranger}/display-name`)
    expect(r.status).toBe(403)
  })

  test('handoff-notes: caller can list their own household notes (200)', async () => {
    const r = await callApi(idToken, `/api/owners/${ownerUserId}/handoff-notes`)
    expect(r.status).toBe(200)
    expect(Array.isArray(r.body?.items)).toBe(true)
  })

  test('handoff-notes: POST then GET shows the new note', async () => {
    const stamp = `e2e idempotency probe ${Date.now()}`
    const created = await callApi(idToken, `/api/owners/${ownerUserId}/handoff-notes`, {
      method: 'POST',
      body: { body: stamp },
    })
    expect(created.status).toBe(201)
    expect(created.body?.note?.body).toBe(stamp)
    expect(typeof created.body?.note?.id).toBe('string')

    const list = await callApi(idToken, `/api/owners/${ownerUserId}/handoff-notes?limit=10`)
    expect(list.status).toBe(200)
    const bodies = (list.body?.items as any[])?.map((n) => n.body) || []
    expect(bodies).toContain(stamp)
  })

  test('handoff-notes: POST with empty body is rejected (400)', async () => {
    const r = await callApi(idToken, `/api/owners/${ownerUserId}/handoff-notes`, {
      method: 'POST',
      body: { body: '   ' },
    })
    expect(r.status).toBe(400)
  })

  test('handoff-notes: 403 for an unrelated household', async () => {
    const stranger = 'definitely-not-a-relationship-uid-zzz'
    const r = await callApi(idToken, `/api/owners/${stranger}/handoff-notes`)
    expect(r.status).toBe(403)
  })

  // ── Run ─────────────────────────────────────────────────────────────
  let passed = 0
  let failed = 0
  for (const a of assertions) {
    try {
      await a.fn()
      console.log(`  ✓ ${a.name}`)
      passed++
    } catch (e: any) {
      console.error(`  ✗ ${a.name}`)
      console.error(`      ${e.message}`)
      failed++
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error('\nFAILED:', e)
  process.exit(1)
})
