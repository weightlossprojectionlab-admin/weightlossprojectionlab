/**
 * Appointment time-slot grid — family-aware conflict tiers + collision avoidance.
 *
 * Seeds a family's appointments and drives the wizard to the date/time step to
 * assert the tiered grid:
 *   - 🟥 same patient, same time  -> data-slot-state="taken", DISABLED,
 *   - 🟧 other family member      -> "busy-family", enabled, shows their name,
 *   - 🟨 same provider, same time -> "provider-conflict", enabled, and selecting
 *        it shows the capacity-alert banner + gates Next until acknowledged,
 *   - 🟩 free                      -> "available", selectable.
 * Plus a real POST guard (per feedback_hast_assert_real_outcome): actually submit
 * a representative payload and assert 200 + persisted.
 */

import * as admin from 'firebase-admin'
import { test, expect } from './fixtures'

test.describe('Appointment slot grid @appointment-slots', () => {
  test.setTimeout(4 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('tiers: taken / busy-family / provider-conflict + override gate', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const patId = `e2e_slot_pat_${stamp}`
    const otherPatId = `e2e_slot_other_${stamp}`
    const provId = `e2e_slot_prov_${stamp}`
    const patName = `Slot Test ${stamp}`
    const otherName = `Other Kid ${stamp}`
    const provName = `Dr Slot ${stamp}`

    const d = new Date(Date.now() + 7 * 24 * 3600 * 1000)
    const targetDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const nowIso = new Date().toISOString()
    const takenTime = '10:00' // same patient -> taken
    const busyTime = '09:00' // other patient, different provider -> busy-family
    const conflictTime = '11:00' // other patient, SAME (selected) provider -> provider-conflict
    const freeTime = '12:00'

    const userRef = firestore.collection('users').doc(ownerUserId)
    const patRef = userRef.collection('patients').doc(patId)
    const provRef = userRef.collection('providers').doc(provId)
    const apptRefs = ['a1', 'a2', 'a3'].map((s) => userRef.collection('appointments').doc(`e2e_slot_${s}_${stamp}`))

    await patRef.set({ name: patName, userId: ownerUserId, status: 'active' })
    // Provider listener (useProviders) orders by addedAt — include it or the doc
    // is dropped (feedback_firestore_orderby_excludes_fieldless).
    await provRef.set({ name: provName, specialty: 'Testology', type: 'physician', addedAt: nowIso, patientsServed: [] })

    const appt = (time: string, pid: string, pname: string, provider?: { id: string; name: string }) => ({
      dateTime: `${targetDate}T${time}:00`,
      patientId: pid,
      patientName: pname,
      ...(provider ? { providerId: provider.id, providerName: provider.name } : {}),
      type: 'routine-checkup',
      status: 'scheduled',
      requiresDriver: false,
      driverStatus: 'not-needed',
      createdFrom: 'manual',
    })
    await apptRefs[0].set(appt(takenTime, patId, patName)) // same patient
    await apptRefs[1].set(appt(busyTime, otherPatId, otherName, { id: 'other-prov', name: 'Dr Other' })) // busy-family
    await apptRefs[2].set(appt(conflictTime, otherPatId, otherName, { id: provId, name: provName })) // provider-conflict

    const cleanup = async () => {
      await Promise.all(apptRefs.map((r) => r.delete().catch(() => {})))
      await provRef.delete().catch(() => {})
      await patRef.delete().catch(() => {})
    }

    try {
      await page.goto('/appointments/new', { waitUntil: 'domcontentloaded' })

      const patientBtn = page.getByRole('button', { name: new RegExp(patName) })
      await patientBtn.waitFor({ state: 'visible', timeout: 60_000 })
      await patientBtn.click()

      const startBtn = page.getByRole('button', { name: /Start Scheduling/i })
      await startBtn.waitFor({ state: 'visible', timeout: 30_000 })
      await startBtn.click()

      // Provider step — select the seeded provider so provider-conflict activates.
      const providerBtn = page.getByRole('button', { name: new RegExp(provName) })
      await providerBtn.waitFor({ state: 'visible', timeout: 30_000 })
      await providerBtn.click()

      const nextBtn = page.getByRole('button', { name: 'Next', exact: true })
      await nextBtn.click()

      await expect(page.getByRole('heading', { name: /Appointment Date & Time/i })).toBeVisible({ timeout: 30_000 })
      await page.locator('input[type="date"]').fill(targetDate)

      // Tier assertions.
      const slot = (t: string) => page.locator(`[data-time="${t}"]`)
      await slot(takenTime).waitFor({ state: 'visible', timeout: 15_000 })

      await expect(slot(takenTime), 'same patient -> taken').toHaveAttribute('data-slot-state', 'taken')
      await expect(slot(takenTime)).toBeDisabled()
      await expect(slot(takenTime), 'taken slot names who is booked').toHaveAttribute('title', new RegExp(patName))

      await expect(slot(busyTime), 'other family member -> busy-family').toHaveAttribute('data-slot-state', 'busy-family')
      await expect(slot(busyTime)).toBeEnabled()
      await expect(slot(busyTime), 'busy slot shows the family member').toContainText(otherName)

      await expect(slot(conflictTime), 'same provider -> provider-conflict').toHaveAttribute('data-slot-state', 'provider-conflict')
      await expect(slot(conflictTime)).toBeEnabled()

      // Selecting the provider-conflict slot: banner appears, Next is gated.
      await slot(conflictTime).click()
      await expect(page.getByText(/Provider capacity alert/i)).toBeVisible()
      await expect(nextBtn, 'Next gated until override acknowledged').toBeDisabled()

      const ack = page.getByRole('checkbox', { name: /I confirm this practice/i })
      await ack.check()
      await expect(nextBtn, 'Next enabled after acknowledgement').toBeEnabled()

      // Switching to a free slot clears the override + banner.
      await slot(freeTime).click()
      await expect(page.getByText(/Provider capacity alert/i)).toHaveCount(0)
      await expect(slot(freeTime)).toHaveAttribute('data-slot-state', 'selected')
      await expect(nextBtn).toBeEnabled()
    } finally {
      await cleanup()
    }
  })

  // Real end-to-end guard: actually SUBMIT and assert it persists (200), not just
  // that the form renders. A render-only test let two schema bugs ship (dateTime
  // required a timezone; patientId/providerId were wrongly .uuid()), both 400ing.
  test('POST /api/appointments accepts a real payload (non-UUID ids + local ISO)', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const patId = `e2e_appt_post_${stamp}` // Firestore-style id, NOT a UUID
    const patRef = firestore.collection('users').doc(ownerUserId).collection('patients').doc(patId)
    await patRef.set({ name: `Post Test ${stamp}`, userId: ownerUserId, status: 'active' })

    const d = new Date(Date.now() + 7 * 24 * 3600 * 1000)
    const dateTime = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T09:00:00`

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

    let createdId: string | undefined
    try {
      const res = await page.request.post('/api/appointments', {
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        data: {
          patientId: patId,
          dateTime,
          type: 'routine-checkup',
          reason: 'routine-checkup',
          location: '123 main st',
          requiresDriver: false,
          driverStatus: 'not-needed',
          createdFrom: 'manual',
        },
      })
      expect(res.status(), `POST should be 200 (got ${res.status()}: ${await res.text()})`).toBe(200)
      const json = await res.json()
      createdId = json?.data?.id
      expect(json?.data?.patientId, 'persisted patientId').toBe(patId)
      expect(json?.data?.dateTime, 'persisted dateTime').toBe(dateTime)
    } finally {
      if (createdId) {
        await firestore
          .collection('users')
          .doc(ownerUserId)
          .collection('appointments')
          .doc(createdId)
          .delete()
          .catch(() => {})
      }
      await patRef.delete().catch(() => {})
    }
  })

  // Acceptance spec for Layer 3 (driver-overlap caution) — NOT built yet.
  // When the same assigned driver is booked for two overlapping appointments at
  // DIFFERENT locations, the transportation step should WARN (not block); a
  // same-location batched trip should clear the warning. Un-skip when Layer 3
  // ships. (See project_appointment_slot_picker_roadmap.)
  test.skip('Layer 3: driver assigned across overlapping different-location appointments warns', async () => {
    // 1. Seed two overlapping appointments for different patients, same driver,
    //    different locations. 2. Open the transportation step, assign that driver.
    // 3. Assert a driver-conflict warning appears (not a hard block).
    // 4. Change one to the same location -> warning clears, batched-trip hint shows.
  })
})
