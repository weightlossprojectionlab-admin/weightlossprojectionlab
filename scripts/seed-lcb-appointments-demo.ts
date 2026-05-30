/**
 * Seed demo data for the little-care-bears white-label dashboard.
 *
 * Creates ONE managed client family with two patients (weight + vitals +
 * meds, so the per-patient charts populate) and FOUR appointments split
 * across both careContexts:
 *   - caregiver-visit  → today → shows in "Today's Schedule"
 *   - member-medical   → upcoming → shows in "Family Appointments"
 *
 * Idempotent: uses fixed doc IDs, so re-running overwrites in place rather
 * than duplicating. Run:
 *   npx tsx scripts/seed-lcb-appointments-demo.ts
 */

import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { adminDb } from '../lib/firebase-admin'

const SLUG = 'little-care-bears'
const CLIENT_UID = 'demo-henderson-lcb'
const PAT_MARGARET = 'pat-margaret-lcb'
const PAT_DIEGO = 'pat-diego-lcb'

// Build an ISO string at a clean time, N days from local midnight today.
function at(daysFromToday: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + daysFromToday)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}
// ISO string N days BEFORE today (for trend history).
function daysAgo(n: number): string {
  const d = new Date()
  d.setHours(9, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

async function main() {
  // 1. Resolve the tenant by slug.
  const tenantSnap = await adminDb.collection('tenants').where('slug', '==', SLUG).limit(1).get()
  if (tenantSnap.empty) {
    console.error(`No tenant with slug "${SLUG}". Aborting.`)
    process.exit(1)
  }
  const tenantId = tenantSnap.docs[0].id
  console.log(`✓ tenant ${SLUG} = ${tenantId}`)

  const nowIso = new Date().toISOString()

  // 1b. Two practice staff (so "Today's Schedule" can group by staff and
  // show coverage). Stored as accepted invitations — the staff-count stat
  // reads this subcollection. staffId on a visit = these doc IDs.
  const STAFF_CARLA = 'staff-carla-lcb'
  const STAFF_DAN = 'staff-dan-lcb'
  const invites = tenantSnap.docs[0].ref.collection('invitations')
  await invites.doc(STAFF_CARLA).set({
    name: 'Nurse Carla', email: 'carla@littlecarebears.test', role: 'franchise_staff',
    status: 'accepted', uid: STAFF_CARLA, invitedAt: daysAgo(60), acceptedAt: daysAgo(59),
    seedSource: 'lcb-appointments-demo',
  })
  await invites.doc(STAFF_DAN).set({
    name: 'Coach Dan', email: 'dan@littlecarebears.test', role: 'franchise_staff',
    status: 'accepted', uid: STAFF_DAN, invitedAt: daysAgo(40), acceptedAt: daysAgo(39),
    seedSource: 'lcb-appointments-demo',
  })
  console.log('✓ 2 staff (Nurse Carla, Coach Dan)')

  // 2. The managed client (family account).
  const userRef = adminDb.collection('users').doc(CLIENT_UID)
  await userRef.set(
    {
      name: 'Henderson Family',
      displayName: 'Henderson Family',
      email: 'henderson.demo@littlecarebears.test',
      phone: '+15555550142',
      managedBy: [tenantId],
      createdAt: daysAgo(120),
      lastActiveAt: nowIso,
      seedSource: 'lcb-appointments-demo',
    },
    { merge: true }
  )
  console.log('✓ client user')

  // 3. Two patients.
  await userRef.collection('patients').doc(PAT_MARGARET).set({
    name: 'Margaret Henderson',
    type: 'human',
    status: 'active',
    relationship: 'mother',
    dateOfBirth: '1948-04-12',
    gender: 'female',
    practiceNotes: 'Monitoring blood pressure and weight after recent med change.',
    seedSource: 'lcb-appointments-demo',
  })
  await userRef.collection('patients').doc(PAT_DIEGO).set({
    name: 'Diego Henderson',
    type: 'human',
    status: 'active',
    relationship: 'son',
    dateOfBirth: '2009-09-01',
    gender: 'male',
    seedSource: 'lcb-appointments-demo',
  })
  console.log('✓ patients')

  // 4. Margaret's trend data — weight (declining), BP, glucose.
  const margaret = userRef.collection('patients').doc(PAT_MARGARET)
  const weights = [183, 182.4, 181.1, 180.6, 179.8, 178.9, 178.2, 177.5]
  await Promise.all(
    weights.map((w, i) =>
      margaret.collection('weight-logs').doc(`w${i}`).set({
        weight: w,
        unit: 'lbs',
        loggedAt: daysAgo((weights.length - 1 - i) * 9),
      })
    )
  )
  const bp = [
    { s: 148, d: 92 }, { s: 145, d: 90 }, { s: 142, d: 88 },
    { s: 139, d: 86 }, { s: 136, d: 84 }, { s: 134, d: 83 },
  ]
  await Promise.all(
    bp.map((r, i) =>
      margaret.collection('vitals').doc(`bp${i}`).set({
        patientId: PAT_MARGARET,
        type: 'blood_pressure',
        value: { systolic: r.s, diastolic: r.d },
        unit: 'mmHg',
        recordedAt: daysAgo((bp.length - 1 - i) * 8),
        takenBy: CLIENT_UID,
        method: 'manual',
        approvalStatus: 'approved',
      })
    )
  )
  const glucose = [142, 138, 135, 130, 128, 124, 121]
  await Promise.all(
    glucose.map((g, i) =>
      margaret.collection('vitals').doc(`bs${i}`).set({
        patientId: PAT_MARGARET,
        type: 'blood_sugar',
        value: g,
        unit: 'mg/dL',
        recordedAt: daysAgo((glucose.length - 1 - i) * 7),
        takenBy: CLIENT_UID,
        method: 'manual',
        approvalStatus: 'approved',
      })
    )
  )
  await margaret.collection('medications').doc('med-lisinopril').set({
    name: 'Lisinopril', dosage: '10 mg', frequency: 'once daily', status: 'active',
  })
  await margaret.collection('medications').doc('med-metformin').set({
    name: 'Metformin', dosage: '500 mg', frequency: 'twice daily', status: 'active',
  })
  console.log('✓ Margaret trends + meds')

  // 5. Appointments — both careContexts.
  const appts = userRef.collection('appointments')

  // caregiver-visit → TODAY → Today's Schedule. Two assigned to different
  // staff (so the admin board groups), one left UNASSIGNED (coverage gap).
  await appts.doc('appt-cv-margaret').set({
    userId: CLIENT_UID,
    patientId: PAT_MARGARET,
    patientName: 'Margaret Henderson',
    careContext: 'caregiver-visit',
    tenantId,
    practiceStaffId: STAFF_CARLA,
    practiceStaffName: 'Nurse Carla',
    type: 'routine-checkup',
    reason: 'Wellness check + BP review',
    location: 'Home visit',
    dateTime: at(0, 9, 0),
    status: 'scheduled',
    requiresDriver: false,
    driverStatus: 'not-needed',
    createdFrom: 'manual',
    createdAt: nowIso,
    createdBy: 'seed',
    updatedAt: nowIso,
  })
  await appts.doc('appt-cv-diego').set({
    userId: CLIENT_UID,
    patientId: PAT_DIEGO,
    patientName: 'Diego Henderson',
    careContext: 'caregiver-visit',
    tenantId,
    practiceStaffId: STAFF_DAN,
    practiceStaffName: 'Coach Dan',
    type: 'follow-up',
    reason: 'Medication review',
    location: 'Home visit',
    dateTime: at(0, 14, 30),
    status: 'scheduled',
    requiresDriver: false,
    driverStatus: 'not-needed',
    createdFrom: 'manual',
    createdAt: nowIso,
    createdBy: 'seed',
    updatedAt: nowIso,
  })
  // Unassigned — no practiceStaffId. Triggers the coverage-gap alert.
  await appts.doc('appt-cv-evening').set({
    userId: CLIENT_UID,
    patientId: PAT_MARGARET,
    patientName: 'Margaret Henderson',
    careContext: 'caregiver-visit',
    tenantId,
    type: 'follow-up',
    reason: 'Evening BP check',
    location: 'Home visit',
    dateTime: at(0, 16, 0),
    status: 'scheduled',
    requiresDriver: false,
    driverStatus: 'not-needed',
    createdFrom: 'manual',
    createdAt: nowIso,
    createdBy: 'seed',
    updatedAt: nowIso,
  })

  // member-medical → upcoming → Family Appointments
  await appts.doc('appt-mm-cardio').set({
    userId: CLIENT_UID,
    patientId: PAT_MARGARET,
    patientName: 'Margaret Henderson',
    careContext: 'member-medical',
    providerName: 'Dr. Patel',
    specialty: 'Cardiology',
    type: 'specialist',
    reason: 'Cardiology follow-up',
    dateTime: at(3, 10, 30),
    status: 'scheduled',
    requiresDriver: true,
    driverStatus: 'pending',
    createdFrom: 'manual',
    createdAt: nowIso,
    createdBy: 'seed',
    updatedAt: nowIso,
  })
  await appts.doc('appt-mm-lab').set({
    userId: CLIENT_UID,
    patientId: PAT_DIEGO,
    patientName: 'Diego Henderson',
    careContext: 'member-medical',
    providerName: 'Quest Diagnostics',
    specialty: 'Lab work',
    type: 'lab',
    reason: 'Routine bloodwork',
    dateTime: at(5, 8, 15),
    status: 'scheduled',
    requiresDriver: false,
    driverStatus: 'not-needed',
    createdFrom: 'manual',
    createdAt: nowIso,
    createdBy: 'seed',
    updatedAt: nowIso,
  })
  console.log('✓ Henderson: 5 appointments (2 assigned + 1 unassigned caregiver-visit today, 2 member-medical upcoming)')

  // 6. Every OTHER managed family gets appointments too, so "Today's
  //    Schedule" aggregates across the whole practice — not just Henderson.
  //    The caregiver-visit goes to Nurse Carla, demonstrating one staffer
  //    covering multiple families. Account-level (patientId null) when the
  //    family has no patient profiles.
  const others = await adminDb
    .collection('users')
    .where('managedBy', 'array-contains', tenantId)
    .get()

  let i = 0
  for (const fam of others.docs) {
    if (fam.id === CLIENT_UID) continue // Henderson handled above
    const f = fam.data() as any
    const famName = f.name || f.displayName || f.email || 'Client'

    // First active patient, if any — else the account holder.
    const patSnap = await fam.ref.collection('patients').where('status', '==', 'active').limit(1).get().catch(() => null)
    const pat = patSnap?.docs?.[0]
    const patientId = pat ? pat.id : null
    const patientName = pat ? (pat.data() as any).name || famName : famName

    const famAppts = fam.ref.collection('appointments')
    // Caregiver-visit today, assigned to Carla, staggered late-morning so it
    // doesn't collide with Henderson's 9:00 visit on Carla's list.
    await famAppts.doc('appt-cv-demo').set({
      userId: fam.id,
      patientId,
      patientName,
      careContext: 'caregiver-visit',
      tenantId,
      practiceStaffId: STAFF_CARLA,
      practiceStaffName: 'Nurse Carla',
      type: 'routine-checkup',
      reason: 'Initial wellness visit',
      location: 'In office',
      dateTime: at(0, 11 + i, 0),
      status: 'scheduled',
      requiresDriver: false,
      driverStatus: 'not-needed',
      createdFrom: 'manual',
      createdAt: nowIso,
      createdBy: 'seed',
      updatedAt: nowIso,
    })
    // Member-medical upcoming, with a ride needed (exercises the coordination chip).
    await famAppts.doc('appt-mm-demo').set({
      userId: fam.id,
      patientId,
      patientName,
      careContext: 'member-medical',
      providerName: 'Dr. Nguyen',
      specialty: 'Primary care',
      type: 'routine-checkup',
      reason: 'Annual physical',
      dateTime: at(4, 9, 30),
      status: 'scheduled',
      requiresDriver: true,
      driverStatus: 'pending',
      createdFrom: 'manual',
      createdAt: nowIso,
      createdBy: 'seed',
      updatedAt: nowIso,
    })
    console.log(`✓ ${famName}: +1 caregiver-visit (Carla, today) +1 member-medical (upcoming)`)
    i++
  }

  console.log('\n✅ Seeded. Hard-reload the little-care-bears dashboard (Ctrl+Shift+R).')
  process.exit(0)
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
