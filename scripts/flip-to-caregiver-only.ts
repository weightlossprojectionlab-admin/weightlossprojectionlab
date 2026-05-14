/**
 * Flip a user from owner (or owner+caregiver) to caregiver-only.
 *
 * Use when: an existing user has a Single User subscription doc AND caregiverOf
 * relationships — i.e., the broken state where the user was supposed to be a
 * caregiver invitee but went through owner onboarding by accident.
 *
 * What this does:
 *   - Sets preferences.userMode = 'caregiver'  (strong signal isCaregiverOnly looks for)
 *   - Sets isAccountOwner = false
 *   - LEAVES the subscription doc in place (orphaned). The Pb UI gate uses
 *     userMode to suppress subscription UI.
 *
 * Safety:
 *   - Refuses to convert a user with zero caregiverOf relationships.
 *   - Dry-run by default. Pass --apply to actually write.
 *
 * Usage:
 *   npx tsx scripts/flip-to-caregiver-only.ts <email>           (dry run)
 *   npx tsx scripts/flip-to-caregiver-only.ts <email> --apply   (real write)
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

// Look for service_account_key.json starting from the script's directory and walking up.
// Works whether script is run from the main checkout or a worktree under .claude/worktrees/.
function findServiceAccountPath(): string {
  let dir = __dirname
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'service_account_key.json')
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('service_account_key.json not found in any parent directory')
}

const serviceAccount = require(findServiceAccountPath())

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function main() {
  const email = process.argv[2]
  const apply = process.argv.includes('--apply')

  if (!email) {
    console.error('Usage: npx tsx scripts/flip-to-caregiver-only.ts <email> [--apply]')
    process.exit(1)
  }

  console.log(`\nFlip user to caregiver-only: ${email}`)
  console.log(`Mode: ${apply ? 'APPLY (real write)' : 'DRY RUN'}`)
  console.log('='.repeat(60))

  const snap = await db
    .collection('users')
    .where('email', '==', email)
    .limit(1)
    .get()

  if (snap.empty) {
    console.error('User not found')
    process.exit(1)
  }

  const doc = snap.docs[0]
  const data = doc.data()

  console.log('\nBEFORE:')
  console.log(`  UID: ${doc.id}`)
  console.log(`  preferences.userMode: ${data.preferences?.userMode ?? '(unset)'}`)
  console.log(`  isAccountOwner: ${data.isAccountOwner ?? '(unset)'}`)
  console.log(`  subscription.plan: ${data.subscription?.plan ?? '(none)'}`)
  console.log(`  caregiverOf count: ${data.caregiverOf?.length ?? 0}`)
  console.log(`  profile.onboardingCompleted: ${data.profile?.onboardingCompleted ?? '(unset)'}`)

  const caregiverCount = data.caregiverOf?.length ?? 0
  if (caregiverCount === 0) {
    console.error('\nABORT: user has 0 caregiverOf relationships. Refusing to convert.')
    process.exit(1)
  }

  console.log('\nPLANNED CHANGES:')
  console.log(`  preferences.userMode  → 'caregiver'`)
  console.log(`  isAccountOwner        → false`)
  console.log(`  (subscription doc kept as orphan; Pb UI gate hides it)`)

  if (!apply) {
    console.log('\nDry run — no changes written. Pass --apply to commit.')
    return
  }

  // Apply update
  await doc.ref.update({
    'preferences.userMode': 'caregiver',
    isAccountOwner: false,
    updatedAt: FieldValue.serverTimestamp(),
  })
  console.log(`Updated users/${doc.id}`)

  // Re-read to confirm
  const verify = await doc.ref.get()
  const v = verify.data() ?? {}
  console.log('\nAFTER:')
  console.log(`  preferences.userMode: ${v.preferences?.userMode}`)
  console.log(`  isAccountOwner: ${v.isAccountOwner}`)
  console.log(`  subscription.plan: ${v.subscription?.plan ?? '(none)'}`)
  console.log(`  caregiverOf count: ${v.caregiverOf?.length ?? 0}`)
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
