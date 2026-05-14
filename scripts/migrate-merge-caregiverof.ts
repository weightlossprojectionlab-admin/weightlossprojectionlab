/**
 * Migration: merge duplicate caregiverOf entries by accountOwnerId
 *
 * Walks every users/* document, collapses any caregiverOf entries that share
 * an accountOwnerId into one entry per owner (union of patientsAccess, OR'd
 * permissions). The merge logic comes from lib/caregiver-relationship.ts so
 * this script, the S2 upserts, and the live AccountSwitcher merge all use
 * the same definition.
 *
 * Dry-run by default. Reports per-user before/after counts and a summary.
 * Only updates users where the merge actually changed the array length.
 *
 * Usage:
 *   npx tsx scripts/migrate-merge-caregiverof.ts          (dry run)
 *   npx tsx scripts/migrate-merge-caregiverof.ts --apply  (real write)
 *   npx tsx scripts/migrate-merge-caregiverof.ts --email <addr>   (one user)
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

// Inline copy of the merge logic so this script has no dependency on Next.js
// path aliases. Mirrors lib/caregiver-relationship.ts:mergeCaregiverContexts;
// if you change one, change the other (or refactor to share a path-alias-free
// module).
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
function mergeCaregiverContexts(entries: any[] | undefined | null): any[] {
  if (!entries || entries.length === 0) return []
  const byOwner = new Map<string, any>()
  for (const ctx of entries) {
    if (!ctx?.accountOwnerId) continue
    const existing = byOwner.get(ctx.accountOwnerId)
    if (!existing) {
      byOwner.set(ctx.accountOwnerId, { ...ctx })
      continue
    }
    byOwner.set(ctx.accountOwnerId, {
      ...existing,
      ...ctx,
      patientsAccess: unionArrays(existing.patientsAccess, ctx.patientsAccess),
      permissions: mergePermissions(existing.permissions, ctx.permissions),
    })
  }
  return Array.from(byOwner.values())
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const emailIdx = args.indexOf('--email')
  const targetEmail = emailIdx >= 0 ? args[emailIdx + 1] : null

  console.log(`\nMigrate: merge duplicate caregiverOf entries`)
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Scope: ${targetEmail ? `single user ${targetEmail}` : 'ALL users with caregiverOf'}`)
  console.log('='.repeat(70))

  // Build the candidate set: users with at least one caregiverOf entry.
  let snap
  if (targetEmail) {
    snap = await db.collection('users').where('email', '==', targetEmail).get()
  } else {
    // Fetch all users with non-empty caregiverOf.
    // (Firestore can't query for "array length > 1" directly; we pull all and
    // filter in JS. Acceptable for low user counts; for very large sets,
    // paginate.)
    snap = await db.collection('users').get()
  }

  let scanned = 0
  let candidates = 0
  let willUpdate = 0
  let updated = 0
  const examples: Array<{ uid: string; email?: string; before: number; after: number }> = []

  for (const doc of snap.docs) {
    scanned++
    const data = doc.data()
    const before = (data.caregiverOf || []) as any[]
    if (!Array.isArray(before) || before.length === 0) continue
    candidates++

    const after = mergeCaregiverContexts(before)
    if (after.length === before.length) continue

    willUpdate++
    if (examples.length < 10) {
      examples.push({
        uid: doc.id,
        email: data.email,
        before: before.length,
        after: after.length,
      })
    }

    if (apply) {
      await doc.ref.update({
        caregiverOf: after,
        updatedAt: FieldValue.serverTimestamp(),
      })
      updated++
    }
  }

  console.log(`\nScanned:     ${scanned} users`)
  console.log(`Candidates:  ${candidates} (have caregiverOf entries)`)
  console.log(`Would merge: ${willUpdate} (have duplicates per accountOwnerId)`)
  if (apply) {
    console.log(`Updated:     ${updated}`)
  } else {
    console.log(`Updated:     0 (dry run — pass --apply to write)`)
  }

  if (examples.length > 0) {
    console.log(`\nExamples:`)
    for (const e of examples) {
      console.log(`  ${e.uid}  (${e.email ?? 'no-email'})  ${e.before} → ${e.after}`)
    }
  }
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
