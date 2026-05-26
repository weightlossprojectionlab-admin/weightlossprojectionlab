/**
 * Migration: backfill historical weight entries into the canonical
 * `users/{ownerId}/weightLogs` collection.
 *
 * Before this migration there were three places weight could live:
 *   1. users/{ownerId}/patients/{patientId}/vitals  (type=weight)
 *   2. users/{ownerId}/patients/{patientId}/weight-logs
 *   3. users/{ownerId}/weightLogs                   ← canonical (what
 *      /progress and /api/projection read)
 *
 * After this migration #3 contains everything. Dedupes via a
 * `sourceRef` field so reruns are idempotent. Source docs in #1 + #2
 * are LEFT IN PLACE (read-only after the consolidation; safer than
 * deleting on first migration pass).
 *
 * Dry-run by default. --apply commits writes.
 *
 * Usage:
 *   npx tsx scripts/migrate-weight-to-canonical-weightlogs.ts          (dry-run)
 *   npx tsx scripts/migrate-weight-to-canonical-weightlogs.ts --apply  (commit)
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

const APPLY = process.argv.includes('--apply')

interface Stats {
  ownersScanned: number
  patientsScanned: number
  weightVitalsFound: number
  patientWeightLogsFound: number
  canonicalAlreadyPresent: number
  migrated: number
  skippedNoOwnerOrPatient: number
}

const stats: Stats = {
  ownersScanned: 0,
  patientsScanned: 0,
  weightVitalsFound: 0,
  patientWeightLogsFound: 0,
  canonicalAlreadyPresent: 0,
  migrated: 0,
  skippedNoOwnerOrPatient: 0,
}

/**
 * sourceRef = stable string identifying the origin doc. We write this
 * to canonical entries so reruns dedupe instead of inserting copies.
 */
function sourceRef(kind: 'vital' | 'weight-log', patientId: string, docId: string): string {
  return `${kind}:${patientId}:${docId}`
}

async function alreadyMigrated(ownerId: string, ref: string): Promise<boolean> {
  const snap = await db
    .collection('users')
    .doc(ownerId)
    .collection('weightLogs')
    .where('sourceRef', '==', ref)
    .limit(1)
    .get()
  return !snap.empty
}

async function writeCanonical(
  ownerId: string,
  patientId: string,
  ref: string,
  weight: number,
  unit: string,
  loggedAt: Date,
  notes: string | undefined,
  loggedBy: string | undefined,
): Promise<void> {
  if (!APPLY) return
  await db
    .collection('users')
    .doc(ownerId)
    .collection('weightLogs')
    .add({
      patientId,
      userId: ownerId,
      loggedBy: loggedBy || ownerId,
      weight,
      unit,
      loggedAt: Timestamp.fromDate(loggedAt),
      dataSource: 'backfill',
      sourceRef: ref,
      ...(notes ? { notes } : {}),
    })
}

async function migrateOnePatient(ownerId: string, patientId: string): Promise<void> {
  stats.patientsScanned++

  // (1) Pull weight entries from the vitals subcollection.
  const weightVitalsSnap = await db
    .collection('users')
    .doc(ownerId)
    .collection('patients')
    .doc(patientId)
    .collection('vitals')
    .where('type', '==', 'weight')
    .get()

  for (const doc of weightVitalsSnap.docs) {
    stats.weightVitalsFound++
    const data = doc.data()
    const ref = sourceRef('vital', patientId, doc.id)
    if (await alreadyMigrated(ownerId, ref)) {
      stats.canonicalAlreadyPresent++
      continue
    }
    const weight = typeof data.value === 'number' ? data.value : NaN
    if (!Number.isFinite(weight) || weight <= 0) continue
    const recordedAt = data.recordedAt ? new Date(data.recordedAt) : new Date()
    await writeCanonical(
      ownerId,
      patientId,
      ref,
      weight,
      data.unit || 'lbs',
      recordedAt,
      data.notes,
      data.loggedBy || data.takenBy,
    )
    stats.migrated++
  }

  // (2) Pull from the legacy patient-scoped weight-logs.
  const patientLogsSnap = await db
    .collection('users')
    .doc(ownerId)
    .collection('patients')
    .doc(patientId)
    .collection('weight-logs')
    .get()

  for (const doc of patientLogsSnap.docs) {
    stats.patientWeightLogsFound++
    const data = doc.data()
    const ref = sourceRef('weight-log', patientId, doc.id)
    if (await alreadyMigrated(ownerId, ref)) {
      stats.canonicalAlreadyPresent++
      continue
    }
    const weight = typeof data.weight === 'number' ? data.weight : parseFloat(data.weight)
    if (!Number.isFinite(weight) || weight <= 0) continue
    const loggedAt = data.loggedAt?.toDate
      ? data.loggedAt.toDate()
      : new Date(data.loggedAt || Date.now())
    await writeCanonical(
      ownerId,
      patientId,
      ref,
      weight,
      data.unit || 'lbs',
      loggedAt,
      data.notes,
      data.loggedBy || data.userId,
    )
    stats.migrated++
  }
}

async function run(): Promise<void> {
  console.log(`[migrate-weight] mode=${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)
  const usersSnap = await db.collection('users').get()

  for (const userDoc of usersSnap.docs) {
    stats.ownersScanned++
    const ownerId = userDoc.id
    const patientsSnap = await db
      .collection('users')
      .doc(ownerId)
      .collection('patients')
      .get()
    if (patientsSnap.empty) continue
    for (const patientDoc of patientsSnap.docs) {
      try {
        await migrateOnePatient(ownerId, patientDoc.id)
      } catch (err) {
        console.error(`[migrate-weight] failed for ${ownerId}/${patientDoc.id}:`, err)
      }
    }
  }

  console.log('\n=== Migration stats ===')
  console.log(stats)
  if (!APPLY) {
    console.log('\nDRY-RUN — no writes happened. Re-run with --apply to commit.')
  }
}

run().then(() => process.exit(0)).catch((err) => {
  console.error(err)
  process.exit(1)
})
