/**
 * Backfill: reconstruct provider.patientsServed from existing appointments.
 *
 * "Serving N patients" on a ProviderCard reads provider.patientsServed. Until
 * the fix in app/api/appointments/route.ts, only the inline "create new
 * provider" wizard sub-step linked a patient to a provider — scheduling with an
 * EXISTING (selected) provider never did. So providers that were reused across
 * appointments show "Serving 0 patients" despite real history.
 *
 * The forward fix links on every future appointment-create. This script repairs
 * the PAST: for every appointment with a providerId + patientId, it unions that
 * patientId into the provider's patientsServed.
 *
 * Cross-account note: appointments live under the CALLER's uid
 * (users/{callerUid}/appointments) but providers under the OWNER's uid
 * (users/{ownerUid}/providers). A caregiver-scheduled appointment therefore
 * references a provider in a DIFFERENT user's subcollection. We sidestep that by
 * keying on the globally-unique providerId (a UUID): load every provider across
 * all users into one map, then match appointments to it regardless of location.
 *
 * Never REMOVES a patient — a provider that historically served a patient still
 * served them even if the appointment was later deleted (union-only, additive).
 *
 * Dry-run by default. --apply commits.
 *
 * Usage:
 *   npx tsx scripts/backfill-provider-patients-served.ts            (dry run)
 *   npx tsx scripts/backfill-provider-patients-served.ts --apply    (write)
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
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

interface ProviderEntry {
  ref: FirebaseFirestore.DocumentReference
  ownerUid: string
  name: string
  existing: Set<string>
  toAdd: Set<string>
}

async function main() {
  const apply = process.argv.includes('--apply')

  console.log(`\nBackfill: provider.patientsServed from appointments`)
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`)
  console.log('='.repeat(70))

  const usersSnap = await db.collection('users').get()

  // 1) Load every provider across all users, keyed by (globally-unique) id.
  const providers = new Map<string, ProviderEntry>()
  for (const u of usersSnap.docs) {
    const provSnap = await u.ref.collection('providers').get()
    for (const p of provSnap.docs) {
      providers.set(p.id, {
        ref: p.ref,
        ownerUid: u.id,
        name: p.data()?.name || '(unnamed)',
        existing: new Set<string>(
          Array.isArray(p.data()?.patientsServed) ? p.data()!.patientsServed : [],
        ),
        toAdd: new Set<string>(),
      })
    }
  }
  console.log(`Providers found:        ${providers.size}`)

  // 2) Walk every appointment; union patientId into the matching provider.
  let appointmentsScanned = 0
  let appointmentsWithProvider = 0
  let unmatchedProviderRefs = 0
  for (const u of usersSnap.docs) {
    const apptSnap = await u.ref.collection('appointments').get()
    for (const a of apptSnap.docs) {
      appointmentsScanned++
      const data = a.data() || {}
      const providerId = data.providerId
      const patientId = data.patientId
      if (!providerId || !patientId) continue
      appointmentsWithProvider++
      const entry = providers.get(providerId)
      if (!entry) {
        unmatchedProviderRefs++
        continue
      }
      if (!entry.existing.has(patientId)) entry.toAdd.add(patientId)
    }
  }

  console.log(`Appointments scanned:   ${appointmentsScanned}`)
  console.log(`  with providerId:      ${appointmentsWithProvider}`)
  console.log(`  provider not found:   ${unmatchedProviderRefs}`)

  // 3) Report + optionally apply per-provider deltas.
  let providersChanged = 0
  let linksAdded = 0
  for (const [id, entry] of providers) {
    if (entry.toAdd.size === 0) continue
    providersChanged++
    linksAdded += entry.toAdd.size
    const merged = Array.from(new Set([...entry.existing, ...entry.toAdd]))
    console.log(
      `  ${entry.name} (${id.slice(0, 8)}… owner ${entry.ownerUid.slice(0, 8)}…): ` +
        `${entry.existing.size} → ${merged.length} (+${entry.toAdd.size})`,
    )
    if (apply) {
      await entry.ref.update({ patientsServed: merged })
    }
  }

  console.log('='.repeat(70))
  console.log(`Providers to update:    ${providersChanged}`)
  console.log(`Total links to add:     ${linksAdded}`)
  if (!apply) console.log(`\n(Dry run — pass --apply to write.)`)
}

main().catch((e) => {
  console.error('FAILED:', e)
  process.exit(1)
})
