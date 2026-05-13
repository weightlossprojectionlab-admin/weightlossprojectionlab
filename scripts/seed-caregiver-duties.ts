/**
 * Seed a representative set of household duties for the test caregiver.
 *
 * Reflects the parallel-coordination scenario the user described: a real
 * household has caregivers doing different tasks in parallel — cooking
 * meals, taking out garbage, picking up meds, paying bills, vacuuming,
 * etc. The Today view is the place where each caregiver sees what's
 * queued for them.
 *
 * Idempotent-ish: tags every seeded duty with `_seedTag` so a re-run can
 * delete the old set and write a fresh one. Won't touch duties created
 * by the real app.
 *
 * Usage:
 *   npx tsx scripts/seed-caregiver-duties.ts                  (dry-run)
 *   npx tsx scripts/seed-caregiver-duties.ts --apply           (write)
 *   npx tsx scripts/seed-caregiver-duties.ts --apply --clear   (delete prior seed, then write)
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
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
const auth = getAuth()
const db = getFirestore()

const CAREGIVER_EMAIL = 'percyrice@gmail.com'
// Stable across this Firestore — the existing duties live here too.
const HOUSEHOLD_ID = '29GCzfnQ9GvJ58QQo1DB'
const SEED_TAG = 'shift-view-seed-2026-05-12'

const NOW = Date.now()
const DAY_MS = 86_400_000
function dueIn(hours: number): string {
  return new Date(NOW + hours * 60 * 60 * 1000).toISOString()
}

// Eight duties spanning the parallel-coordination patterns: meals,
// medication, appointments, household chores, errands, finances.
// Mixed urgencies so the Today view exercises overdue / due_now / soon.
const seed = (caregiverUid: string, householdOwnerId: string) => [
  {
    category: 'medication',
    name: 'Pick up medications from pharmacy',
    description: 'Mom and Dad — Walgreens on Main',
    priority: 'high',
    nextDueDate: dueIn(-4), // overdue
  },
  {
    category: 'appointments',
    name: "Schedule Mom's cardiology follow-up",
    description: 'Dr. Patel — last visit was 3 months ago',
    priority: 'medium',
    nextDueDate: dueIn(2), // due today
  },
  {
    category: 'household',
    name: 'Vacuum living room and hallway',
    priority: 'low',
    nextDueDate: dueIn(6), // due today
  },
  {
    category: 'errands',
    name: 'Bring in this week\'s grocery delivery',
    description: 'Instacart drop-off around 4pm',
    priority: 'medium',
    nextDueDate: dueIn(-2), // overdue
  },
  {
    category: 'meals',
    name: 'Help Dad with breakfast',
    description: 'Soft foods only this week — dental work',
    priority: 'high',
    nextDueDate: dueIn(1), // due today
  },
  {
    category: 'finances',
    name: 'Pay this month\'s utility bills',
    priority: 'medium',
    nextDueDate: dueIn(2 * 24), // soon (2 days)
  },
  {
    category: 'household',
    name: 'Take out the trash for pickup tomorrow',
    priority: 'low',
    nextDueDate: dueIn(-6), // overdue
  },
  {
    category: 'meals',
    name: 'Prep Grandma Sue\'s lunch',
    description: 'Diabetic-friendly portion — see her care plan',
    priority: 'medium',
    nextDueDate: dueIn(4), // due today
  },
]

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const clear = args.includes('--clear')

  console.log('Seed: household duties for', CAREGIVER_EMAIL)
  console.log('Mode:', apply ? 'APPLY' : 'DRY RUN', clear ? '+ --clear prior seed' : '')
  console.log('='.repeat(70))

  const caregiver = await auth.getUserByEmail(CAREGIVER_EMAIL)
  const caregiverUid = caregiver.uid
  console.log('Caregiver UID:', caregiverUid)
  console.log('Household:', HOUSEHOLD_ID)

  if (clear && apply) {
    const priorSnap = await db
      .collection('household_duties')
      .where('_seedTag', '==', SEED_TAG)
      .get()
    console.log(`\nClearing ${priorSnap.size} prior-seed duties...`)
    const batch = db.batch()
    priorSnap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
    console.log('Cleared.')
  }

  const docs = seed(caregiverUid, '').map((s, i) => {
    const id = `__seed_${SEED_TAG}_${i + 1}_${Date.now()}`
    const acceptedAt = new Date().toISOString()
    return {
      id,
      data: {
        householdId: HOUSEHOLD_ID,
        userId: caregiverUid, // (account owner of duty creation; using caregiver for the seed test)
        category: s.category,
        name: s.name,
        description: (s as any).description,
        isCustom: true,
        assignedTo: [caregiverUid],
        assignedBy: caregiverUid,
        assignedAt: acceptedAt,
        frequency: 'daily',
        priority: s.priority,
        completionCount: 0,
        skipCount: 0,
        notifyOnCompletion: false,
        notifyOnOverdue: false,
        reminderEnabled: false,
        createdAt: acceptedAt,
        createdBy: caregiverUid,
        lastModified: acceptedAt,
        isActive: true,
        status: 'pending',
        nextDueDate: s.nextDueDate,
        _seedTag: SEED_TAG,
      },
    }
  })

  console.log(`\nWill write ${docs.length} duties:`)
  docs.forEach((d) => {
    const due = new Date(d.data.nextDueDate).getTime() - NOW
    const tag =
      due < 0 ? 'overdue' : due < DAY_MS ? 'due today' : 'soon'
    console.log(`  • [${tag}] ${d.data.name}`)
  })

  if (!apply) {
    console.log('\n(Dry run — pass --apply to write.)')
    return
  }

  const batch = db.batch()
  for (const d of docs) {
    // Strip undefined values — Firestore admin SDK rejects them.
    const clean = Object.fromEntries(
      Object.entries(d.data).filter(([, v]) => v !== undefined),
    )
    batch.set(db.collection('household_duties').doc(d.id), clean)
  }
  await batch.commit()
  console.log(`\nWrote ${docs.length} duties.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
