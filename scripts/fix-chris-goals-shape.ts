/**
 * One-shot: reshape Chris's goals fields to be nested under `goals.*`
 * to match what /progress's `activeProfile.goals.dailyCalorieGoal`
 * read expects.
 *
 * The promote-chris-to-patient.ts script wrote `dailyCalorieGoal` +
 * `targetWeight` as TOP-LEVEL fields on the Patient doc because that's
 * what the Patient TS interface declares. But the /progress page
 * reads them via `activeProfile.goals.dailyCalorieGoal` etc. — the
 * shape inherited from UserProfile, not PatientProfile. The two
 * shapes diverged at some point; this is a known cross-cutting
 * inconsistency the page-refactor session-memory flags.
 *
 * Quick fix here: write the same values both nested AND top-level,
 * so both legacy reads + future-aligned reads work. Idempotent.
 *
 * Run:  npx tsx scripts/fix-chris-goals-shape.ts
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const TARGET_EMAIL = 'weightlossprojectionlab@gmail.com'
const CHRIS_NAME = 'Chris Smithbriar'

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
  const userRef = db.collection('users').doc(user.uid)
  const chrisSnap = await userRef.collection('patients').where('name', '==', CHRIS_NAME).limit(1).get()
  if (chrisSnap.empty) throw new Error(`No patient named "${CHRIS_NAME}" found`)
  const chris = chrisSnap.docs[0]
  const data = chris.data()

  const dailyCalorieGoal = data.dailyCalorieGoal ?? data.goals?.dailyCalorieGoal
  const targetWeight = data.targetWeight ?? data.goals?.targetWeight

  if (!dailyCalorieGoal && !targetWeight) {
    console.log('Nothing to reshape — neither field present.')
    return
  }

  const goals: Record<string, unknown> = data.goals ?? {}
  if (dailyCalorieGoal) goals.dailyCalorieGoal = dailyCalorieGoal
  if (targetWeight) goals.targetWeight = targetWeight

  await chris.ref.update({
    goals,
    updatedAt: Timestamp.now(),
  })
  console.log(`✓ Chris's goals reshape: { goals: ${JSON.stringify(goals)} }`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
