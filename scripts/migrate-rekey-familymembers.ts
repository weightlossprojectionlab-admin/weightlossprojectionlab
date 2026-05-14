/**
 * Re-key familyMembers docs to use the caregiver's uid as the doc ID.
 *
 * Why: firestore.rules `isHouseholdMember` checks
 *   exists(/users/{ownerId}/familyMembers/{request.auth.uid})
 * so the doc id MUST equal the caregiver's uid. Legacy upsertFamilyMember
 * used `.add()` which produces random Firestore IDs, silently breaking
 * caregiver access to household-shared data (shopping_items / stores)
 * at the rule layer.
 *
 * For every owner that has familyMembers, this script:
 *   1. Walks each doc in the subcollection
 *   2. If docId === userId, skip (already correctly keyed)
 *   3. Else: copy data to a new doc keyed by userId
 *      — if a doc keyed by userId ALREADY exists, merge:
 *        unioned patientsAccess + permissions
 *        non-array fields prefer existing-deterministic data
 *      — then delete the random-id doc
 *
 * Idempotent: safe to re-run. Dry-run by default; pass --apply to write.
 *
 * Usage:
 *   npx tsx scripts/migrate-rekey-familymembers.ts             (dry run)
 *   npx tsx scripts/migrate-rekey-familymembers.ts --apply     (write)
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

function unionArrays<T>(a: T[] | undefined | null, b: T[] | undefined | null): T[] {
  return Array.from(new Set([...(a || []), ...(b || [])]))
}

function mergePermissions(
  a: Record<string, boolean> | undefined | null,
  b: Record<string, boolean> | undefined | null,
): Record<string, boolean> {
  const out: Record<string, boolean> = { ...(a || {}) }
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = !!(out[k] || v)
  }
  return out
}

interface ReKey {
  ownerId: string
  oldDocId: string
  newDocId: string
  reason: 'fresh-write' | 'merge-into-existing'
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')

  console.log('Re-key familyMembers docs to userId-keyed doc IDs')
  console.log('Mode:', apply ? 'APPLY' : 'DRY RUN')
  console.log('='.repeat(70))

  const usersSnap = await db.collection('users').get()
  const planned: ReKey[] = []
  const alreadyOk: Array<{ ownerId: string; docId: string }> = []
  const skipped: Array<{ ownerId: string; docId: string; reason: string }> = []

  for (const userDoc of usersSnap.docs) {
    const ownerId = userDoc.id
    const col = userDoc.ref.collection('familyMembers')
    const fmSnap = await col.get()
    if (fmSnap.empty) continue

    for (const fm of fmSnap.docs) {
      const data = fm.data() || {}
      const userIdField: string | undefined = data.userId

      if (!userIdField) {
        skipped.push({ ownerId, docId: fm.id, reason: 'no userId field' })
        continue
      }
      if (fm.id === userIdField) {
        alreadyOk.push({ ownerId, docId: fm.id })
        continue
      }

      // Does a deterministic-id doc already exist for the same caregiver?
      const targetRef = col.doc(userIdField)
      const targetSnap = await targetRef.get()
      const reason: ReKey['reason'] = targetSnap.exists
        ? 'merge-into-existing'
        : 'fresh-write'

      planned.push({ ownerId, oldDocId: fm.id, newDocId: userIdField, reason })
    }
  }

  console.log(`\nAlready correctly keyed:  ${alreadyOk.length}`)
  console.log(`Need re-key:              ${planned.length}`)
  console.log(`Skipped (no userId):      ${skipped.length}`)

  if (planned.length === 0) {
    console.log('\nNothing to do.')
    return
  }

  console.log('\nPlanned moves:')
  for (const p of planned) {
    console.log(`  • [${p.reason}] owner=${p.ownerId.slice(0, 12)}…  ${p.oldDocId.slice(0, 12)}… → ${p.newDocId.slice(0, 12)}…`)
  }

  if (!apply) {
    console.log('\n(Dry run — pass --apply to write.)')
    return
  }

  console.log('\nApplying...')
  let writes = 0
  let deletes = 0
  for (const p of planned) {
    const col = db.collection('users').doc(p.ownerId).collection('familyMembers')
    const oldRef = col.doc(p.oldDocId)
    const newRef = col.doc(p.newDocId)

    const oldSnap = await oldRef.get()
    if (!oldSnap.exists) continue
    const oldData = oldSnap.data() || {}

    if (p.reason === 'fresh-write') {
      await newRef.set({ ...oldData, userId: p.newDocId })
      writes += 1
    } else {
      const targetSnap = await newRef.get()
      const targetData = targetSnap.data() || {}
      const merged = {
        ...targetData,
        ...oldData,
        // Preserve unionable fields by merging both sides.
        patientsAccess: unionArrays(targetData.patientsAccess, oldData.patientsAccess),
        permissions: mergePermissions(targetData.permissions, oldData.permissions),
        // Always retain canonical userId equal to the new doc id.
        userId: p.newDocId,
      }
      await newRef.set(merged, { merge: true })
      writes += 1
    }

    await oldRef.delete()
    deletes += 1
    console.log(`  ✓ ${p.ownerId.slice(0, 12)}…  ${p.oldDocId.slice(0, 12)}… → ${p.newDocId.slice(0, 12)}…`)
  }

  console.log(`\nDone. ${writes} writes, ${deletes} deletes of stale docs.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
