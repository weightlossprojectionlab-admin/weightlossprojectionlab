/**
 * Care-team event notifications: when a caregiver/owner logs an event on a
 * shared patient, the OTHER caregivers + owner get a bell notification, and the
 * actor does not.
 *
 * Runs as the owner fixture. Seeds a throwaway patient + one accepted caregiver,
 * then logs a MEAL through the real API (owner = actor) and asserts:
 *   - the seeded caregiver receives a `meal_logged` notification
 *   - the owner (the actor) does NOT get one for this action
 *
 * Uses the same route + shared `notifyCareTeamOfEvent` helper that dose-given
 * and appointment-scheduled use, so this covers the fan-out path for all three.
 * Everything is torn down in finally.
 */

import * as admin from 'firebase-admin'
import { test, expect } from './fixtures'

test.describe('Care-team event notifications @care-notify', () => {
  test.setTimeout(4 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('a logged meal notifies the other caregivers, not the actor', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const patientId = `e2e-carenotify-patient-${stamp}`
    const caregiverUid = `e2e-carenotify-cg-${stamp}`

    const patRef = firestore.collection('users').doc(ownerUserId).collection('patients').doc(patientId)
    await patRef.set({ name: `CareNotify ${stamp}`, userId: ownerUserId, type: 'human' })
    await patRef.collection('familyMembers').doc(caregiverUid).set({
      userId: caregiverUid,
      name: 'E2E Caregiver',
      email: `e2e-cg-${stamp}@example.com`,
      status: 'accepted',
      addedAt: new Date().toISOString(),
    })

    // Mint an ID token for the owner so we can call the real route as them.
    const customToken = await admin.auth().createCustomToken(ownerUserId)
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    expect(apiKey, 'NEXT_PUBLIC_FIREBASE_API_KEY must be set').toBeTruthy()
    const exchange = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      },
    )
    const { idToken } = (await exchange.json()) as { idToken: string }

    const cleanup = async () => {
      const notifs = await firestore.collection('notifications').where('userId', '==', caregiverUid).get()
      await Promise.all(notifs.docs.map((d) => d.ref.delete().catch(() => {})))
      const meals = await patRef.collection('meal-logs').get()
      await Promise.all(meals.docs.map((d) => d.ref.delete().catch(() => {})))
      await patRef.collection('familyMembers').doc(caregiverUid).delete().catch(() => {})
      await patRef.delete().catch(() => {})
    }

    try {
      // Owner logs a meal via the real API route.
      const res = await page.request.post(`/api/patients/${patientId}/meal-logs`, {
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        data: { mealType: 'lunch' },
      })
      expect(res.ok(), `meal-log POST should succeed (got ${res.status()})`).toBeTruthy()

      // The seeded caregiver gets a meal_logged bell notification.
      await expect
        .poll(
          async () => {
            const n = await firestore
              .collection('notifications')
              .where('userId', '==', caregiverUid)
              .where('type', '==', 'meal_logged')
              .get()
            return n.size
          },
          { timeout: 30_000, message: 'caregiver should receive a meal_logged notification' },
        )
        .toBeGreaterThan(0)

      // The owner (the actor) is excluded — no notification for THIS action.
      const ownerNotifs = await firestore
        .collection('notifications')
        .where('userId', '==', ownerUserId)
        .where('type', '==', 'meal_logged')
        .get()
      const fromThisAction = ownerNotifs.docs.filter(
        (d) => d.data()?.patientId === patientId && d.data()?.metadata?.actionByUserId === ownerUserId,
      )
      expect(fromThisAction.length, 'actor should be excluded from their own event').toBe(0)
    } finally {
      await cleanup()
    }
  })

  test('profile edits notify the care team ONLY when the toggle is on', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const patientId = `e2e-profiletoggle-patient-${stamp}`
    const caregiverUid = `e2e-profiletoggle-cg-${stamp}`

    const patRef = firestore.collection('users').doc(ownerUserId).collection('patients').doc(patientId)
    await patRef.set({ name: `ToggleTest ${stamp}`, userId: ownerUserId, type: 'human' })
    await patRef.collection('familyMembers').doc(caregiverUid).set({
      userId: caregiverUid, name: 'E2E Caregiver', email: `e2e-cg-${stamp}@example.com`,
      status: 'accepted', addedAt: new Date().toISOString(),
    })

    // Snapshot the owner's real preference so we can restore it.
    const prefsRef = firestore.collection('notification_preferences').doc(ownerUserId)
    const prefsOrig = (await prefsRef.get()).data() ?? null

    const customToken = await admin.auth().createCustomToken(ownerUserId)
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    const exchange = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) },
    )
    const { idToken } = (await exchange.json()) as { idToken: string }

    const editName = async (name: string) =>
      page.request.put(`/api/patients/${patientId}`, {
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        data: { name },
      })
    const caregiverProfileNotifs = async () =>
      (await firestore.collection('notifications').where('userId', '==', caregiverUid).where('type', '==', 'patient_profile_updated').get()).size

    const cleanup = async () => {
      const notifs = await firestore.collection('notifications').where('userId', '==', caregiverUid).get()
      await Promise.all(notifs.docs.map((d) => d.ref.delete().catch(() => {})))
      await patRef.collection('familyMembers').doc(caregiverUid).delete().catch(() => {})
      await patRef.delete().catch(() => {})
      if (prefsOrig !== null) await prefsRef.set(prefsOrig).catch(() => {})
      else await prefsRef.delete().catch(() => {})
    }

    try {
      // Toggle OFF → a profile edit does NOT notify.
      await prefsRef.set({ notifyOnProfileEdits: false }, { merge: true })
      const offRes = await editName(`ToggleTest ${stamp} A`)
      expect(offRes.ok(), `edit ok (${offRes.status()})`).toBeTruthy()
      await page.waitForTimeout(2500)
      expect(await caregiverProfileNotifs(), 'no notification while toggle is off').toBe(0)

      // Toggle ON → a profile edit DOES notify the caregiver.
      await prefsRef.set({ notifyOnProfileEdits: true }, { merge: true })
      const onRes = await editName(`ToggleTest ${stamp} B`)
      expect(onRes.ok(), `edit ok (${onRes.status()})`).toBeTruthy()
      await expect
        .poll(caregiverProfileNotifs, { timeout: 30_000, message: 'caregiver should be notified when toggle is on' })
        .toBeGreaterThan(0)
    } finally {
      await cleanup()
    }
  })
})
