/**
 * Prune caregiverOf entries for a given user, removing all entries that point
 * to a specified set of accountOwnerIds.
 *
 * Use when test data leaves stale invites or when an owner was deleted but
 * the caregiver's caregiverOf array still references them. Reads the user
 * doc, filters out matching entries, writes back the trimmed array.
 *
 * Usage:
 *   npx tsx scripts/prune-caregiver-entries.ts <email> <ownerIdToRemove> [...]
 *   npx tsx scripts/prune-caregiver-entries.ts <email> <ownerIds> --apply
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
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
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const positional = args.filter((a) => a !== '--apply')
  const [email, ...ownerIdsToRemove] = positional

  if (!email || ownerIdsToRemove.length === 0) {
    console.error('Usage: npx tsx scripts/prune-caregiver-entries.ts <email> <ownerId> [...ownerIds] [--apply]')
    process.exit(1)
  }

  console.log(`\nPrune caregiverOf for: ${email}`)
  console.log(`Remove entries pointing to: ${ownerIdsToRemove.join(', ')}`)
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)
  console.log('='.repeat(60))

  const snap = await db.collection('users').where('email', '==', email).limit(1).get()
  if (snap.empty) {
    console.error('User not found')
    process.exit(1)
  }
  const doc = snap.docs[0]
  const data = doc.data()
  const before = (data.caregiverOf || []) as Array<Record<string, any>>

  const removeSet = new Set(ownerIdsToRemove)
  const after = before.filter((ctx) => !removeSet.has(ctx.accountOwnerId))

  console.log(`\nBefore: ${before.length} entries`)
  before.forEach((ctx, i) => {
    const willRemove = removeSet.has(ctx.accountOwnerId)
    console.log(`  [${i}] ${ctx.accountOwnerId}  (${ctx.accountOwnerName ?? '?'})  ${willRemove ? '← REMOVE' : ''}`)
  })
  console.log(`\nAfter:  ${after.length} entries`)

  if (!apply) {
    console.log('\nDry run — no changes. Pass --apply to commit.')
    return
  }

  await doc.ref.update({
    caregiverOf: after,
    updatedAt: FieldValue.serverTimestamp(),
  })
  console.log(`\nWrote users/${doc.id} with ${after.length} entries.`)
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
