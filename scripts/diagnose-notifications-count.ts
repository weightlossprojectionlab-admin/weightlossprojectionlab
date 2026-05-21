/**
 * One-shot: diagnose why the bell badge and the "Unread Notifications"
 * StatCard show different counts for the same user.
 *
 *   Bell  = client SDK: notifications where userId==X, read==false
 *           then JS-filter archived !== true
 *   Card  = admin SDK: same query, same JS-filter
 *
 * Same logic, same data — should agree. If they don't, this script
 * tells us what the server actually sees and where the gap is.
 *
 * Run:  npx tsx scripts/diagnose-notifications-count.ts
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const TARGET_EMAIL = 'weightlossprojectionlab@gmail.com'

async function main() {
  const { initializeApp, cert, getApps, getApp } = await import('firebase-admin/app')
  const { getAuth } = await import('firebase-admin/auth')
  const { getFirestore } = await import('firebase-admin/firestore')

  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      })

  const auth = getAuth(app)
  const db = getFirestore(app)

  const user = await auth.getUserByEmail(TARGET_EMAIL)
  console.log(`User: ${user.email} (uid=${user.uid})`)

  // ALL notifications for this user (no filters)
  const all = await db.collection('notifications').where('userId', '==', user.uid).get()
  console.log(`\nTotal notifications for user: ${all.size}`)

  // Breakdown
  let readTrue = 0
  let readFalse = 0
  let readMissing = 0
  let archivedTrue = 0
  let archivedFalse = 0
  let archivedMissing = 0
  for (const doc of all.docs) {
    const d = doc.data()
    if (d.read === true) readTrue++
    else if (d.read === false) readFalse++
    else readMissing++
    if (d.archived === true) archivedTrue++
    else if (d.archived === false) archivedFalse++
    else archivedMissing++
  }
  console.log(`  read=true:        ${readTrue}`)
  console.log(`  read=false:       ${readFalse}`)
  console.log(`  read=missing:     ${readMissing}`)
  console.log(`  archived=true:    ${archivedTrue}`)
  console.log(`  archived=false:   ${archivedFalse}`)
  console.log(`  archived=missing: ${archivedMissing}`)

  // Bell badge predicate: where userId==X, read==false, then JS archived !== true
  const bell = await db.collection('notifications')
    .where('userId', '==', user.uid)
    .where('read', '==', false)
    .get()
  const bellVisible = bell.docs.filter(d => d.data()?.archived !== true)
  console.log(`\nBell badge predicate (read=false, archived!=true): ${bellVisible.length}`)
  console.log(`  (raw size of read=false snapshot: ${bell.size})`)

  // Identical to API logic
  console.log(`\nAPI /api/dashboard/stats predicate (read=false, archived!=true): ${bellVisible.length}`)

  // Diagnose any field-shape oddities
  console.log(`\nSamples of read=false docs (first 10):`)
  let printed = 0
  for (const doc of bell.docs.slice(0, 10)) {
    const d = doc.data()
    console.log(`  ${doc.id.slice(0, 8)}  read=${JSON.stringify(d.read)}  archived=${JSON.stringify(d.archived)}  type=${d.type}  createdAt=${d.createdAt}`)
    printed++
  }
  if (bell.size > printed) console.log(`  …and ${bell.size - printed} more`)
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e)
  process.exit(1)
})
