/**
 * Seed 35 days of weight log data for Percy's patient profile so the
 * projection chart has real history to extrapolate from. Writes to the
 * canonical `users/{ownerUserId}/weightLogs` collection with a stable
 * `sourceRef` of `seed-day-N` so reruns are idempotent (existing
 * test-seed entries are deleted before insert).
 *
 * Weight trajectory: 220 → 200 over 35 days (≈0.57 lb/day) with ±0.75 lb
 * daily noise so the linear-fit projection has something realistic to
 * pick up. Also updates patient.currentWeight + goals.startWeight on
 * the profile so the dashboard summary reflects the seeded state.
 *
 * Dry-run by default. --apply commits writes.
 *
 * Usage:
 *   npx tsx scripts/seed-percy-weight-trend.ts           (dry-run)
 *   npx tsx scripts/seed-percy-weight-trend.ts --apply   (commit)
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
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

const PATIENT_ID = 'Qhp2iCGuD0Vpzh8HOKy0'
const DAYS = 35
const START_WEIGHT = 220
const END_WEIGHT = 200
const APPLY = process.argv.includes('--apply')

async function findOwner(patientId: string): Promise<string> {
  const usersSnap = await db.collection('users').get()
  for (const userDoc of usersSnap.docs) {
    const patientDoc = await db
      .collection('users')
      .doc(userDoc.id)
      .collection('patients')
      .doc(patientId)
      .get()
    if (patientDoc.exists) return userDoc.id
  }
  throw new Error(`Patient ${patientId} not found under any user`)
}

function rng(seed: number): () => number {
  // Deterministic RNG so the same dry-run preview matches the apply pass.
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

async function run(): Promise<void> {
  console.log(`[seed-weight] mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`[seed-weight] patient=${PATIENT_ID}`)

  const ownerUserId = await findOwner(PATIENT_ID)
  console.log(`[seed-weight] owner=${ownerUserId}`)

  const today = new Date()
  const slopePerDay = (END_WEIGHT - START_WEIGHT) / DAYS
  const random = rng(42) // deterministic
  const points: Array<{ weight: number; loggedAt: Date; ref: string }> = []

  for (let i = 0; i < DAYS; i++) {
    const daysAgo = DAYS - 1 - i // i=0 → oldest, i=DAYS-1 → today
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)
    date.setHours(8, 0, 0, 0) // 8 AM morning weigh-in
    const expected = START_WEIGHT + slopePerDay * i
    const noise = (random() - 0.5) * 1.5 // ±0.75 lb
    const weight = Math.round((expected + noise) * 10) / 10
    points.push({ weight, loggedAt: date, ref: `seed-day-${i}` })
  }

  console.log(`[seed-weight] generated ${points.length} points`)
  console.log(`[seed-weight] first=${points[0].weight}lbs on ${points[0].loggedAt.toISOString().split('T')[0]}`)
  console.log(`[seed-weight] last=${points[points.length - 1].weight}lbs on ${points[points.length - 1].loggedAt.toISOString().split('T')[0]}`)

  if (!APPLY) {
    console.log('\nDRY-RUN — no writes. Re-run with --apply to commit.')
    return
  }

  // Idempotency: delete any prior seed entries for this patient.
  const existing = await db
    .collection('users')
    .doc(ownerUserId)
    .collection('weightLogs')
    .where('patientId', '==', PATIENT_ID)
    .where('dataSource', '==', 'test-seed')
    .get()
  console.log(`[seed-weight] deleting ${existing.size} prior seed entries`)
  for (const doc of existing.docs) {
    await doc.ref.delete()
  }

  // Insert fresh seed data.
  const weightLogsRef = db.collection('users').doc(ownerUserId).collection('weightLogs')
  for (const p of points) {
    await weightLogsRef.add({
      weight: p.weight,
      unit: 'lbs',
      loggedAt: Timestamp.fromDate(p.loggedAt),
      dataSource: 'test-seed',
      sourceRef: p.ref,
      patientId: PATIENT_ID,
      userId: ownerUserId,
      loggedBy: ownerUserId,
    })
  }
  console.log(`[seed-weight] inserted ${points.length} entries`)

  // Update profile so currentWeight + goals.* reflect the seed.
  // targetWeight is required for the Weight-Goal ETA chip to render
  // (the demo Playwright spec asserts on it). 180 lbs is sensible
  // for a 220→200 trajectory with room to keep going.
  const latest = points[points.length - 1].weight
  const TARGET_WEIGHT = 180
  await db
    .collection('users')
    .doc(ownerUserId)
    .collection('patients')
    .doc(PATIENT_ID)
    .update({
      currentWeight: latest,
      weightUnit: 'lbs',
      'goals.startWeight': START_WEIGHT,
      'goals.targetWeight': TARGET_WEIGHT,
      'goals.weeklyWeightLossGoal': 1, // 1 lb/week — matches the seeded slope
    })
  console.log(`[seed-weight] patient profile updated: currentWeight=${latest}, startWeight=${START_WEIGHT}, targetWeight=${TARGET_WEIGHT}`)
  console.log('\nDONE')
}

run().then(() => process.exit(0)).catch((err) => {
  console.error(err)
  process.exit(1)
})
