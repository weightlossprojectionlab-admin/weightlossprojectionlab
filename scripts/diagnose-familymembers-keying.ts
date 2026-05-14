/**
 * Diagnose: do familyMembers docs under each owner use the caregiver's
 * uid as the doc ID, or random Firestore IDs?
 *
 * The shopping_items / stores Firestore rules call:
 *   isHouseholdMember(ownerId) →
 *     exists(/users/{ownerId}/familyMembers/{request.auth.uid})
 *
 * That exists() check assumes the DOC ID equals the caller's uid. If the
 * docs are created via .add() with random IDs, the rule denies even when
 * the membership exists (because lookup-by-uid doesn't match).
 *
 * Output: every familyMembers doc found under every owner that has one,
 * with three fields per row:
 *   docId, userId field, match? (docId === userId)
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

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

initializeApp({ credential: cert(require(findServiceAccountPath())) })
const db = getFirestore()

async function main() {
  console.log('Scanning familyMembers subcollections across all users...\n')

  const usersSnap = await db.collection('users').get()
  let totalDocs = 0
  let mismatched = 0
  let matched = 0
  const offenders: Array<{ ownerId: string; docId: string; userId: string }> = []

  for (const userDoc of usersSnap.docs) {
    const ownerId = userDoc.id
    const fmSnap = await userDoc.ref.collection('familyMembers').get()
    if (fmSnap.empty) continue

    console.log(`Owner ${ownerId} — ${fmSnap.size} familyMembers doc(s):`)
    for (const fm of fmSnap.docs) {
      totalDocs += 1
      const docId = fm.id
      const data = fm.data() || {}
      const userIdField = data.userId
      const isMatch = docId === userIdField
      if (isMatch) matched += 1
      else {
        mismatched += 1
        offenders.push({ ownerId, docId, userId: userIdField || '<missing>' })
      }
      console.log(
        `  • docId=${docId.slice(0, 12)}…  userId=${(userIdField || '<missing>').slice(0, 12)}…  match=${isMatch}`,
      )
    }
    console.log()
  }

  console.log('='.repeat(70))
  console.log(`Total familyMembers docs:  ${totalDocs}`)
  console.log(`Doc-id matches userId:     ${matched}  (rule allows)`)
  console.log(`Doc-id is random:          ${mismatched}  (rule DENIES — needs re-key)`)

  if (mismatched > 0) {
    console.log('\nMis-keyed docs (these block the firestore.rules exists() check):')
    for (const o of offenders) {
      console.log(`  • owner=${o.ownerId}  docId=${o.docId}  userIdField=${o.userId}`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
