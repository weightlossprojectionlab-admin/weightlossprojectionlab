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
})
