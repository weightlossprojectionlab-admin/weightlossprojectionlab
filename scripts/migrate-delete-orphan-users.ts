/**
 * Migration: delete orphan Firestore user docs (Firestore-only, no Auth user)
 *
 * An orphan is a users/{uid} doc whose Firebase Auth record does not exist
 * — typically a leftover from a deleted account or a migration that ran
 * Firestore writes without an Auth user. The doc is unreachable (no one
 * can log in to it), so it adds nothing but noise.
 *
 * Walks every users/* doc, calls adminAuth.getUser(uid), and flags any
 * 'auth/user-not-found' as orphan. Reports each orphan with its email/name
 * + the list of subcollection names that would be ORPHANED after the
 * top-level doc is deleted (this script does NOT recurse — that's a
 * separate decision).
 *
 * Dry-run by default. --apply commits. --uid <uid> targets one doc.
 * --recursive uses Firestore.recursiveDelete so subcollections die with
 * the parent (otherwise top-level-only delete leaves them as orphan data).
 *
 * Usage:
 *   npx tsx scripts/migrate-delete-orphan-users.ts                            (dry-run all)
 *   npx tsx scripts/migrate-delete-orphan-users.ts --apply                     (delete all, top-level only)
 *   npx tsx scripts/migrate-delete-orphan-users.ts --apply --recursive         (delete all + subcollections)
 *   npx tsx scripts/migrate-delete-orphan-users.ts --uid <uid> --apply --recursive
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
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
const auth = getAuth()

interface OrphanInfo {
  uid: string
  email?: string
  name?: string
  keyCount: number
  subcollections: string[]
}

async function describeOrphan(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Promise<OrphanInfo> {
  const data = doc.data() || {}
  const subs = await doc.ref.listCollections()
  return {
    uid: doc.id,
    email: data.email,
    name: data.name || data.displayName,
    keyCount: Object.keys(data).length,
    subcollections: subs.map((c) => c.id),
  }
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const recursive = args.includes('--recursive')
  const uidIdx = args.indexOf('--uid')
  const targetUid = uidIdx >= 0 ? args[uidIdx + 1] : null

  console.log(`\nMigrate: delete orphan Firestore user docs`)
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Cascade: ${recursive ? 'RECURSIVE (subcollections too)' : 'top-level only'}`)
  console.log(`Scope: ${targetUid ? `single uid ${targetUid}` : 'ALL users'}`)
  console.log('='.repeat(70))

  let snap
  if (targetUid) {
    const doc = await db.collection('users').doc(targetUid).get()
    if (!doc.exists) {
      console.log(`Doc ${targetUid} does not exist; nothing to do.`)
      return
    }
    snap = { docs: [doc as any] }
  } else {
    snap = await db.collection('users').get()
  }

  let scanned = 0
  let orphans: OrphanInfo[] = []

  for (const doc of snap.docs) {
    scanned++
    try {
      await auth.getUser(doc.id)
      // Auth record exists — not orphan.
    } catch (err: any) {
      if (err?.code !== 'auth/user-not-found') {
        // Some other auth error — log and skip rather than treat as orphan.
        console.error(`  ${doc.id}: auth check failed (${err?.code || err?.message}) — skipping`)
        continue
      }
      orphans.push(await describeOrphan(doc))
    }
  }

  console.log(`\nScanned:  ${scanned} users`)
  console.log(`Orphans:  ${orphans.length}\n`)

  for (const o of orphans) {
    console.log(`  ${o.uid}`)
    console.log(`    name:           ${o.name ?? '(unset)'}`)
    console.log(`    email:          ${o.email ?? '(unset)'}`)
    console.log(`    keys:           ${o.keyCount} top-level fields`)
    console.log(`    subcollections: ${o.subcollections.length ? o.subcollections.join(', ') : '(none)'}`)
    if (o.subcollections.length > 0 && !recursive) {
      console.log(`    WARNING:        subcollections will be ORPHANED — pass --recursive to delete them too.`)
    }
    console.log()
  }

  if (!apply) {
    console.log(`(Dry run — pass --apply to delete.)`)
    return
  }

  let deleted = 0
  for (const o of orphans) {
    const ref = db.collection('users').doc(o.uid)
    if (recursive) {
      // recursiveDelete handles document + all subcollections; lives on
      // the Firestore instance, not on DocumentReference.
      await db.recursiveDelete(ref)
    } else {
      await ref.delete()
    }
    deleted++
  }
  console.log(`Deleted ${deleted} orphan user docs${recursive ? ' (recursive)' : ''}.`)
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
