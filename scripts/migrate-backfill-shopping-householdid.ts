/**
 * Backfill `householdId = userId` on every shopping_items doc that has
 * userId set but householdId unset.
 *
 * Why: caregiver-context queries on the client SDK can't filter by
 * `userId == ownerId` because Firestore's static query analyzer rejects
 * rules that combine `resource.data.userId == request.auth.uid` (false
 * when caller is the caregiver) with cross-doc reads. Filtering by
 * `householdId == ownerId` works because that rule branch matches the
 * query's filter field. Backfilling householdId lets both owner and
 * caregiver flows use the same `where('householdId', '==', X)` query.
 *
 * The ShoppingItem schema documents `userId` as "represents household
 * owner" (types/shopping.ts:167), so `householdId = userId` is the
 * semantically-equivalent backfill — not a guess.
 *
 * Idempotent: only touches docs where userId is set AND householdId is
 * unset. Safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/migrate-backfill-shopping-householdid.ts           (dry run)
 *   npx tsx scripts/migrate-backfill-shopping-householdid.ts --apply   (write)
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

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')

  console.log('Backfill shopping_items.householdId = userId where unset')
  console.log('Mode:', apply ? 'APPLY' : 'DRY RUN')
  console.log('='.repeat(70))

  const all = await db.collection('shopping_items').get()
  console.log(`Total shopping_items: ${all.size}`)

  type Plan = { id: string; userId: string }
  const planned: Plan[] = []
  const alreadyOk = { withHouseholdId: 0, ownerSelfMatches: 0 }
  let noUserId = 0

  for (const d of all.docs) {
    const data = d.data() || {}
    const userId: string | undefined = data.userId
    const householdId: string | undefined = data.householdId

    if (!userId) {
      noUserId += 1
      continue
    }
    if (householdId) {
      alreadyOk.withHouseholdId += 1
      if (householdId === userId) alreadyOk.ownerSelfMatches += 1
      continue
    }
    planned.push({ id: d.id, userId })
  }

  console.log(`\nAlready has householdId:           ${alreadyOk.withHouseholdId}`)
  console.log(`  ...with householdId == userId:    ${alreadyOk.ownerSelfMatches}`)
  console.log(`Needs backfill (userId set, no hh): ${planned.length}`)
  console.log(`Skipped (no userId at all):         ${noUserId}`)

  // Bucket by owner uid so we can see who's affected
  const byOwner = new Map<string, number>()
  for (const p of planned) {
    byOwner.set(p.userId, (byOwner.get(p.userId) || 0) + 1)
  }
  if (byOwner.size > 0) {
    console.log('\nBackfill by owner:')
    for (const [uid, count] of Array.from(byOwner.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`  • ${uid}  → ${count} items`)
    }
  }

  if (planned.length === 0) {
    console.log('\nNothing to do.')
    return
  }

  if (!apply) {
    console.log('\n(Dry run — pass --apply to write.)')
    return
  }

  console.log('\nApplying in batches of 400...')
  let written = 0
  for (let i = 0; i < planned.length; i += 400) {
    const slice = planned.slice(i, i + 400)
    const batch = db.batch()
    for (const p of slice) {
      batch.update(db.collection('shopping_items').doc(p.id), {
        householdId: p.userId,
      })
    }
    await batch.commit()
    written += slice.length
    console.log(`  ...committed ${written}/${planned.length}`)
  }
  console.log(`\nDone. ${written} docs backfilled.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
