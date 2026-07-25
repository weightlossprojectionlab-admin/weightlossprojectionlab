/**
 * Backfill structured dosage onto existing medications.
 *
 * For every medication in every patient, parse the legacy prose `frequency` and,
 * ONLY when the parse is high-confidence AND maps to a canonical ScheduleFrequency,
 * write `frequencyCode` (+ `sig` from the prose). Everything else — 'low',
 * 'ambiguous' (a bare "2"), 'none', or a value with no exact code — is left
 * untouched and reported, so it surfaces in the "Needs dosage info" UI for a human
 * to resolve. Auto-committing anything less than high confidence would re-introduce
 * the exact fabrication this whole change removed, just silently and at scale.
 *
 * DRY-RUN BY DEFAULT. Pass --apply to write. Reads FIREBASE_ADMIN_* from .env.local.
 *
 *   npx tsx scripts/backfill-medication-dosage.ts          # preview only
 *   npx tsx scripts/backfill-medication-dosage.ts --apply  # write high-confidence
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import { describeDosage, frequencyCodeForDosesPerDay } from '../lib/medication-dosage'

dotenv.config({ path: '.env.local' })

const APPLY = process.argv.includes('--apply')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}
const db = admin.firestore()

interface Row {
  path: string
  name: string
  frequency: string | undefined
  confidence: string
  code: string | null
  action: 'migrate' | 'already-structured' | 'no-frequency' | 'needs-review'
}

async function main() {
  console.log(`\n=== Medication dosage backfill — ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'} ===\n`)

  // collectionGroup catches medications under any user/patient nesting.
  const meds = await db.collectionGroup('medications').get()
  const rows: Row[] = []
  const counts = {
    total: meds.size,
    migrate: 0,
    alreadyStructured: 0,
    noFrequency: 0,
    needsReview: 0,
  }
  const batch = db.batch()
  let batched = 0

  for (const doc of meds.docs) {
    const m: any = doc.data()
    const name = m.name || '(unnamed)'
    let row: Row

    if (m.frequencyCode) {
      counts.alreadyStructured++
      row = { path: doc.ref.path, name, frequency: m.frequency, confidence: 'n/a', code: m.frequencyCode, action: 'already-structured' }
    } else if (!m.frequency || String(m.frequency).trim() === '') {
      counts.noFrequency++
      row = { path: doc.ref.path, name, frequency: m.frequency, confidence: 'none', code: null, action: 'no-frequency' }
    } else {
      const parsed = describeDosage({ sig: m.sig, frequency: m.frequency })
      const code = parsed.confidence === 'high' ? frequencyCodeForDosesPerDay(parsed.dosesPerDay) : null
      if (code) {
        counts.migrate++
        row = { path: doc.ref.path, name, frequency: m.frequency, confidence: parsed.confidence, code, action: 'migrate' }
        if (APPLY) {
          batch.update(doc.ref, { frequencyCode: code, sig: m.sig ?? m.frequency })
          if (++batched >= 400) { await batch.commit(); batched = 0 }
        }
      } else {
        counts.needsReview++
        row = { path: doc.ref.path, name, frequency: m.frequency, confidence: parsed.confidence, code: null, action: 'needs-review' }
      }
    }
    rows.push(row)
  }

  if (APPLY && batched > 0) await batch.commit()

  // Summary
  console.log('Counts:')
  console.log(`  total medications      : ${counts.total}`)
  console.log(`  -> migrate (high conf) : ${counts.migrate}${APPLY ? ' (written)' : ' (would write)'}`)
  console.log(`  already structured     : ${counts.alreadyStructured}`)
  console.log(`  no frequency recorded  : ${counts.noFrequency}`)
  console.log(`  NEEDS REVIEW (tail)    : ${counts.needsReview}  <- surfaced in the "Needs dosage info" UI\n`)

  const show = (action: Row['action']) => rows.filter(r => r.action === action)
  if (show('migrate').length) {
    console.log(`Migrating (high-confidence prose -> frequencyCode):`)
    for (const r of show('migrate')) console.log(`  "${r.frequency}" -> ${r.code}   ${r.name}`)
    console.log()
  }
  if (show('needs-review').length) {
    console.log(`Needs review (left untouched — ambiguous / unparseable / non-canonical):`)
    for (const r of show('needs-review')) console.log(`  "${r.frequency}" [${r.confidence}]   ${r.name}`)
    console.log()
  }

  if (!APPLY) console.log('DRY RUN — nothing written. Re-run with --apply to migrate the high-confidence rows.\n')
  process.exit(0)
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
