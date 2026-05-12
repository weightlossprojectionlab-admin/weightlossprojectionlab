/**
 * Migration: remove dangling patientsAccess references
 *
 * Walks every caregiverOf entry and every owner-side familyMembers doc and
 * strips patientsAccess entries whose patient doc no longer exists in
 * /patients. Dangling refs cause the caregiver UI to load a deleted patient
 * and 404 with "Family member not found."
 *
 * Source of truth: patient docs live at users/{ownerId}/patients/{patientId}
 * (nested under the owning user). NOT at the root /patients collection.
 *
 * Dry-run by default. --apply commits. --email <addr> targets one caregiver.
 *
 * Usage:
 *   npx tsx scripts/migrate-clean-dangling-patients.ts                  (dry-run all)
 *   npx tsx scripts/migrate-clean-dangling-patients.ts --apply           (apply all)
 *   npx tsx scripts/migrate-clean-dangling-patients.ts --email <addr>    (one caregiver)
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

/** In-memory cache keyed by `${ownerId}:${patientId}` → exists. */
const existsCache = new Map<string, boolean>()
async function patientExists(ownerId: string, patientId: string): Promise<boolean> {
  const key = `${ownerId}:${patientId}`
  if (existsCache.has(key)) return existsCache.get(key)!
  const snap = await db
    .collection('users')
    .doc(ownerId)
    .collection('patients')
    .doc(patientId)
    .get()
  const exists = snap.exists
  existsCache.set(key, exists)
  return exists
}

interface ChangeRecord {
  uid: string
  email?: string
  entryIdx?: number
  collection: 'caregiverOf' | 'familyMembers'
  before: string[]
  after: string[]
  dropped: string[]
}

async function cleanCaregiverOf(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
  apply: boolean,
): Promise<ChangeRecord[]> {
  const data = doc.data() || {}
  const before = (data.caregiverOf || []) as any[]
  if (!Array.isArray(before) || before.length === 0) return []

  let arrayChanged = false
  const records: ChangeRecord[] = []
  const after = await Promise.all(
    before.map(async (ctx, idx) => {
      if (!ctx || !Array.isArray(ctx.patientsAccess)) return ctx
      const ids: string[] = ctx.patientsAccess
      const surviving: string[] = []
      const dropped: string[] = []
      const ownerId: string | undefined = ctx.accountOwnerId
      if (!ownerId) return ctx // can't check existence without an owner
      for (const pid of ids) {
        if (await patientExists(ownerId, pid)) surviving.push(pid)
        else dropped.push(pid)
      }
      if (dropped.length === 0) return ctx
      arrayChanged = true
      records.push({
        uid: doc.id,
        email: data.email,
        entryIdx: idx,
        collection: 'caregiverOf',
        before: ids,
        after: surviving,
        dropped,
      })
      return { ...ctx, patientsAccess: surviving }
    }),
  )

  if (arrayChanged && apply) {
    await doc.ref.update({
      caregiverOf: after,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
  return records
}

async function cleanOwnerFamilyMembers(
  ownerRef: FirebaseFirestore.DocumentReference,
  apply: boolean,
): Promise<ChangeRecord[]> {
  const fmSnap = await ownerRef.collection('familyMembers').get()
  const records: ChangeRecord[] = []
  const ownerId = ownerRef.id

  for (const fm of fmSnap.docs) {
    const fmData = fm.data() || {}
    const ids: string[] = Array.isArray(fmData.patientsAccess) ? fmData.patientsAccess : []
    if (ids.length === 0) continue

    const surviving: string[] = []
    const dropped: string[] = []
    for (const pid of ids) {
      if (await patientExists(ownerId, pid)) surviving.push(pid)
      else dropped.push(pid)
    }
    if (dropped.length === 0) continue

    records.push({
      uid: fm.id,
      email: fmData.email,
      collection: 'familyMembers',
      before: ids,
      after: surviving,
      dropped,
    })

    if (apply) {
      await fm.ref.update({
        patientsAccess: surviving,
        lastModified: new Date().toISOString(),
      })
    }
  }
  return records
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const emailIdx = args.indexOf('--email')
  const targetEmail = emailIdx >= 0 ? args[emailIdx + 1] : null

  console.log(`\nMigrate: remove dangling patientsAccess refs`)
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Scope: ${targetEmail ? `caregiverOf for ${targetEmail}` : 'ALL caregiverOf + ALL owner familyMembers'}`)
  console.log('='.repeat(70))

  const records: ChangeRecord[] = []

  // 1) caregiverOf walk
  const usersQuery = targetEmail
    ? await db.collection('users').where('email', '==', targetEmail).get()
    : await db.collection('users').get()
  for (const u of usersQuery.docs) {
    records.push(...(await cleanCaregiverOf(u, apply)))
  }

  // 2) owner-side familyMembers walk (skip if email-targeted)
  if (!targetEmail) {
    const allUsers = await db.collection('users').get()
    for (const u of allUsers.docs) {
      records.push(...(await cleanOwnerFamilyMembers(u.ref, apply)))
    }
  }

  console.log(`\nRecords with dangling refs: ${records.length}`)
  for (const r of records.slice(0, 30)) {
    console.log(`  ${r.collection}  ${r.uid}${r.entryIdx !== undefined ? ` [${r.entryIdx}]` : ''}  (${r.email ?? '?'})`)
    console.log(`    before: ${r.before.length}  →  after: ${r.after.length}`)
    console.log(`    dropped: ${r.dropped.join(', ')}`)
  }
  if (records.length > 30) console.log(`  …and ${records.length - 30} more`)

  if (!apply) console.log(`\n(Dry run — pass --apply to write.)`)
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
