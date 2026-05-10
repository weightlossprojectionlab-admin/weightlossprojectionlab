/**
 * Phase B end-to-end test: Immunization round-trip via the UI.
 *
 * Goals:
 *   1. Exercise every field of the form, not just required ones.
 *   2. Verify the new record renders in the UI list.
 *   3. Verify every field actually persisted to Firestore at the
 *      expected path. Catches regressions where the UI happily
 *      shows what the user typed but the API silently drops a
 *      field on the way to the database.
 *   4. Delete via UI and verify the doc is gone from Firestore.
 *
 * The browser stays open after the test by default so a human can
 * inspect the final state. Set KEEP_OPEN=0 to flip it off (e.g.
 * for CI).
 */

import { test, expect } from './fixtures'

test.describe('Health Records — Immunizations @phase-b', () => {
  test('add fully-populated record, verify Firestore, then delete', async ({
    page,
    patientId,
    ownerUserId,
    firestore,
    gotoPatientTab,
  }) => {
    // Unique name keeps runs isolated even if a previous run leaked.
    const stamp = Date.now()
    const formData = {
      vaccineName: `Tetanus-E2E-${stamp}`,
      administeredAt: '2026-05-10',
      doseNumber: '2',
      lotNumber: `LOT-${stamp}`,
      administeredBy: 'E2E Test Clinic',
      nextDueAt: '2036-05-10',
      notes: 'Created by Playwright Phase B round-trip — should auto-delete.',
    }

    await gotoPatientTab('health-records')

    await expect(
      page.getByRole('heading', { name: 'Immunizations', exact: true }),
    ).toBeVisible({ timeout: 30_000 })

    // Open the form
    await page.getByRole('button', { name: '+ Add', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Add Immunization', exact: true }),
    ).toBeVisible()

    // Fill every field — type required ones char-by-char so the
    // input's onChange is exercised, fill optional ones for speed.
    await page.getByLabel('Vaccine *').pressSequentially(formData.vaccineName, { delay: 60 })
    await page.getByLabel('Date administered *').fill(formData.administeredAt)
    await page.getByLabel(/^Dose #/).fill(formData.doseNumber)
    await page.getByLabel(/^Lot #/).fill(formData.lotNumber)
    await page.getByLabel(/^Administered by/).fill(formData.administeredBy)
    await page.getByLabel(/^Next dose due/).fill(formData.nextDueAt)
    await page.getByLabel(/^Notes/).fill(formData.notes)

    await page.getByRole('button', { name: 'Add', exact: true }).click()

    // Modal closes after the POST returns.
    await expect(
      page.getByRole('heading', { name: 'Add Immunization', exact: true }),
    ).not.toBeVisible({ timeout: 60_000 })

    // === UI assertion: row renders with the data we typed ===
    const rowItem = page.locator('li', { hasText: formData.vaccineName })
    await expect(rowItem).toBeVisible({ timeout: 10_000 })
    await expect(rowItem).toContainText(`Dose #${formData.doseNumber}`)
    await expect(rowItem).toContainText(formData.administeredBy)
    await expect(rowItem).toContainText(`Lot ${formData.lotNumber}`)
    await expect(rowItem).toContainText(formData.notes)

    // === Firestore assertion: every field persisted at the right path ===
    const collection = firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .collection('immunizations')

    const snap = await collection.where('vaccineName', '==', formData.vaccineName).get()
    expect(snap.size, 'exactly one Firestore doc for this vaccineName').toBe(1)

    const persisted = snap.docs[0].data()
    expect(persisted.vaccineName).toBe(formData.vaccineName)
    expect(persisted.administeredAt).toBe(formData.administeredAt)
    expect(persisted.doseNumber).toBe(parseInt(formData.doseNumber, 10))
    expect(persisted.lotNumber).toBe(formData.lotNumber)
    expect(persisted.administeredBy).toBe(formData.administeredBy)
    expect(persisted.nextDueAt).toBe(formData.nextDueAt)
    expect(persisted.notes).toBe(formData.notes)
    expect(persisted.patientId).toBe(patientId)
    expect(persisted.userId).toBe(ownerUserId)
    expect(persisted.source).toBe('manual')
    expect(typeof persisted.addedAt).toBe('string')
    expect(persisted.addedBy).toBeTruthy()
    const docId = snap.docs[0].id

    // === Delete via UI ===
    await rowItem.getByRole('button', { name: /^delete/i }).click()
    await page.getByRole('button', { name: 'Remove', exact: true }).click()

    // Row gone from UI
    await expect(page.getByText(formData.vaccineName, { exact: false })).toHaveCount(0, {
      timeout: 60_000,
    })

    // === Firestore assertion: doc actually deleted, not orphaned ===
    const afterDelete = await collection.doc(docId).get()
    expect(afterDelete.exists, 'Firestore doc removed by DELETE').toBe(false)

    // Stay open by default so the human watching can inspect the
    // final UI state. Resume in the Inspector to end the run, or
    // set KEEP_OPEN=0 for CI.
    if (process.env.KEEP_OPEN !== '0') {
      await page.pause()
    }
  })
})
