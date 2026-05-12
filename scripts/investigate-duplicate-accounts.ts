/**
 * Investigate duplicate-account hypothesis for a given email.
 *
 * Checks:
 *   1. All Firebase Auth records matching the email (or whose email is unset
 *      but linked to providers using this email).
 *   2. All Firestore user docs with this email.
 *   3. A specific user doc by UID (for the suspected "duplicate" account).
 *   4. Optional: a specific patient doc — who owns it?
 *
 * Usage:
 *   npx tsx scripts/investigate-duplicate-accounts.ts <email> [suspectUid] [patientId]
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
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
const auth = getAuth()

async function main() {
  const [email, suspectUid, patientId] = process.argv.slice(2)
  if (!email) {
    console.error('Usage: npx tsx scripts/investigate-duplicate-accounts.ts <email> [suspectUid] [patientId]')
    process.exit(1)
  }

  console.log(`\nInvestigating: ${email}\n${'='.repeat(70)}\n`)

  // 1. Firestore user docs matching email
  console.log('--- Firestore user docs with email field === email ---')
  const docsByEmail = await db.collection('users').where('email', '==', email).get()
  if (docsByEmail.empty) {
    console.log('(none)')
  } else {
    docsByEmail.docs.forEach((d) => {
      const x = d.data()
      console.log(`  ${d.id}`)
      console.log(`    name: ${x.name ?? '(unset)'}`)
      console.log(`    email: ${x.email ?? '(unset)'}`)
      console.log(`    createdAt: ${x.createdAt?.toDate?.()?.toISOString() ?? x.createdAt ?? '(unset)'}`)
    })
  }

  // 2. Firebase Auth records with this email
  console.log('\n--- Firebase Auth records by email ---')
  try {
    const authUser = await auth.getUserByEmail(email)
    console.log(`  UID: ${authUser.uid}`)
    console.log(`  email: ${authUser.email}`)
    console.log(`  emailVerified: ${authUser.emailVerified}`)
    console.log(`  displayName: ${authUser.displayName ?? '(unset)'}`)
    console.log(`  providers: ${authUser.providerData.map((p) => p.providerId).join(', ') || '(none)'}`)
    console.log(`  createdAt: ${authUser.metadata.creationTime}`)
    console.log(`  lastSignIn: ${authUser.metadata.lastSignInTime}`)
  } catch (e: any) {
    console.log(`  (none — ${e.code || e.message})`)
  }

  // 3. Suspect UID — dump auth + firestore for the "other" account
  if (suspectUid) {
    console.log(`\n--- Suspect UID: ${suspectUid} ---`)
    try {
      const authUser = await auth.getUser(suspectUid)
      console.log(`  Auth:`)
      console.log(`    email: ${authUser.email ?? '(unset)'}`)
      console.log(`    emailVerified: ${authUser.emailVerified}`)
      console.log(`    displayName: ${authUser.displayName ?? '(unset)'}`)
      console.log(`    providers: ${authUser.providerData.map((p) => `${p.providerId}(${p.email ?? 'no-email'})`).join(', ') || '(none)'}`)
      console.log(`    disabled: ${authUser.disabled}`)
      console.log(`    createdAt: ${authUser.metadata.creationTime}`)
    } catch (e: any) {
      console.log(`  Auth: (not found — ${e.code || e.message})`)
    }
    try {
      const doc = await db.collection('users').doc(suspectUid).get()
      if (!doc.exists) {
        console.log(`  Firestore: (no user doc)`)
      } else {
        const x = doc.data() || {}
        console.log(`  Firestore:`)
        console.log(`    keys: ${Object.keys(x).join(', ')}`)
        console.log(`    name: ${x.name ?? '(unset)'}`)
        console.log(`    email: ${x.email ?? '(unset)'}`)
        console.log(`    profile.onboardingCompleted: ${x.profile?.onboardingCompleted ?? '(unset)'}`)
        console.log(`    createdAt: ${x.createdAt?.toDate?.()?.toISOString() ?? x.createdAt ?? '(unset)'}`)
      }
    } catch (e: any) {
      console.log(`  Firestore: error — ${e.message}`)
    }
  }

  // 4. Patient doc lookup
  if (patientId) {
    console.log(`\n--- Patient: ${patientId} ---`)
    const pdoc = await db.collection('patients').doc(patientId).get()
    if (!pdoc.exists) {
      console.log('  (patient doc not found in patients collection)')
    } else {
      const x = pdoc.data() || {}
      console.log(`  name: ${x.name ?? '(unset)'}`)
      console.log(`  userId: ${x.userId ?? '(unset)'}`)
      console.log(`  ownerId: ${x.ownerId ?? '(unset)'}`)
      console.log(`  createdAt: ${x.createdAt?.toDate?.()?.toISOString() ?? x.createdAt ?? '(unset)'}`)
      console.log(`  keys: ${Object.keys(x).join(', ')}`)
    }
  }
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
