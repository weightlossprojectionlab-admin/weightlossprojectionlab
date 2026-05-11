/**
 * Plan-cap enforcement — household-cap gates on /api/households.
 *
 * Locks in the 2026-05-11 plan-cap reconciliation:
 *   - POST /api/households with more members than the plan's
 *     maxMembersPerHousehold → 403 HOUSEHOLD_MEMBER_CAP
 *   - POST /api/households with cap-respecting member count → 201
 *   - PUT  /api/households/[id] adding a member beyond cap → 403
 *     HOUSEHOLD_MEMBER_CAP
 *
 * Why API-level (not UI): the gate is a server-side contract; covering
 * it at the API surface lets us assert the exact error shape (code +
 * message + cap numbers) the client UX depends on.
 *
 * The test temporarily downgrades the test user's subscription to
 * family_basic (cap = 5 members/household) so a 6-member request can
 * trip the gate without inflating the test user's seat budget. Original
 * subscription is restored in afterAll.
 */

import { test, expect } from './fixtures'
import * as admin from 'firebase-admin'
import { v4 as uuidv4 } from 'uuid'

// Cap-tests intentionally trip 403s — the ApiClient logs each as a
// console.error which would otherwise fail the bug-monitor.
test.use({ expectedApiErrorCodes: ['HOUSEHOLD_MEMBER_CAP', 'HOUSEHOLD_COUNT_CAP'] })

test.describe('Plan-cap enforcement — /api/households member cap @plan-caps', () => {
  test.setTimeout(2 * 60_000)

  // State carried across the suite. createdPatientIds / createdHouseholdIds
  // are cleaned up regardless of test outcome.
  const createdPatientIds: string[] = []
  const createdHouseholdIds: string[] = []
  let originalSubscription: any = undefined
  let idToken: string = ''
  const stamp = Date.now()

  test.beforeAll(async ({ firestore, ownerUserId }) => {
    // 1. Snapshot the original subscription so afterAll can put it back.
    const userDoc = await firestore.collection('users').doc(ownerUserId).get()
    originalSubscription = userDoc.data()?.subscription
    if (!originalSubscription) {
      throw new Error(
        'Test user has no subscription on their user doc — set one up before running this spec.',
      )
    }

    // 2. Force plan = family_basic (cap = 5 members per household, 1
    // household total). Keep the rest of the subscription shape so any
    // unrelated reads downstream don't choke on missing fields.
    await firestore
      .collection('users')
      .doc(ownerUserId)
      .update({
        subscription: {
          ...originalSubscription,
          plan: 'family_basic',
          maxSeats: 5,
          maxPatients: 5,
          maxExternalCaregivers: 5,
          maxHouseholds: 1,
        },
      })

    // 3. Pre-clean: hard-delete any existing households for this user
    // so the household-count gate isn't already at the family_basic cap.
    const existingHouseholds = await firestore
      .collection('households')
      .where('primaryCaregiverId', '==', ownerUserId)
      .get()
    if (!existingHouseholds.empty) {
      const batch = firestore.batch()
      for (const doc of existingHouseholds.docs) batch.delete(doc.ref)
      await batch.commit()
    }
    // Also clear householdId on any patient whose household just got nuked,
    // so they can be freely assigned by tests below.
    const stalePatients = await firestore
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .where('householdId', '!=', null)
      .get()
    if (!stalePatients.empty) {
      const batch = firestore.batch()
      for (const doc of stalePatients.docs) batch.update(doc.ref, { householdId: null })
      await batch.commit()
    }

    // 4. Admin-create 6 test patients so we can attempt a 6-member
    // household (one over the cap) and a 5-member household (at cap).
    const now = new Date().toISOString()
    const batch = firestore.batch()
    for (let i = 0; i < 6; i++) {
      const id = uuidv4()
      const ref = firestore
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(id)
      batch.set(ref, {
        id,
        userId: ownerUserId,
        name: `Cap Test P${i + 1} ${stamp}`,
        type: 'human',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        relationship: 'self',
        accountStatus: 'member',
        countsAsSeat: true,
        addedBy: ownerUserId,
        addedAt: now,
        createdAt: now,
        lastModified: now,
      })
      createdPatientIds.push(id)
    }
    await batch.commit()

    // 5. Mint a Firebase ID token for the test user. The admin SDK
    // makes a custom token; Firebase's Identity Toolkit REST API
    // exchanges that for a real ID token the /api/households route
    // can verify with verifyIdToken().
    const customToken = await admin.auth().createCustomToken(ownerUserId)
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    if (!apiKey) throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY missing from .env.local')
    const exchangeRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      },
    )
    if (!exchangeRes.ok) {
      throw new Error(
        `Token exchange failed: ${exchangeRes.status} ${await exchangeRes.text()}`,
      )
    }
    const exchange = (await exchangeRes.json()) as { idToken: string }
    idToken = exchange.idToken
  })

  test.afterAll(async ({ firestore, ownerUserId }) => {
    if (process.env.KEEP_DATA === '1') {
      console.log('[household-cap] KEEP_DATA=1 — leaving:', {
        createdHouseholdIds,
        createdPatientIds,
      })
      return
    }
    // Hard-delete households this spec created.
    for (const id of createdHouseholdIds) {
      await firestore.collection('households').doc(id).delete().catch(() => {})
    }
    // Hard-delete the 6 test patients.
    for (const id of createdPatientIds) {
      await firestore
        .collection('users')
        .doc(ownerUserId)
        .collection('patients')
        .doc(id)
        .delete()
        .catch(() => {})
    }
    // Restore the original subscription.
    if (originalSubscription) {
      await firestore
        .collection('users')
        .doc(ownerUserId)
        .update({ subscription: originalSubscription })
    }
  })

  test('POST with 6 members on a family_basic plan (cap = 5) → 403 HOUSEHOLD_MEMBER_CAP', async ({
    page,
  }) => {
    const res = await page.request.post('/api/households', {
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        name: `Capped Household ${stamp}`,
        memberIds: createdPatientIds.slice(0, 6),
      },
    })
    expect(res.status(), 'over-cap POST returns 403').toBe(403)
    const body = await res.json()
    expect(body.error).toBe('HOUSEHOLD_MEMBER_CAP')
    expect(body.cap, 'response surfaces the resolved cap').toBe(5)
    expect(body.attempted, 'response echoes attempted member count').toBe(6)
    expect(body.plan, 'response echoes plan id').toBe('family_basic')
  })

  test('POST with 5 members (at cap) → 201 created', async ({ page, firestore }) => {
    const householdName = `At-Cap Household ${stamp}`
    const fiveIds = createdPatientIds.slice(0, 5)
    const res = await page.request.post('/api/households', {
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      data: { name: householdName, memberIds: fiveIds },
    })
    expect(res.status(), 'at-cap POST returns 201').toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.household?.id, 'response includes household id').toBeTruthy()
    createdHouseholdIds.push(body.household.id)

    // The 5 patients should now point at the new household.
    for (const pid of fiveIds) {
      const pdoc = await firestore
        .collection('users')
        .doc(body.household.primaryCaregiverId)
        .collection('patients')
        .doc(pid)
        .get()
      expect(pdoc.data()?.householdId, `patient ${pid} householdId cascaded`).toBe(
        body.household.id,
      )
    }
  })

  test('PUT to add a 6th member (over cap) → 403 HOUSEHOLD_MEMBER_CAP', async ({ page }) => {
    // The previous test must have created a household; if it didn't,
    // there's nothing to edit. Surface that clearly.
    expect(
      createdHouseholdIds.length,
      'previous test must have created the at-cap household',
    ).toBeGreaterThan(0)
    const householdId = createdHouseholdIds[0]

    const res = await page.request.put(`/api/households/${householdId}`, {
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        memberIds: createdPatientIds.slice(0, 6), // try to push to 6 — one over cap
      },
    })
    expect(res.status(), 'over-cap PUT returns 403').toBe(403)
    const body = await res.json()
    expect(body.error).toBe('HOUSEHOLD_MEMBER_CAP')
    expect(body.cap).toBe(5)
    expect(body.attempted).toBe(6)
    expect(body.plan).toBe('family_basic')
  })
})
