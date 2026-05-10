/**
 * Regression test: AI Health Report rendering for Phase A–E entities.
 *
 * Pins the medical-binder gap-close wiring. The report endpoint
 * (/api/patients/[id]/ai-health-report) is rule-based — no Gemini
 * call, deterministic, CI-safe. The test:
 *
 *   1. Seeds a minimal item for each Phase A–E entity on the test
 *      patient (bloodType, one immunization, one equipment, one
 *      family-history entry, one completed appointment).
 *   2. Opens the patient Info tab + clicks Generate Report.
 *   3. Asserts the rendered report contains each entity's section
 *      heading AND a unique data string from the seeded record.
 *   4. Cleans up the seeded entities (skipped when KEEP_DATA=1 so
 *      the human can inspect afterward).
 *
 * A regression that drops a Phase entity from the request payload
 * (AIHealthReport.tsx body) or from the report formatter
 * (api/.../ai-health-report/route.ts generateHealthReport) trips
 * one of the section assertions immediately.
 *
 * NOT a Gemini test — runs in seconds against a warm dev server.
 */

import { test, expect } from './fixtures'
import { v4 as uuidv4 } from 'uuid'

test.describe('AI Health Report — Phase A–E wiring @phase-a-e-report', () => {
  // Cold-compile + report render. Generous but not extravagant.
  test.setTimeout(5 * 60_000)

  test('report includes Blood Type, Immunizations, Equipment, Family History, Appointments sections', async ({
    page,
    patientId,
    ownerUserId,
    firestore,
    gotoPatientTab,
  }) => {
    const stamp = Date.now()

    // ============= Seed minimal Phase A–E records =============
    const patientRef = firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)

    // Phase A — bloodType on patient profile (idempotent merge).
    const originalBloodType = (await patientRef.get()).data()?.bloodType
    await patientRef.set({ bloodType: 'A+' }, { merge: true })

    // Phase B — one immunization
    const immunizationId = uuidv4()
    const vaccineName = `Tetanus-Report-${stamp}`
    const now = new Date().toISOString()
    await patientRef.collection('immunizations').doc(immunizationId).set({
      id: immunizationId,
      patientId,
      userId: ownerUserId,
      vaccineName,
      administeredAt: '2024-03-12',
      doseNumber: 1,
      lotNumber: `LOT-${stamp}`,
      administeredBy: 'Walgreens',
      nextDueAt: '2034-03-12',
      source: 'manual',
      addedAt: now,
      addedBy: ownerUserId,
    })

    // Phase C — one medical equipment
    const equipmentId = uuidv4()
    const deviceName = `CPAP-Report-${stamp}`
    await patientRef.collection('equipment').doc(equipmentId).set({
      id: equipmentId,
      patientId,
      userId: ownerUserId,
      name: deviceName,
      type: 'respiratory',
      manufacturer: 'ResMed',
      model: 'AirSense 11',
      serialNumber: `SN-${stamp}`,
      prescribedBy: 'Dr. Patel',
      acquiredAt: '2024-09-01',
      nextMaintenanceAt: '2036-03-01',
      source: 'manual',
      addedAt: now,
      addedBy: ownerUserId,
    })

    // Phase D — one family-history entry
    const familyHistoryId = uuidv4()
    const condition = `Breast cancer-Report-${stamp}`
    await patientRef.collection('family-history').doc(familyHistoryId).set({
      id: familyHistoryId,
      patientId,
      userId: ownerUserId,
      relativeRelationship: 'mother',
      condition,
      ageOfOnset: 52,
      isLiving: true,
      notes: 'In remission since 2024',
      source: 'manual',
      addedAt: now,
      addedBy: ownerUserId,
    })

    // Phase E — one completed appointment with diagnosis
    const appointmentId = uuidv4()
    const providerName = `Dr. Report-Test ${stamp}`
    const diagnosis = `Mild iron deficiency-Report-${stamp}`
    const apptsCol = firestore.collection('users').doc(ownerUserId).collection('appointments')
    await apptsCol.doc(appointmentId).set({
      id: appointmentId,
      userId: ownerUserId,
      patientId,
      patientName: 'E2E Test Patient',
      providerId: '',
      providerName,
      specialty: 'Internal Medicine',
      dateTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // last week
      duration: 30,
      type: 'routine-checkup',
      reason: 'Annual physical',
      status: 'completed',
      diagnosisGiven: diagnosis,
      testsOrdered: ['CBC', 'Ferritin'],
      treatmentPlan: 'Iron supplement; recheck in 8 weeks',
      followUpNeeded: false,
      createdFrom: 'manual',
      requiresDriver: false,
      driverStatus: 'not-needed',
      createdAt: now,
      createdBy: ownerUserId,
      updatedAt: now,
      completedAt: now,
    })

    try {
      // Land on the Health Records tab first and wait for each
      // seeded entry to render. This forces all subcollection
      // fetches (immunizations / equipment / family-history) to
      // populate React state. Without it, the Info-tab Generate
      // Report click can race the fetches and ship an empty array
      // for whichever entity loses, silently dropping that section
      // from the rendered report.
      await gotoPatientTab('health-records')
      await expect(page.getByText(vaccineName, { exact: false })).toBeVisible({
        timeout: 30_000,
      })
      await expect(page.getByText(deviceName, { exact: false })).toBeVisible({
        timeout: 30_000,
      })
      await expect(page.getByText(condition, { exact: false })).toBeVisible({
        timeout: 30_000,
      })

      // Switch to the Info tab via the in-page Quick Actions button
      // (NOT a fresh navigation — that would reset React state and
      // re-trigger the race we just avoided). The tab button calls
      // setActiveTab() locally; the fetched data stays.
      // Two "Info" buttons exist (Quick Actions sidebar + tab bar);
      // either works since both call setActiveTab('info'). Pick the
      // first stable one.
      await page.getByRole('button', { name: /^ℹ️ Info$/ }).first().click()

      await expect(
        page.getByRole('heading', { name: 'Health Summary', level: 3 }),
      ).toBeVisible({ timeout: 30_000 })

      const generateBtn = page.getByRole('button', { name: /^Generate Report$|^Regenerate$/ })
      await expect(generateBtn).toBeVisible({ timeout: 10_000 })
      await generateBtn.click()

      // Wait for completion (button flips to "Regenerate").
      await expect(page.getByRole('button', { name: 'Regenerate' })).toBeVisible({
        timeout: 90_000,
      })

      // ============= Assert each section + a unique data string =============
      // Markdown rendered via ReactMarkdown — H2 headings become <h2>
      // elements. Match by accessible heading role for stability.

      // Phase A — Blood Type appears in the Demographics table
      await expect(page.getByText('Blood Type', { exact: false })).toBeVisible()
      await expect(page.getByText('A+', { exact: false }).first()).toBeVisible()

      // Phase B — Immunizations section + the seeded vaccine
      await expect(
        page.getByRole('heading', { name: 'IMMUNIZATIONS', level: 2 }),
      ).toBeVisible()
      await expect(page.getByText(vaccineName, { exact: false })).toBeVisible()

      // Phase C — Medical Equipment section + the seeded device
      await expect(
        page.getByRole('heading', { name: 'MEDICAL EQUIPMENT', level: 2 }),
      ).toBeVisible()
      await expect(page.getByText(deviceName, { exact: false })).toBeVisible()

      // Phase D — Family Medical History section + the seeded condition
      await expect(
        page.getByRole('heading', { name: 'FAMILY MEDICAL HISTORY', level: 2 }),
      ).toBeVisible()
      await expect(page.getByText(condition, { exact: false })).toBeVisible()

      // Phase E — Appointments section + the seeded provider + diagnosis
      await expect(
        page.getByRole('heading', { name: 'APPOINTMENTS', level: 2 }),
      ).toBeVisible()
      await expect(page.getByText(providerName, { exact: false })).toBeVisible()
      await expect(page.getByText(diagnosis, { exact: false })).toBeVisible()

      if (process.env.KEEP_OPEN !== '0') {
        await page.pause()
      }
    } finally {
      // Cleanup unless KEEP_DATA=1.
      if (process.env.KEEP_DATA === '1') {
        console.log(
          '[health-report] KEEP_DATA=1 — skipping cleanup; seeded A–E records remain in Firestore.',
        )
      } else {
        await patientRef.collection('immunizations').doc(immunizationId).delete().catch(() => {})
        await patientRef.collection('equipment').doc(equipmentId).delete().catch(() => {})
        await patientRef.collection('family-history').doc(familyHistoryId).delete().catch(() => {})
        await apptsCol.doc(appointmentId).delete().catch(() => {})
        // Restore bloodType to whatever it was before the test.
        if (originalBloodType !== undefined) {
          await patientRef.set({ bloodType: originalBloodType }, { merge: true })
        }
      }
    }
  })
})
