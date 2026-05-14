/**
 * Migration: merge duplicate familyMembers docs on the owner side
 *
 * Walks each users/{ownerId}/familyMembers collection, groups docs by
 * `userId` (the caregiver's UID), and merges any group of N > 1 into a
 * single keeper doc (oldest by addedAt). patientsAccess gets unioned,
 * permissions get OR'd, and the loser docs are deleted.
 *
 * Also rekeys the patient-level subcollection: each
 * users/{ownerId}/patients/{patientId}/familyMembers/{loserId} that
 * mirrors a loser is merged into the keeper's id and the loser
 * is removed. This keeps the patient-level RBAC consistent with the
 * top-level familyMember doc.
 *
 * Same idempotent semantics as S2's upserts — this script just back-
 * applies the new "one doc per (owner, caregiver)" rule to existing
 * duplicate data.
 *
 * Dry-run by default. --apply commits. --owner <ownerId> targets one owner.
 *
 * Usage:
 *   npx tsx scripts/migrate-merge-owner-familymembers.ts                       (dry-run all)
 *   npx tsx scripts/migrate-merge-owner-familymembers.ts --apply                (apply all)
 *   npx tsx scripts/migrate-merge-owner-familymembers.ts --owner <uid>          (one owner)
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

function unionArrays<T>(a: T[] | undefined | null, b: T[] | undefined | null): T[] {
  return Array.from(new Set([...(a || []), ...(b || [])]))
}
function mergePermissions(a: any, b: any): Record<string, boolean> {
  const out: Record<string, boolean> = { ...(a || {}) }
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = !!(out[k] || v)
  }
  return out
}

function parseAddedAt(value: any): number {
  if (!value) return Number.MAX_SAFE_INTEGER
  if (typeof value === 'string') {
    const ms = Date.parse(value)
    return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms
  }
  if (value?.toMillis) return value.toMillis()
  return Number.MAX_SAFE_INTEGER
}

interface MergeRecord {
  ownerId: string
  caregiverUserId: string
  caregiverEmail?: string
  keeperId: string
  loserIds: string[]
  beforePatientCount: number
  afterPatientCount: number
}

async function mergeForOwner(
  ownerRef: FirebaseFirestore.DocumentReference,
  apply: boolean,
): Promise<MergeRecord[]> {
  const records: MergeRecord[] = []
  const fmSnap = await ownerRef.collection('familyMembers').get()
  if (fmSnap.empty) return records

  // Group by userId (the caregiver's UID).
  const byCaregiver = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>()
  for (const d of fmSnap.docs) {
    const uid = d.data()?.userId
    if (!uid) continue
    if (!byCaregiver.has(uid)) byCaregiver.set(uid, [])
    byCaregiver.get(uid)!.push(d)
  }

  for (const [caregiverUid, group] of byCaregiver) {
    if (group.length < 2) continue
    // Pick keeper: oldest addedAt.
    group.sort((a, b) => parseAddedAt(a.data()?.addedAt) - parseAddedAt(b.data()?.addedAt))
    const keeper = group[0]
    const losers = group.slice(1)

    const keeperData = keeper.data() || {}
    let mergedPatients: string[] = Array.isArray(keeperData.patientsAccess) ? keeperData.patientsAccess : []
    let mergedPerms: Record<string, boolean> = { ...(keeperData.permissions || {}) }

    for (const loser of losers) {
      const ld = loser.data() || {}
      mergedPatients = unionArrays(mergedPatients, ld.patientsAccess || [])
      mergedPerms = mergePermissions(mergedPerms, ld.permissions || {})
    }

    records.push({
      ownerId: ownerRef.id,
      caregiverUserId: caregiverUid,
      caregiverEmail: keeperData.email,
      keeperId: keeper.id,
      loserIds: losers.map((l) => l.id),
      beforePatientCount: (keeperData.patientsAccess || []).length,
      afterPatientCount: mergedPatients.length,
    })

    if (!apply) continue

    // 1. Update keeper with merged data.
    await keeper.ref.update({
      patientsAccess: mergedPatients,
      permissions: mergedPerms,
      lastModified: new Date().toISOString(),
    })

    // 2. For each loser's patientsAccess, ensure the patient-level
    //    familyMembers doc keyed by keeper.id has the merged perms,
    //    then delete any patient-level docs keyed by the loser's id.
    for (const loser of losers) {
      const ld = loser.data() || {}
      const loserPatients: string[] = Array.isArray(ld.patientsAccess) ? ld.patientsAccess : []
      for (const pid of loserPatients) {
        const keeperPatientFmRef = ownerRef
          .collection('patients').doc(pid)
          .collection('familyMembers').doc(keeper.id)
        const loserPatientFmRef = ownerRef
          .collection('patients').doc(pid)
          .collection('familyMembers').doc(loser.id)

        const loserPatientFm = await loserPatientFmRef.get()
        const keeperPatientFm = await keeperPatientFmRef.get()
        const baseData = keeperPatientFm.exists ? keeperPatientFm.data() : (loserPatientFm.exists ? loserPatientFm.data() : null)
        if (baseData) {
          await keeperPatientFmRef.set({
            ...baseData,
            userId: caregiverUid,
            permissions: mergedPerms,
            lastModified: new Date().toISOString(),
          }, { merge: true })
        }
        if (loserPatientFm.exists) {
          await loserPatientFmRef.delete()
        }
      }
      // 3. Delete loser top-level doc.
      await loser.ref.delete()
    }
  }

  return records
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const ownerIdx = args.indexOf('--owner')
  const targetOwner = ownerIdx >= 0 ? args[ownerIdx + 1] : null

  console.log(`\nMigrate: merge duplicate owner-side familyMembers docs`)
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Scope: ${targetOwner ? `owner ${targetOwner}` : 'ALL owners'}`)
  console.log('='.repeat(70))

  const owners: FirebaseFirestore.DocumentReference[] = targetOwner
    ? [db.collection('users').doc(targetOwner)]
    : (await db.collection('users').get()).docs.map((d) => d.ref)

  let totalMerges = 0
  let totalLosersDeleted = 0
  const examples: MergeRecord[] = []
  for (const ownerRef of owners) {
    const records = await mergeForOwner(ownerRef, apply)
    totalMerges += records.length
    totalLosersDeleted += records.reduce((sum, r) => sum + r.loserIds.length, 0)
    if (examples.length < 20) examples.push(...records.slice(0, 20 - examples.length))
  }

  console.log(`\nGroups merged:     ${totalMerges}`)
  console.log(`Loser docs ${apply ? 'deleted' : 'would delete'}:  ${totalLosersDeleted}`)
  if (examples.length > 0) {
    console.log(`\nExamples:`)
    for (const e of examples) {
      console.log(`  owner ${e.ownerId}  caregiver ${e.caregiverUserId}  (${e.caregiverEmail ?? '?'})`)
      console.log(`    keeper: ${e.keeperId}  losers: ${e.loserIds.length} (${e.loserIds.join(', ')})`)
      console.log(`    patients: ${e.beforePatientCount} → ${e.afterPatientCount}`)
    }
  }
  if (!apply) console.log(`\n(Dry run — pass --apply to write.)`)
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
