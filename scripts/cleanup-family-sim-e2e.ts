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
async function main() {
  const u = await admin.auth().getUserByEmail(process.env.E2E_TEST_USER_EMAIL!)
  const owner = u.uid
  const userRef = db.collection('users').doc(owner)

  // Members: patients tagged dataSource 'family-sim'.
  const patients = await userRef.collection('patients').get()
  const simPatients = patients.docs.filter(d => d.data().dataSource === 'family-sim')
  console.log(`Purging ${simPatients.length} family-sim patient(s)`)
  for (const p of simPatients) {
    const pid = p.id
    for (const sub of ['vitals','medications','meal-logs','equipment','family-history','immunizations','familyMembers']) {
      const s = await p.ref.collection(sub).get()
      for (const d of s.docs) await d.ref.delete()
    }
    for (const col of ['weightLogs','mealLogs','appointments']) {
      const s = await userRef.collection(col).where('patientId','==',pid).get()
      for (const d of s.docs) await d.ref.delete()
    }
    await p.ref.delete()
    console.log(`  - deleted ${p.data().name} (${pid})`)
  }

  // Households tagged family-sim.
  const hh = await db.collection('households').where('primaryCaregiverId','==',owner).get()
  let hhDel = 0
  for (const d of hh.docs) {
    if (d.data().dataSource === 'family-sim') { await d.ref.delete(); hhDel++ }
  }
  console.log(`  - deleted ${hhDel} family-sim household(s)`)

  // Data-only caregivers: owner familyMembers tagged family-sim + their user docs.
  const fm = await userRef.collection('familyMembers').get()
  let cgDel = 0
  for (const d of fm.docs) {
    if (d.data().dataSource === 'family-sim') {
      const cgUid = d.data().userId || d.id
      await db.collection('users').doc(cgUid).delete().catch(()=>{})
      await d.ref.delete()
      cgDel++
    }
  }
  console.log(`  - deleted ${cgDel} family-sim caregiver(s)`)
  console.log('Done.')
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
