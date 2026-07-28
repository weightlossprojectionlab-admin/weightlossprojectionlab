/**
 * Semantic hole probes for appointment scheduling.
 *
 * These assert what SHOULD be true from the meaning of a booking, so a failure
 * discovers a real gap rather than a cosmetic one.
 *
 * Hole #1 — a cancelled appointment must FREE its slot. A cancellation is not a
 * commitment, so its time should be bookable again. If the grid still greys a
 * cancelled slot, the family is falsely blocked.
 */

import * as admin from 'firebase-admin'
import { test, expect } from './fixtures'

test.describe('Appointment semantic holes @appointment-holes', () => {
  test.setTimeout(4 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('a cancelled appointment frees its time slot', async ({ page, ownerUserId, firestore }) => {
    const stamp = Date.now()
    const patId = `e2e_hole_pat_${stamp}`
    const patName = `Hole Test ${stamp}`
    const userRef = firestore.collection('users').doc(ownerUserId)
    await userRef.collection('patients').doc(patId).set({ name: patName, userId: ownerUserId, status: 'active' })

    const pad = (n: number) => String(n).padStart(2, '0')
    const d = new Date()
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const cancelledTime = '10:00'
    const activeTime = '11:00'

    // Auth token for the API mutations.
    const customToken = await admin.auth().createCustomToken(ownerUserId)
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    const exchange = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) },
    )
    const { idToken } = (await exchange.json()) as { idToken: string }
    const headers = { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' }

    const mkAppt = (time: string) => ({
      patientId: patId,
      dateTime: `${today}T${time}:00`,
      type: 'routine-checkup',
      reason: 'routine-checkup',
      requiresDriver: false,
      driverStatus: 'not-needed',
      createdFrom: 'manual',
    })

    const created: string[] = []
    try {
      // Booking at 10:00, then CANCELLED — the slot should be free again.
      const r1 = await page.request.post('/api/appointments', { headers, data: mkAppt(cancelledTime) })
      expect(r1.status(), await r1.text()).toBe(200)
      const cancelledId = (await r1.json()).data.id
      created.push(cancelledId)
      const c = await page.request.put(`/api/appointments/${cancelledId}`, { headers, data: { status: 'cancelled' } })
      expect(c.status()).toBe(200)

      // A real ACTIVE booking at 11:00 — this one SHOULD block (control).
      const r2 = await page.request.post('/api/appointments', { headers, data: mkAppt(activeTime) })
      expect(r2.status(), await r2.text()).toBe(200)
      created.push((await r2.json()).data.id)

      // Drive the wizard to the date/time grid for this patient.
      await page.goto('/appointments/new', { waitUntil: 'domcontentloaded' })
      const patientBtn = page.getByRole('button', { name: new RegExp(patName) })
      await patientBtn.waitFor({ state: 'visible', timeout: 60_000 })
      await patientBtn.click()
      await page.getByRole('button', { name: /Start Scheduling/i }).click()
      await page.getByRole('button', { name: 'Next', exact: true }).click()
      await expect(page.getByRole('heading', { name: /Appointment Date & Time/i })).toBeVisible({ timeout: 30_000 })
      await page.locator('input[type="date"]').fill(today)

      const slot = (t: string) => page.locator(`[data-time="${t}"]`)
      await slot(activeTime).waitFor({ state: 'visible', timeout: 15_000 })

      // Control: the active booking blocks its slot (proves the grid works).
      await expect(slot(activeTime), 'active booking blocks its slot').toHaveAttribute('data-slot-state', 'taken')

      // The probe: the CANCELLED booking must NOT block — the slot is free again.
      await expect(slot(cancelledTime), 'cancelled appointment should free its slot').toHaveAttribute(
        'data-slot-state',
        'available',
      )
    } finally {
      await Promise.all(created.map((id) => userRef.collection('appointments').doc(id).delete().catch(() => {})))
      await userRef.collection('patients').doc(patId).delete().catch(() => {})
    }
  })
})
