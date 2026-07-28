/**
 * Firestore rules — caregiver client reads (the fix for the "insufficient
 * permissions" listener failures). Tests the DEPLOYED rules directly via the
 * client SDK signed in as the caregiver: a grant with viewVitals + the patient
 * in patientsAccess can READ meal-logs + owner-scoped weightLogs; missing the
 * permission OR the patient-access is DENIED. (No emulator is wired, so this
 * hits the live project with admin-seeded data + a custom-token client login.)
 */

import { test, expect } from './fixtures'
import * as admin from 'firebase-admin'
import { initializeApp as initClient, deleteApp } from 'firebase/app'
import { getAuth as getClientAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import { getFirestore as getClientFirestore, collection, query, where, getDocs } from 'firebase/firestore'

test.describe('Caregiver client reads (firestore.rules) @caregiver-reads', () => {
  test.setTimeout(3 * 60_000)

  test('viewVitals + patientsAccess grants meal-logs/weightLogs reads; missing perm or access is denied', async ({
    firestore,
  }) => {
    const stamp = Date.now()
    const owner = `e2e_cgr_owner_${stamp}`
    const pat = `e2e_cgr_pat_${stamp}`
    const caregiverUid = `e2e_cgr_caregiver_${stamp}` // fresh uid; custom token works for any uid

    const ownerRef = firestore.collection('users').doc(owner)
    const mealRef = ownerRef.collection('patients').doc(pat).collection('meal-logs').doc('m1')
    const weightRef = ownerRef.collection('weightLogs').doc('w1')
    const grantRef = ownerRef.collection('familyMembers').doc(caregiverUid)

    await ownerRef.collection('patients').doc(pat).set({ name: `P${stamp}`, userId: owner, relationship: 'parent', type: 'human', dateOfBirth: '1970-01-01' })
    await mealRef.set({ patientId: pat, userId: owner, food: 'Oatmeal', loggedAt: new Date().toISOString() })
    await weightRef.set({ patientId: pat, userId: owner, weight: 180, loggedAt: new Date().toISOString() })
    const setGrant = (permissions: Record<string, boolean>, patientsAccess: string[] = [pat]) =>
      grantRef.set({ userId: caregiverUid, status: 'accepted', patientsAccess, permissions })

    // Client SDK signed in AS the caregiver — subject to the deployed rules.
    const clientApp = initClient(
      {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      },
      `cgr-${stamp}`,
    )
    const clientAuth = getClientAuth(clientApp)
    const clientDb = getClientFirestore(clientApp)
    await signInWithCustomToken(clientAuth, await admin.auth().createCustomToken(caregiverUid))

    const readMeals = () => getDocs(collection(clientDb, 'users', owner, 'patients', pat, 'meal-logs'))
    const readWeights = () => getDocs(query(collection(clientDb, 'users', owner, 'weightLogs'), where('patientId', '==', pat)))

    const cleanup = async () => {
      await Promise.all([grantRef.delete(), mealRef.delete(), weightRef.delete(), ownerRef.collection('patients').doc(pat).delete()].map((p) => p.catch(() => {})))
      await signOut(clientAuth).catch(() => {})
      await deleteApp(clientApp).catch(() => {})
    }

    try {
      // POSITIVE — viewVitals + patient in patientsAccess.
      await setGrant({ viewVitals: true, viewMedicalRecords: true })
      expect((await readMeals()).size, 'caregiver reads meal-logs').toBe(1)
      expect((await readWeights()).size, 'caregiver reads weightLogs').toBe(1)

      // NEGATIVE (a) — no viewVitals.
      await setGrant({ viewVitals: false, viewMedicalRecords: true })
      await expect(readMeals(), 'no viewVitals -> meal-logs denied').rejects.toThrow(/permission/i)
      await expect(readWeights(), 'no viewVitals -> weightLogs denied').rejects.toThrow(/permission/i)

      // NEGATIVE (b) — has viewVitals but patient NOT in patientsAccess.
      await setGrant({ viewVitals: true }, ['some-other-patient'])
      await expect(readMeals(), 'patient not in access -> meal-logs denied').rejects.toThrow(/permission/i)
      await expect(readWeights(), 'patient not in access -> weightLogs denied').rejects.toThrow(/permission/i)
    } finally {
      await cleanup()
    }
  })
})
