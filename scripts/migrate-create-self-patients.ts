/**
 * Migration: backfill self-Patient documents for existing users who
 * signed up before the onboarding-Phase-1 self-Patient auto-create
 * landed (2026-05-23).
 *
 * For each user in `users/`:
 *   - Check if a patient exists with `relationship: 'self'` under their
 *     subcollection.
 *   - If not, create a stub patient with the same shape as the
 *     onboarding-time creation: minimum fields + `requiresProfileCompletion: true`.
 *
 * Idempotent: docs that already have a self-Patient are skipped. Safe
 * to re-run.
 *
 * Dry-run by default. Pass --apply to commit.
 *
 * Usage:
 *   npx tsx scripts/migrate-create-self-patients.ts             (dry-run)
 *   npx tsx scripts/migrate-create-self-patients.ts --apply     (commit)
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import { adminDb } from '../lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

const apply = process.argv.includes('--apply')

/**
 * Same fallback logic as `lib/self-patient.ts:deriveDisplayName`,
 * duplicated here to avoid pulling the client-firestore-typed module
 * into an admin-SDK script. Small enough that the duplication is
 * cheaper than the abstraction.
 */
function deriveDisplayName(authDisplayName: string | null | undefined, email: string | null | undefined): string {
  const trimmed = authDisplayName?.trim()
  if (trimmed) return trimmed
  if (!email) return 'Me'
  const local = email.split('@')[0] ?? ''
  if (!local) return 'Me'
  return local
    .split(/[.\-_]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ') || 'Me'
}

;(async () => {
  console.log(`\n${apply ? '🔥 APPLY MODE' : '🧪 DRY-RUN MODE'} — scanning users for missing self-Patients\n`)

  const usersSnapshot = await adminDb.collection('users').get()

  let scanned = 0
  let alreadyHave = 0
  let needsCreate = 0
  let created = 0

  for (const userDoc of usersSnapshot.docs) {
    scanned++
    const userId = userDoc.id
    const userData = userDoc.data() ?? {}

    // Look for existing self-Patient under this user's subcollection.
    const selfQuery = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .where('relationship', '==', 'self')
      .limit(1)
      .get()

    if (!selfQuery.empty) {
      alreadyHave++
      continue
    }

    needsCreate++
    const displayName = deriveDisplayName(
      userData.displayName as string | undefined,
      userData.email as string | undefined
    )

    console.log(`📄 ${userData.email ?? userId}: will create self-Patient ("${displayName}")`)

    if (apply) {
      const patientRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('patients')
        .doc() // auto-generated id
      const now = Timestamp.now()
      await patientRef.set({
        userId,
        name: displayName,
        type: 'human',
        relationship: 'self',
        requiresProfileCompletion: true,
        createdAt: now,
        lastModified: now,
      })
      console.log(`   ✅ created ${patientRef.id}`)
      created++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Users scanned:        ${scanned}`)
  console.log(`   Already have self-Pt: ${alreadyHave}`)
  console.log(`   Needs creation:       ${needsCreate}`)
  if (apply) {
    console.log(`   Created this run:     ${created}`)
  } else {
    console.log(`   (dry-run — pass --apply to commit)`)
  }
})().catch((err) => {
  console.error('💥 Error:', err)
  process.exit(1)
})
