/**
 * Concurrency / conflict tests — multiple caregivers acting on ONE account at
 * the same time. "Agents" here are parallel authenticated API calls (the app's
 * real conflict surface is simultaneous Firestore writes, not sockets).
 *
 * First target: the medication dose counter. log-dose reads quantityRemaining,
 * subtracts 1, and writes it back — a read-modify-write with no transaction. If
 * two caregivers log a dose at the same instant they both read N and both write
 * N-1, so a decrement is LOST (and a pill lingers in inventory). This fires N
 * concurrent dose-logs and asserts the counter fell by exactly N.
 */

import * as admin from 'firebase-admin'
import { test, expect } from './fixtures'

test.describe('Concurrency / conflicts @concurrency', () => {
  test.setTimeout(4 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('concurrent dose logs must not lose decrements (quantityRemaining race)', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const patId = `e2e_conc_pat_${stamp}`
    const medId = `e2e_conc_med_${stamp}`
    const START = 10
    const N = 5

    const userRef = firestore.collection('users').doc(ownerUserId)
    const patRef = userRef.collection('patients').doc(patId)
    const medRef = patRef.collection('medications').doc(medId)
    const nowIso = new Date().toISOString()

    await patRef.set({ name: `Conc Patient ${stamp}`, userId: ownerUserId, status: 'active' })
    await medRef.set({
      id: medId,
      name: 'E2E Concurrency Med',
      quantity: '30',
      quantityRemaining: START,
      frequency: 'once daily',
      addedAt: nowIso,
      lastModified: nowIso,
    })

    // Owner ID token (the "caregivers" all act on the same account here).
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
      const logs = await medRef.collection('adherenceLogs').get()
      await Promise.all(logs.docs.map((d) => d.ref.delete().catch(() => {})))
      await medRef.delete().catch(() => {})
      await patRef.delete().catch(() => {})
    }

    try {
      // N caregivers tap "dose given" at the same instant.
      const results = await Promise.all(
        Array.from({ length: N }, () =>
          page.request.post(`/api/patients/${patId}/medications/${medId}/log-dose`, {
            headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
            data: {},
          }),
        ),
      )
      for (const r of results) {
        expect(r.ok(), `log-dose should succeed (got ${r.status()})`).toBeTruthy()
      }

      // Every dose is recorded (adherenceLogs.add is an atomic append — no race here).
      const logs = await medRef.collection('adherenceLogs').get()
      expect(logs.size, 'all doses recorded').toBe(N)

      // The shared counter must reflect ALL N decrements, not fewer due to lost
      // read-modify-write updates.
      const after = (await medRef.get()).data()?.quantityRemaining
      expect(after, `quantityRemaining after ${N} concurrent doses`).toBe(START - N)
    } finally {
      await cleanup()
    }
  })
})
