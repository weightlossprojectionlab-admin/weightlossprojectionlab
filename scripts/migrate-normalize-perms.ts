/**
 * Migration: normalize old-schema permission keys to the canonical new schema
 *
 * Walks every place where caregiver permissions live and rewrites entries that
 * use the OLD vocabulary (viewRecords / editRecords / viewMedications / ...)
 * to the NEW canonical schema (viewMedicalRecords / editPatientProfile /
 * logVitals / inviteOthers / ...).
 *
 * The mapping is explicit and conservative: each old key has at most ONE
 * canonical new-key target. Old keys that have no clear new-schema equivalent
 * (viewBilling) are dropped — the API never honored them anyway, so they were
 * dead weight on the entry.
 *
 * Touches three places:
 *   - users/{uid}.caregiverOf[*].permissions          (caregiver side)
 *   - users/{uid}/familyMembers/*.permissions         (owner side)
 *   - users/{uid}/patients/{pid}/familyMembers/*.permissions
 *
 * For each entry: if an old key is true AND the new equivalent is missing or
 * false, set the new key to true. Then remove the old key. No new-schema keys
 * are touched if they are already populated.
 *
 * Dry-run by default. --apply commits. --email <addr> narrows to one caller's
 * caregiverOf array only (does NOT touch the owner-side data for that scope —
 * use --owner <uid> for that).
 *
 * Usage:
 *   npx tsx scripts/migrate-normalize-perms.ts                       (dry run all)
 *   npx tsx scripts/migrate-normalize-perms.ts --apply                (apply all)
 *   npx tsx scripts/migrate-normalize-perms.ts --email <addr>         (one user caregiverOf)
 *   npx tsx scripts/migrate-normalize-perms.ts --owner <ownerId>      (one owner familyMembers)
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

/**
 * Explicit old → new key mapping. Conservative: only keys with a clear
 * semantic equivalent in the canonical schema. Old keys absent from this
 * map (viewBilling) get dropped without being remapped.
 */
const OLD_TO_NEW: Record<string, string> = {
  viewRecords: 'viewMedicalRecords',
  viewMedications: 'viewMedicalRecords',
  viewAppointments: 'viewMedicalRecords',
  viewDocuments: 'viewMedicalRecords',
  editVitals: 'logVitals',
  editRecords: 'editPatientProfile',
  manageFamily: 'inviteOthers',
}

/**
 * Old keys that have no canonical new-schema equivalent. Dropped from
 * entries during migration — the API never honored them either way.
 */
const OLD_KEYS_TO_DROP = new Set<string>(['viewBilling'])

/** Pure transformation: returns null if no change, else new perms object. */
function normalizePerms(perms: any): Record<string, boolean> | null {
  if (!perms || typeof perms !== 'object') return null
  let changed = false
  const out: Record<string, boolean> = {}

  for (const [k, v] of Object.entries(perms)) {
    const oldVal = !!v
    if (k in OLD_TO_NEW) {
      // Remap: if the new key isn't already true, set it from the old value.
      const newKey = OLD_TO_NEW[k]
      const existing = !!out[newKey] || !!perms[newKey]
      if (!existing && oldVal) {
        out[newKey] = true
      } else if (existing) {
        out[newKey] = existing
      }
      // Drop the old key (do not copy to out).
      changed = true
      continue
    }
    if (OLD_KEYS_TO_DROP.has(k)) {
      // Drop, no remap.
      changed = true
      continue
    }
    // Carry through unchanged.
    out[k] = oldVal
  }

  return changed ? out : null
}

async function migrateCaregiverOfFor(userDoc: FirebaseFirestore.QueryDocumentSnapshot, apply: boolean): Promise<{ touched: number; changedEntries: number }> {
  const data = userDoc.data()
  const before = (data.caregiverOf || []) as any[]
  if (!Array.isArray(before) || before.length === 0) return { touched: 0, changedEntries: 0 }

  let entriesChanged = 0
  const after = before.map((ctx) => {
    if (!ctx || typeof ctx !== 'object') return ctx
    const normalized = normalizePerms(ctx.permissions)
    if (normalized === null) return ctx
    entriesChanged++
    return { ...ctx, permissions: normalized }
  })

  if (entriesChanged === 0) return { touched: 0, changedEntries: 0 }

  if (apply) {
    await userDoc.ref.update({
      caregiverOf: after,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
  return { touched: 1, changedEntries: entriesChanged }
}

async function migrateFamilyMembersSubcol(
  ownerRef: FirebaseFirestore.DocumentReference,
  apply: boolean,
): Promise<{ touched: number }> {
  const snap = await ownerRef.collection('familyMembers').get()
  let touched = 0
  for (const doc of snap.docs) {
    const normalized = normalizePerms(doc.data()?.permissions)
    if (normalized === null) continue
    touched++
    if (apply) {
      await doc.ref.update({
        permissions: normalized,
        lastModified: new Date().toISOString(),
      })
    }
  }
  return { touched }
}

async function migratePatientFamilyMembersFor(
  ownerRef: FirebaseFirestore.DocumentReference,
  apply: boolean,
): Promise<{ touched: number }> {
  const patientsSnap = await ownerRef.collection('patients').get()
  let touched = 0
  for (const p of patientsSnap.docs) {
    const fmSnap = await p.ref.collection('familyMembers').get()
    for (const fm of fmSnap.docs) {
      const normalized = normalizePerms(fm.data()?.permissions)
      if (normalized === null) continue
      touched++
      if (apply) {
        await fm.ref.update({
          permissions: normalized,
          lastModified: new Date().toISOString(),
        })
      }
    }
  }
  return { touched }
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const emailIdx = args.indexOf('--email')
  const ownerIdIdx = args.indexOf('--owner')
  const targetEmail = emailIdx >= 0 ? args[emailIdx + 1] : null
  const targetOwnerId = ownerIdIdx >= 0 ? args[ownerIdIdx + 1] : null

  console.log(`\nMigrate: normalize old-schema permission keys → canonical schema`)
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)
  if (targetEmail) console.log(`Scope: caregiverOf for ${targetEmail}`)
  else if (targetOwnerId) console.log(`Scope: familyMembers under owner ${targetOwnerId}`)
  else console.log(`Scope: ALL users + ALL owners`)
  console.log('='.repeat(70))

  let totalCaregiverOfUsersTouched = 0
  let totalCaregiverOfEntriesChanged = 0
  let totalFamilyMembersTouched = 0
  let totalPatientFamilyMembersTouched = 0

  // 1) caregiverOf array on users
  if (targetOwnerId) {
    // skip caregiverOf walk when scoped to an owner
  } else {
    const usersQuery = targetEmail
      ? await db.collection('users').where('email', '==', targetEmail).get()
      : await db.collection('users').get()

    for (const u of usersQuery.docs) {
      const r = await migrateCaregiverOfFor(u, apply)
      totalCaregiverOfUsersTouched += r.touched
      totalCaregiverOfEntriesChanged += r.changedEntries
    }
  }

  // 2) owner-side familyMembers + patient-level familyMembers
  if (targetEmail && !targetOwnerId) {
    // email-only mode does not touch owner-side data
  } else {
    let ownersToWalk: FirebaseFirestore.DocumentReference[]
    if (targetOwnerId) {
      ownersToWalk = [db.collection('users').doc(targetOwnerId)]
    } else {
      const allUsers = await db.collection('users').get()
      ownersToWalk = allUsers.docs.map((d) => d.ref)
    }
    for (const ownerRef of ownersToWalk) {
      const r1 = await migrateFamilyMembersSubcol(ownerRef, apply)
      const r2 = await migratePatientFamilyMembersFor(ownerRef, apply)
      totalFamilyMembersTouched += r1.touched
      totalPatientFamilyMembersTouched += r2.touched
    }
  }

  console.log(`\ncaregiverOf — users with normalization needed:        ${totalCaregiverOfUsersTouched}`)
  console.log(`caregiverOf — total entries changed:                   ${totalCaregiverOfEntriesChanged}`)
  console.log(`familyMembers — docs changed:                          ${totalFamilyMembersTouched}`)
  console.log(`patient familyMembers — docs changed:                  ${totalPatientFamilyMembersTouched}`)
  if (!apply) console.log(`\n(Dry run — pass --apply to write.)`)
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
