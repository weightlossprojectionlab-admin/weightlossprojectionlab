/**
 * One-shot: ensure the e2e test user has the minimum profile data
 * /progress needs to render its full content.
 *
 * Per app/progress/page.tsx:425 —
 *   const hasCompletedOnboarding = activeProfile
 *     && activeProfile.goals
 *     && activeProfile.goals.dailyCalorieGoal
 *     && activeProfile.height
 *
 * If any of those four are missing, /progress renders only the page
 * header and the e2e battery's section-heading assertions fail because
 * `<main>` is empty. This script sets just enough profile data on the
 * test user so the chart sections render.
 *
 * Idempotent: existing values are preserved (the merge below only sets
 * fields that are missing or zero).
 *
 * Run:  npx tsx scripts/ensure-e2e-test-user-onboarded.ts
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const TARGET_EMAIL = 'weightlossprojectionlab@gmail.com'

async function main() {
  const { initializeApp, cert, getApps, getApp } = await import('firebase-admin/app')
  const { getAuth } = await import('firebase-admin/auth')
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
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
  console.log(`\nTarget user: ${TARGET_EMAIL} (uid=${user.uid})`)

  const ref = db.collection('users').doc(user.uid)
  const snap = await ref.get()
  const existing = snap.exists ? (snap.data() as Record<string, unknown>) : {}
  const goals = (existing.goals as Record<string, unknown>) ?? {}

  console.log('Current state:')
  console.log(`  height                = ${existing.height ?? '(missing)'}`)
  console.log(`  goals.dailyCalorieGoal = ${goals.dailyCalorieGoal ?? '(missing)'}`)
  console.log(`  goals.targetWeight     = ${goals.targetWeight ?? '(missing)'}`)
  console.log(`  activityLevel          = ${existing.activityLevel ?? '(missing)'}`)

  // hasCompletedOnboarding in app/progress/page.tsx:425 reads
  // `activeProfile.height` and `activeProfile.goals.dailyCalorieGoal`.
  // `activeProfile` is the shape returned by /api/user-profile, which
  // spreads userData TOP-LEVEL (line 111: `{ ...userData }`). So the
  // fields the page reads live at the top level of the user doc, not
  // nested under `profile.*`. Earlier version of this script wrote
  // to `profile.height` etc — invisible to the page.
  const updates: Record<string, unknown> = {}
  if (!existing.height) {
    updates['height'] = 70 // inches (5'10)
    console.log('  → setting height = 70')
  }
  if (!goals.dailyCalorieGoal) {
    updates['goals.dailyCalorieGoal'] = 2000
    console.log('  → setting goals.dailyCalorieGoal = 2000')
  }
  if (!goals.targetWeight) {
    updates['goals.targetWeight'] = 170 // lbs
    console.log('  → setting goals.targetWeight = 170')
  }
  if (!existing.activityLevel) {
    updates['activityLevel'] = 'moderately-active'
    console.log('  → setting activityLevel = moderately-active')
  }

  if (Object.keys(updates).length === 0) {
    console.log('\n✓ Already fully onboarded — no changes needed.')
    return
  }

  updates['updatedAt'] = FieldValue.serverTimestamp()

  await ref.set(updates, { merge: true })
  console.log(`\n✓ Wrote ${Object.keys(updates).length - 1} field(s) — test user is now hasCompletedOnboarding=true.`)
}

main().catch((err) => {
  console.error('\n[FAIL]', err)
  process.exit(1)
})
