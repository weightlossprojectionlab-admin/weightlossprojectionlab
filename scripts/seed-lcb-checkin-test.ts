/**
 * Deterministic seed for the visit check-in HAST.
 *
 * Adds ONE caregiver-visit for the franchise-staff login dated ~now (so it's
 * always inside its "Start trip" window regardless of wall-clock — the demo
 * seed's fixed 11a–5p visits fail before 9am), in a clean 'scheduled' state.
 *
 *   npx tsx scripts/seed-lcb-checkin-test.ts
 *
 * Idempotent (fixed doc id). Run AFTER the demo seed, which resets the other
 * visits so no stale in-progress visit blocks the trip (one trip at a time).
 */

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { adminDb, adminAuth } from '../lib/firebase-admin'

const SLUG = 'little-care-bears'
const CLIENT_UID = 'demo-henderson-lcb'
const APPT_ID = 'appt-checkin-test'

async function main() {
  const staffEmail = process.env.E2E_FRANCHISE_STAFF_EMAIL
  if (!staffEmail) {
    console.error('E2E_FRANCHISE_STAFF_EMAIL not set. Aborting.')
    process.exit(1)
  }
  const staff = await adminAuth.getUserByEmail(staffEmail)

  const tenantSnap = await adminDb.collection('tenants').where('slug', '==', SLUG).limit(1).get()
  if (tenantSnap.empty) {
    console.error(`No tenant with slug "${SLUG}". Aborting.`)
    process.exit(1)
  }
  const tenantId = tenantSnap.docs[0].id

  const nowIso = new Date().toISOString()
  // 10 minutes ago → past its scheduled time → always inside the trip window.
  const dueIso = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  await adminDb
    .collection('users')
    .doc(CLIENT_UID)
    .collection('appointments')
    .doc(APPT_ID)
    .set({
      userId: CLIENT_UID,
      patientId: null,
      patientName: 'Henderson Family',
      careContext: 'caregiver-visit',
      tenantId,
      practiceStaffId: staff.uid,
      practiceStaffName: staff.displayName || 'Staff Member',
      type: 'routine-checkup',
      reason: 'Check-in test visit',
      location: 'Home visit',
      dateTime: dueIso,
      status: 'scheduled',
      // Clean verification state so the lifecycle starts from scratch.
      visitStatus: 'scheduled',
      tripStartedAt: null,
      checkInAt: null,
      checkOutAt: null,
      arrivalConfirmed: false,
      createdFrom: 'seed',
      createdAt: nowIso,
      createdBy: 'seed',
      updatedAt: nowIso,
      seedSource: 'lcb-checkin-test',
    })

  console.log(`✓ check-in test visit ${APPT_ID} @ ${dueIso} → staff ${staff.uid}`)
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
