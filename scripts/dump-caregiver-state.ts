/**
 * Dump a user's caregiver state.
 *
 * For a given user (by email), prints:
 *   - their own caregiverOf array (raw)
 *   - for each accountOwnerId, the owner's user doc fields used for display
 *
 * Read-only. Use when the AccountSwitcher / shift view shows weird names
 * to find out which owner doc is missing data and whether caregiverOf has
 * duplicates.
 *
 * Usage:
 *   npx tsx scripts/dump-caregiver-state.ts <email>
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

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: npx tsx scripts/dump-caregiver-state.ts <email>')
    process.exit(1)
  }

  const snap = await db.collection('users').where('email', '==', email).limit(1).get()
  if (snap.empty) {
    console.error('User not found')
    process.exit(1)
  }

  const doc = snap.docs[0]
  const data = doc.data()

  console.log(`\nCaller: ${email}  (UID: ${doc.id})\n${'='.repeat(60)}`)
  console.log(`name: ${data.name ?? '(unset)'}`)
  console.log(`preferences.userMode: ${data.preferences?.userMode ?? '(unset)'}`)
  console.log(`isAccountOwner: ${data.isAccountOwner ?? '(unset)'}`)

  const caregiverOf = (data.caregiverOf || []) as Array<Record<string, any>>
  console.log(`\ncaregiverOf entries: ${caregiverOf.length}`)
  caregiverOf.forEach((ctx, i) => {
    console.log(`\n  [${i}]`)
    console.log(`    accountOwnerId:   ${ctx.accountOwnerId}`)
    console.log(`    accountOwnerName: ${ctx.accountOwnerName ?? '(unset)'}`)
    console.log(`    role:             ${ctx.role ?? '(unset)'}`)
    console.log(`    patientsAccess:   ${JSON.stringify(ctx.patientsAccess) ?? '(unset)'}`)
    console.log(`    permissions:      ${JSON.stringify(ctx.permissions, null, 6) ?? '(unset)'}`)
    console.log(`    keys:             ${Object.keys(ctx).join(', ')}`)
  })

  // Dedup the IDs and dump each owner's relevant fields
  const uniqueOwnerIds = Array.from(new Set(caregiverOf.map((c) => c.accountOwnerId)))
  console.log(`\n${'='.repeat(60)}\nUnique owner IDs: ${uniqueOwnerIds.length}\n`)

  for (const ownerId of uniqueOwnerIds) {
    const ownerSnap = await db.collection('users').doc(ownerId).get()
    if (!ownerSnap.exists) {
      console.log(`Owner ${ownerId}: DOC NOT FOUND`)
      continue
    }
    const od = ownerSnap.data() || {}
    console.log(`Owner ${ownerId}:`)
    console.log(`  name:        ${od.name ?? '(unset)'}`)
    console.log(`  displayName: ${od.displayName ?? '(unset)'}`)
    console.log(`  firstName:   ${od.firstName ?? '(unset)'}`)
    console.log(`  lastName:    ${od.lastName ?? '(unset)'}`)
    console.log(`  email:       ${od.email ?? '(unset)'}`)
    console.log()
  }
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
