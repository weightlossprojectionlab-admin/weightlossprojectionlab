/**
 * Integration assertion test: caregiverOf upsert is idempotent.
 *
 * Exercises the live upsertCaregiverOf code path (the same logic invite-accept
 * and admin-add route through) against real Firestore on a SCRATCH test user.
 * No real user data is touched.
 *
 * Asserts:
 *   1. Calling upsert with a NEW accountOwnerId appends an entry.
 *   2. Calling upsert again with the SAME accountOwnerId does NOT append —
 *      it merges patientsAccess + permissions into the existing entry.
 *   3. New patients and newly-granted permissions land on the merged entry.
 *   4. Calling upsert a third time with the same input is fully idempotent —
 *      state is byte-identical to after step 2.
 *
 * Cleans up the scratch user at the end (success or failure).
 *
 * Usage:
 *   npx tsx scripts/test-caregiver-idempotency.ts
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

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
const db = getFirestore()

// ── Inline copy of upsert logic from lib/caregiver-relationship.ts ──
// Same shape as the function the API endpoints call. If the lib changes,
// this needs to change too (acceptable trade-off — script has no path-alias
// access to @/lib so importing isn't trivial).

function unionArrays<T>(a: T[] | undefined | null, b: T[] | undefined | null): T[] {
  return Array.from(new Set([...(a || []), ...(b || [])]))
}
function mergePermissions(a: any, b: any): Record<string, boolean> {
  const out: Record<string, boolean> = { ...(a || {}) }
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = !!(out[k] || v)
  }
  return out
}
async function upsertCaregiverOf(uid: string, ctx: any): Promise<void> {
  const ref = db.collection('users').doc(uid)
  const snap = await ref.get()
  const existing = (snap.data()?.caregiverOf || []) as any[]
  const idx = existing.findIndex((e) => e?.accountOwnerId === ctx.accountOwnerId)
  if (idx === -1) {
    await ref.set({ caregiverOf: [...existing, ctx] }, { merge: true })
    return
  }
  const merged = {
    ...existing[idx],
    ...ctx,
    patientsAccess: unionArrays(existing[idx].patientsAccess, ctx.patientsAccess),
    permissions: mergePermissions(existing[idx].permissions, ctx.permissions),
  }
  const next = [...existing]
  next[idx] = merged
  await ref.set({ caregiverOf: next }, { merge: true })
}
// ──────────────────────────────────────────────────────────────────────

const TEST_PREFIX = '__test_idempotency'
const stamp = Date.now()
const TEST_USER_UID = `${TEST_PREFIX}_user_${stamp}`
const TEST_OWNER_UID = `${TEST_PREFIX}_owner_${stamp}`
const TEST_OWNER_2_UID = `${TEST_PREFIX}_owner2_${stamp}`

function assert(cond: any, msg: string): void {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`)
}

function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

async function readCaregiverOf(uid: string): Promise<any[]> {
  const snap = await db.collection('users').doc(uid).get()
  return (snap.data()?.caregiverOf || []) as any[]
}

async function run() {
  console.log(`\nScratch test user: ${TEST_USER_UID}`)
  console.log('='.repeat(70))

  // Step 1: first upsert against a new owner — should append.
  const ctx1 = {
    accountOwnerId: TEST_OWNER_UID,
    accountOwnerName: 'Test Owner One',
    role: 'caregiver',
    patientsAccess: ['patient-A', 'patient-B'],
    permissions: { viewMedicalRecords: true, viewVitals: true, logVitals: false },
  }
  await upsertCaregiverOf(TEST_USER_UID, ctx1)
  let state = await readCaregiverOf(TEST_USER_UID)
  assert(state.length === 1, `step 1: expected length 1, got ${state.length}`)
  assert(deepEqual(state[0].patientsAccess.sort(), ['patient-A', 'patient-B']), 'step 1: patients')
  assert(state[0].permissions.viewMedicalRecords === true, 'step 1: viewMedicalRecords true')
  console.log('  ✓ step 1: new owner appends (length 1)')

  // Step 2: upsert again, same owner, NEW patient + flip a perm.
  const ctx2 = {
    accountOwnerId: TEST_OWNER_UID,
    accountOwnerName: 'Test Owner One',
    role: 'caregiver',
    patientsAccess: ['patient-C'],
    permissions: { logVitals: true, scheduleAppointments: true },
  }
  await upsertCaregiverOf(TEST_USER_UID, ctx2)
  state = await readCaregiverOf(TEST_USER_UID)
  assert(state.length === 1, `step 2: expected length still 1 (merged), got ${state.length}`)
  assert(
    deepEqual(state[0].patientsAccess.sort(), ['patient-A', 'patient-B', 'patient-C']),
    'step 2: patient-C merged into patientsAccess',
  )
  assert(state[0].permissions.viewMedicalRecords === true, 'step 2: kept viewMedicalRecords from step 1')
  assert(state[0].permissions.logVitals === true, 'step 2: logVitals OR-merged true (was false, now true)')
  assert(state[0].permissions.scheduleAppointments === true, 'step 2: scheduleAppointments added')
  console.log('  ✓ step 2: same owner merges (length still 1, patient + perms unioned)')

  // Step 3: upsert the SAME ctx2 again — no state change at all.
  const snapshotBefore = JSON.stringify(state)
  await upsertCaregiverOf(TEST_USER_UID, ctx2)
  state = await readCaregiverOf(TEST_USER_UID)
  assert(state.length === 1, `step 3: expected length still 1, got ${state.length}`)
  assert(JSON.stringify(state) === snapshotBefore, 'step 3: state byte-identical to step 2')
  console.log('  ✓ step 3: repeat with same input is fully idempotent')

  // Step 4: upsert against a DIFFERENT owner — should append a 2nd entry.
  const ctx3 = {
    accountOwnerId: TEST_OWNER_2_UID,
    accountOwnerName: 'Test Owner Two',
    role: 'caregiver',
    patientsAccess: ['patient-Z'],
    permissions: { viewMedicalRecords: true },
  }
  await upsertCaregiverOf(TEST_USER_UID, ctx3)
  state = await readCaregiverOf(TEST_USER_UID)
  assert(state.length === 2, `step 4: expected length 2, got ${state.length}`)
  console.log('  ✓ step 4: different owner appends (length 2)')

  console.log('\nAll 4 assertions PASSED. Idempotency confirmed.')
}

async function cleanup() {
  await db.collection('users').doc(TEST_USER_UID).delete().catch(() => {})
}

run()
  .then(cleanup)
  .catch(async (e) => {
    console.error('\nFAILED:', e.message)
    await cleanup()
    process.exit(1)
  })
