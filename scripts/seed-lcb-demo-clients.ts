/**
 * Seed demo managed clients (with realistic health telemetry) for
 * little-care-bears so the CRM client roster (/dashboard/families) has data to
 * exercise search / filter / sort AND the snapshot cards show real telemetry.
 *
 * Per client: a user doc (managedBy = little-care-bears) + a primary human
 * patient with meal-logs / weight-logs / vitals / active medications, matching
 * exactly what loadHealthSnapshot reads. Timestamps track each client's
 * activity: the 3 active clients logged recently (<30d), the 3 inactive ones
 * went quiet 45/80/120 days ago — so the roster's Active/Inactive split and the
 * "going quiet" triage story are tangible.
 *
 * Run:    npx tsx scripts/seed-lcb-demo-clients.ts
 * Delete: npx tsx scripts/seed-lcb-demo-clients.ts --delete   (recursive)
 */
import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\n/g, '\n'),
  })})
}
const db = admin.firestore()
const SLUG = 'little-care-bears'
const DELETE = process.argv.includes('--delete')
const DAY = 24 * 60 * 60 * 1000

interface DemoClient {
  id: string; name: string; email: string
  activeDaysAgo: number; joinedDaysAgo: number
  // Primary care recipient — carries the health telemetry (detail view + stats).
  member: string; meal: string; weight: number; vital: string; meds: string[]
  // Additional care recipients in the household (name-only patients) so the
  // roster card's "N care recipients" rollup is real.
  extraMembers: string[]
}

const clients: DemoClient[] = [
  { id: 'demo-lcb-client-1', name: 'The Okafor Family',    email: 'okafor@demo.lcb',    activeDaysAgo: 1,   joinedDaysAgo: 120, member: 'Ada Okafor',      meal: 'Grilled salmon & greens', weight: 168, vital: 'blood_pressure', meds: ['Lisinopril', 'Metformin'],          extraMembers: ['Kwame Okafor'] },
  { id: 'demo-lcb-client-2', name: 'The Delgado Family',   email: 'delgado@demo.lcb',   activeDaysAgo: 5,   joinedDaysAgo: 90,  member: 'Rosa Delgado',    meal: 'Oatmeal with berries',    weight: 192, vital: 'glucose',        meds: ['Atorvastatin', 'Metformin', 'Aspirin'], extraMembers: ['Miguel Delgado', 'Sofia Delgado'] },
  { id: 'demo-lcb-client-3', name: 'The Nguyen Household', email: 'nguyen@demo.lcb',    activeDaysAgo: 14,  joinedDaysAgo: 210, member: 'Minh Nguyen',     meal: 'Chicken pho',             weight: 145, vital: 'heart_rate',     meds: ['Amlodipine'],                       extraMembers: [] },
  { id: 'demo-lcb-client-4', name: 'The Rosenberg Family', email: 'rosenberg@demo.lcb', activeDaysAgo: 45,  joinedDaysAgo: 60,  member: 'Saul Rosenberg',  meal: 'Turkey sandwich',         weight: 210, vital: 'blood_pressure', meds: ['Lisinopril', 'Warfarin'],           extraMembers: ['Ruth Rosenberg'] },
  { id: 'demo-lcb-client-5', name: 'The Whitfield Family', email: 'whitfield@demo.lcb', activeDaysAgo: 80,  joinedDaysAgo: 300, member: 'Grace Whitfield', meal: 'Vegetable stir-fry',      weight: 158, vital: 'glucose',        meds: ['Levothyroxine'],                    extraMembers: [] },
  { id: 'demo-lcb-client-6', name: 'The Abara Family',     email: 'abara@demo.lcb',     activeDaysAgo: 120, joinedDaysAgo: 20,  member: 'Chidi Abara',     meal: 'Rice and beans',          weight: 176, vital: 'blood_pressure', meds: [],                                   extraMembers: ['Ada Abara'] },
]

async function main() {
  const snap = await db.collection('tenants').where('slug', '==', SLUG).limit(1).get()
  if (snap.empty) { console.error(`No tenant "${SLUG}"`); process.exit(1) }
  const tenantId = snap.docs[0].id
  console.log(`${SLUG} tenantId = ${tenantId}`)

  if (DELETE) {
    for (const c of clients) {
      // recursiveDelete removes the user doc AND its patients/*/logs subcollections.
      await db.recursiveDelete(db.collection('users').doc(c.id)).catch(() => {})
    }
    console.log(`Deleted ${clients.length} demo clients (recursive).`)
    return
  }

  const now = Date.now()
  for (const c of clients) {
    const at = new Date(now - c.activeDaysAgo * DAY).toISOString()
    const joined = new Date(now - c.joinedDaysAgo * DAY).toISOString()
    const userRef = db.collection('users').doc(c.id)

    await userRef.set({
      name: c.name,
      email: c.email,
      managedBy: [tenantId],
      lastActiveAt: at,
      joinedPlatformAt: joined,
      createdAt: joined,
      profile: { onboardingCompleted: true },
      dataSource: 'demo-lcb-client',
    })

    // Primary human patient + telemetry (exactly what loadHealthSnapshot reads).
    const patientRef = userRef.collection('patients').doc(`${c.id}-pat`)
    await patientRef.set({
      userId: c.id, type: 'human', name: c.member, relationship: 'client',
      status: 'active', createdAt: joined, dataSource: 'demo-lcb-client',
    })
    await patientRef.collection('meal-logs').doc('demo-meal').set({
      userId: c.id, patientId: patientRef.id, description: c.meal, loggedAt: at,
    })
    await patientRef.collection('weight-logs').doc('demo-weight').set({
      userId: c.id, patientId: patientRef.id, weight: c.weight, unit: 'lbs', loggedAt: at,
    })
    await patientRef.collection('vitals').doc('demo-vital').set({
      userId: c.id, patientId: patientRef.id, type: c.vital, recordedAt: at,
    })
    for (let i = 0; i < c.meds.length; i++) {
      await patientRef.collection('medications').doc(`demo-med-${i}`).set({
        userId: c.id, patientId: patientRef.id, name: c.meds[i], status: 'active', addedAt: joined,
      })
    }

    // Additional care recipients (name-only patients) so the household rollup
    // shows more than one member.
    for (let i = 0; i < c.extraMembers.length; i++) {
      await userRef.collection('patients').doc(`${c.id}-pat-extra-${i}`).set({
        userId: c.id, type: 'human', name: c.extraMembers[i], relationship: 'client',
        status: 'active', createdAt: joined, dataSource: 'demo-lcb-client',
      })
    }
    const memberCount = 1 + c.extraMembers.length
    console.log(`  ${c.id} — ${c.name}: ${memberCount} care recipient(s), active ${c.activeDaysAgo}d ago, ${c.meds.length} meds`)
  }
  console.log(`\nSeeded ${clients.length} demo clients with telemetry (3 active <30d, 3 inactive).`)
  console.log('Delete with: npx tsx scripts/seed-lcb-demo-clients.ts --delete')
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
