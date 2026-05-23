/**
 * Migration: rename PatientProfile.weightGoal → primaryMotivation and
 * remap enum values across all patient documents.
 *
 * Value mapping:
 *   - 'lose-weight'     → 'weight'           (direction derived from current vs target)
 *   - 'maintain-weight' → 'weight'           (same — direction = stay put)
 *   - 'gain-muscle'     → 'body-composition' (body-comp focus, not strictly weight)
 *   - 'improve-health'  → 'general-health'   (lifestyle / fitness motivation)
 *
 * Why the rename: the old enum conflated weight DIRECTION (lose/maintain/
 * gain) with MOTIVATION (muscle, health). Direction is derivable from
 * `targetWeight` vs `currentWeight`, so storing it explicitly created a
 * dual-source-of-truth that could drift. Motivation is the standalone
 * concern that remains.
 *
 * Idempotent: docs already migrated (new field present, old field absent)
 * are skipped. Safe to re-run.
 *
 * Dry-run by default. Pass --apply to commit changes.
 *
 * Usage:
 *   npx tsx scripts/migrate-weight-goal-to-primary-motivation.ts            (dry-run)
 *   npx tsx scripts/migrate-weight-goal-to-primary-motivation.ts --apply    (commit)
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

import { adminDb } from '../lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

const apply = process.argv.includes('--apply')

const VALUE_MAP: Record<string, 'weight' | 'body-composition' | 'general-health'> = {
  'lose-weight': 'weight',
  'maintain-weight': 'weight',
  'gain-muscle': 'body-composition',
  'improve-health': 'general-health',
}

;(async () => {
  console.log(`\n${apply ? '🔥 APPLY MODE' : '🧪 DRY-RUN MODE'} — scanning patient docs\n`)

  // collectionGroup picks up patients under any user's subcollection.
  const snapshot = await adminDb.collectionGroup('patients').get()

  let scanned = 0
  let needsMigration = 0
  let alreadyMigrated = 0
  let nothingToDo = 0
  let mutated = 0

  for (const doc of snapshot.docs) {
    scanned++
    const data = doc.data() as Record<string, unknown>
    const oldValue = data.weightGoal as string | undefined
    const newValue = data.primaryMotivation as string | undefined

    if (oldValue === undefined && newValue === undefined) {
      nothingToDo++
      continue
    }
    if (oldValue === undefined && newValue !== undefined) {
      alreadyMigrated++
      continue
    }
    // oldValue is defined → migrate (regardless of whether newValue also exists)
    needsMigration++

    const mapped = VALUE_MAP[oldValue!] ?? null
    console.log(`📄 ${doc.ref.path}`)
    console.log(`   weightGoal: ${JSON.stringify(oldValue)} → primaryMotivation: ${JSON.stringify(mapped)}`)

    if (apply) {
      const update: Record<string, unknown> = {
        weightGoal: FieldValue.delete(),
      }
      if (mapped !== null) {
        update.primaryMotivation = mapped
      }
      await doc.ref.update(update)
      mutated++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Scanned:           ${scanned}`)
  console.log(`   Needs migration:   ${needsMigration}`)
  console.log(`   Already migrated:  ${alreadyMigrated}`)
  console.log(`   Nothing to do:     ${nothingToDo}`)
  if (apply) {
    console.log(`   Mutated:           ${mutated}`)
  } else {
    console.log(`   (dry-run — pass --apply to commit)`)
  }
})().catch((err) => {
  console.error('💥 Error:', err)
  process.exit(1)
})
