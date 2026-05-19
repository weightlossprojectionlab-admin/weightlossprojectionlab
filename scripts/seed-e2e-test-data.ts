/**
 * One-shot: seed 30 days of weight logs + meal logs for the e2e test
 * user so /progress's charts have something to render.
 *
 * Per lib/chart-data-aggregator.ts —
 *   • Weight chart reads users/{uid}/weightLogs (fields: loggedAt, weight)
 *   • Calorie chart reads users/{uid}/mealLogs   (fields: loggedAt,
 *     totalCalories | estimatedCalories)
 *
 * Without rows in these subcollections /progress's chart sections may
 * render with empty states; with realistic data the chart bodies show
 * actual trend lines so the assertion battery exercises the full
 * happy-path render.
 *
 * Idempotent: tags each doc with `source: 'e2e-seed'` and skips
 * insertion if any existing seed docs are present. Cleanup pass:
 *   npx tsx scripts/seed-e2e-test-data.ts --delete --live
 *
 * Run:
 *   npx tsx scripts/seed-e2e-test-data.ts            # dry-run
 *   npx tsx scripts/seed-e2e-test-data.ts --live     # write 30 days
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const TARGET_EMAIL = 'weightlossprojectionlab@gmail.com'
const SEED_TAG = 'e2e-seed'
const DAYS = 30
const STARTING_WEIGHT = 185 // lbs — drifts down 0.2 lb/day on average
const DAILY_CALORIE_TARGET = 2000

const LIVE = process.argv.includes('--live')
const DELETE = process.argv.includes('--delete')

interface SeededDoc {
  source?: string
}

async function main() {
  const { initializeApp, cert, getApps, getApp } = await import('firebase-admin/app')
  const { getAuth } = await import('firebase-admin/auth')
  const { getFirestore, Timestamp } = await import('firebase-admin/firestore')
  const fs = await import('fs')

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
  if (getApps().length === 0) {
    initializeApp({ credential: cert(require(findServiceAccountPath())) })
  }

  const auth = getAuth(getApp())
  const db = getFirestore(getApp())

  const user = await auth.getUserByEmail(TARGET_EMAIL)
  console.log(`\nMode: ${LIVE ? (DELETE ? 'LIVE DELETE' : 'LIVE SEED') : 'DRY RUN'}`)
  console.log(`Target user: ${TARGET_EMAIL} (uid=${user.uid})`)

  const weightCol = db.collection('users').doc(user.uid).collection('weightLogs')
  const mealCol = db.collection('users').doc(user.uid).collection('mealLogs')

  if (DELETE) {
    console.log('\n--- Deleting seeded docs ---')
    const [wSnap, mSnap] = await Promise.all([
      weightCol.where('source', '==', SEED_TAG).get(),
      mealCol.where('source', '==', SEED_TAG).get(),
    ])
    console.log(`  weightLogs matched: ${wSnap.size}`)
    console.log(`  mealLogs   matched: ${mSnap.size}`)
    if (wSnap.size + mSnap.size === 0) {
      console.log('  Nothing to delete.')
      return
    }
    if (!LIVE) {
      console.log('  (dry run — pass --live to actually delete)')
      return
    }
    let batch = db.batch()
    let n = 0
    for (const d of [...wSnap.docs, ...mSnap.docs]) {
      batch.delete(d.ref)
      n++
      if (n % 400 === 0) {
        await batch.commit()
        batch = db.batch()
      }
    }
    if (n % 400 !== 0) await batch.commit()
    console.log(`  ✓ Deleted ${n} docs`)
    return
  }

  // Idempotency guard
  const existingW = await weightCol.where('source', '==', SEED_TAG).limit(1).get()
  if (!existingW.empty) {
    console.log(`\n⚠ Seed docs already present for ${TARGET_EMAIL}.`)
    console.log('  Skipping insert (idempotent). Pass --delete --live to clean up + re-seed.')
    return
  }

  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000

  const weightRows: Array<{ at: Date; weight: number }> = []
  const mealRows: Array<{ at: Date; calories: number; mealType: string }> = []

  for (let i = 0; i < DAYS; i++) {
    const daysAgo = DAYS - 1 - i // i=0 → DAYS-1 days ago; i=DAYS-1 → today
    // Weight log: linear drift down with ±0.4 lb daily noise
    const driftedWeight = STARTING_WEIGHT - i * 0.2
    const noise = (Math.sin(i * 1.9) + Math.cos(i * 2.3)) * 0.4
    weightRows.push({
      at: new Date(now - daysAgo * oneDay + 7 * 60 * 60 * 1000), // ~7am that day
      weight: Math.round((driftedWeight + noise) * 10) / 10, // 1 decimal
    })

    // Three meals per day, calories spread around DAILY_CALORIE_TARGET
    for (const [hour, share, mealType] of [
      [8, 0.25, 'breakfast'],
      [13, 0.35, 'lunch'],
      [19, 0.4, 'dinner'],
    ] as const) {
      const dayVariance = (Math.cos(i * 1.5) + 1) * 0.1 // 0..0.2
      const calories = Math.round(DAILY_CALORIE_TARGET * (share + dayVariance / 3))
      mealRows.push({
        at: new Date(now - daysAgo * oneDay + hour * 60 * 60 * 1000),
        calories,
        mealType,
      })
    }
  }

  console.log(`\n--- About to write ---`)
  console.log(`  weightLogs: ${weightRows.length} (1/day for ${DAYS} days)`)
  console.log(`  mealLogs:   ${mealRows.length} (3/day for ${DAYS} days)`)
  console.log(`  weight range: ${Math.min(...weightRows.map((r) => r.weight))} → ${Math.max(...weightRows.map((r) => r.weight))} lbs`)
  console.log(`  calorie sum per day target: ~${DAILY_CALORIE_TARGET}`)

  if (!LIVE) {
    console.log('\n(dry run — pass --live to actually seed)')
    return
  }

  console.log('\n--- Writing ---')
  let batch = db.batch()
  let writeCount = 0
  for (const w of weightRows) {
    const ref = weightCol.doc()
    batch.set(ref, {
      loggedAt: Timestamp.fromDate(w.at),
      weight: w.weight,
      unit: 'lbs',
      source: SEED_TAG,
      patientId: user.uid,
      userId: user.uid,
      loggedBy: user.uid,
    })
    writeCount++
    if (writeCount % 400 === 0) {
      await batch.commit()
      batch = db.batch()
    }
  }
  for (const m of mealRows) {
    const ref = mealCol.doc()
    batch.set(ref, {
      loggedAt: Timestamp.fromDate(m.at),
      totalCalories: m.calories,
      mealType: m.mealType,
      source: SEED_TAG,
      userId: user.uid,
      // Minimal nutrition breakdown so macro chart has something to plot.
      // Rough 50/25/25 carbs/protein/fat by calories.
      protein: Math.round(((m.calories * 0.25) / 4) * 10) / 10,
      carbs: Math.round(((m.calories * 0.5) / 4) * 10) / 10,
      fat: Math.round(((m.calories * 0.25) / 9) * 10) / 10,
    })
    writeCount++
    if (writeCount % 400 === 0) {
      await batch.commit()
      batch = db.batch()
    }
  }
  if (writeCount % 400 !== 0) await batch.commit()
  console.log(`  ✓ Wrote ${writeCount} docs total`)
}

main().catch((err) => {
  console.error('\n[FAIL]', err)
  process.exit(1)
})
