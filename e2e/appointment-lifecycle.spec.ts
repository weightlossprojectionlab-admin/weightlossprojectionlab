/**
 * Phase E end-to-end test: Appointment lifecycle (pre + post visit).
 *
 * Models the visit-day round-trip a real caregiver does:
 *   1. Seed an upcoming appointment via Admin SDK (scheduling is
 *      out of Phase E scope — we exercise prep + completion only).
 *   2. Open the Appointments tab and verify the upcoming row.
 *   3. Click "Prep visit" → fill notes + add questions → save.
 *      Assert UI reflects the count, then assert Firestore.
 *   4. Click "Mark complete" → fill diagnosis, tests, treatment
 *      plan, follow-up, next-appointment date → save.
 *   5. Assert Firestore has status='completed' + every summary
 *      field at the right path.
 *   6. Assert the row moved from Upcoming to Past with the
 *      structured summary visible.
 *   7. Assert the API auto-created a follow-up appointment with
 *      parent↔child linkage.
 *   8. Calendar verification: navigate to /calendar?patientId=X,
 *      assert the URL filter is honored, click each calendar
 *      marker to exercise the real click handler (not just URL
 *      goto), and finish on the active patient's detail page.
 *   9. Cleanup: delete the seeded parent + the auto-created
 *      follow-up via Admin SDK.
 *
 * Why seed via Admin SDK rather than the AppointmentWizard:
 *   The wizard exercises scheduling — provider-picker, vital
 *   reminders, driver assignment — none of which are Phase E.
 *   Seeding directly keeps the spec focused on lifecycle.
 */

import { test, expect } from './fixtures'
import { v4 as uuidv4 } from 'uuid'

test.describe('Appointment lifecycle — pre + post visit @phase-e', () => {
  // Long flow + cold compiles. Bumping past the default 2 minutes.
  test.setTimeout(15 * 60_000)

  test('prep visit, mark complete, verify Firestore round-trip', async ({
    page,
    patientId,
    ownerUserId,
    firestore,
    gotoPatientTab,
  }) => {
    const stamp = Date.now()
    const appointmentId = uuidv4()
    const futureDateTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // a week out
    const providerName = `Dr. E2E Test ${stamp}`
    const reason = `Annual physical-${stamp}`

    // Follow-up 8 weeks from today — keeps both the parent and the
    // auto-created follow-up findable on the family calendar within
    // a 2-month nav range.
    const followUpDate = new Date(Date.now() + 56 * 24 * 60 * 60 * 1000)
    const followUpDateString = followUpDate.toISOString().slice(0, 10) // YYYY-MM-DD

    // Read the patient's actual name from Firestore rather than
    // hardcoding 'E2E Test Patient' — the seed script can rename it
    // and the test should follow.
    const patientDoc = await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .get()
    const patientName = (patientDoc.data() as { name?: string })?.name ?? 'Test Patient'

    const prep = {
      notes: `Symptoms timeline-${stamp}: fatigue x4 weeks, occasional headaches.`,
      questions: [
        `Should we adjust the medication dosage-${stamp}?`,
        `Is the recent weight gain related-${stamp}?`,
      ],
    }

    const summary = {
      diagnosisGiven: `Mild iron deficiency-${stamp}`,
      testsOrdered: [`CBC-${stamp}`, `Ferritin-${stamp}`, `Vitamin D-${stamp}`],
      treatmentPlan: `Iron supplement 65mg/day; recheck in 8 weeks-${stamp}`,
      visitSummary: `Reassuring overall-${stamp}; primary concern is anemia.`,
      followUpNeeded: true,
      nextAppointmentDate: followUpDateString,
    }

    const appointmentsCol = firestore.collection('users').doc(ownerUserId).collection('appointments')

    // Seed an upcoming appointment that the test will then prep + complete.
    // type='routine-checkup' is the closest match in AppointmentType for
    // a generic in-person visit; 'in-person' is NOT a valid enum value.
    const now = new Date().toISOString()
    await appointmentsCol.doc(appointmentId).set({
      id: appointmentId,
      userId: ownerUserId,
      patientId,
      patientName,
      providerId: '',
      providerName,
      specialty: 'Internal Medicine',
      dateTime: futureDateTime.toISOString(),
      duration: 30,
      type: 'routine-checkup',
      reason,
      location: 'E2E Clinic',
      status: 'scheduled',
      createdFrom: 'manual',
      requiresDriver: false,
      driverStatus: 'not-needed',
      createdAt: now,
      createdBy: ownerUserId,
      updatedAt: now,
    })

    try {
      await gotoPatientTab('appointments')

      // Verify the seeded appointment renders in the Upcoming list.
      const upcomingHeading = page.getByRole('heading', { name: /^Upcoming/, level: 3 })
      await expect(upcomingHeading).toBeVisible({ timeout: 30_000 })

      // Scope to the upcoming-appointment card (border-primary-light)
      // so we don't match the outer Appointments-tab wrapper, which
      // also has bg-card.
      const apptCard = page
        .locator('div.border-primary-light')
        .filter({ hasText: providerName })
      await expect(apptCard).toBeVisible({ timeout: 10_000 })

      // ============= Prep visit =============
      await apptCard.getByRole('button', { name: /^Prep visit/ }).click()

      // The expand-in-row editor surfaces the textarea + question input.
      await page
        .getByLabel(/Notes for the visit/)
        .pressSequentially(prep.notes, { delay: 30 })
      for (const q of prep.questions) {
        await page.getByPlaceholder('Add a question…').fill(q)
        await page.getByRole('button', { name: 'Add', exact: true }).click()
      }
      await page.getByRole('button', { name: 'Save prep' }).click()

      // Editor closes; the button label should now show the count.
      await expect(page.getByLabel(/Notes for the visit/)).toBeHidden({ timeout: 60_000 })
      await expect(
        apptCard.getByRole('button', { name: /^Prep visit \(\d+\)/ }),
      ).toBeVisible({ timeout: 10_000 })

      // === Firestore: prep persisted ===
      const afterPrepDoc = await appointmentsCol.doc(appointmentId).get()
      const afterPrep = afterPrepDoc.data()
      expect(afterPrep?.preVisitNotes).toBe(prep.notes)
      expect(afterPrep?.preVisitQuestions).toEqual(prep.questions)
      // Status hasn't changed yet.
      expect(afterPrep?.status).toBe('scheduled')

      // ============= Mark complete =============
      await apptCard.getByRole('button', { name: /^Mark complete/ }).click()

      const summaryHeading = page.getByRole('heading', { name: 'Visit Summary', exact: true })
      await expect(summaryHeading).toBeVisible({ timeout: 10_000 })

      await page
        .getByLabel(/^Diagnosis given/)
        .pressSequentially(summary.diagnosisGiven, { delay: 30 })
      for (const t of summary.testsOrdered) {
        await page.getByPlaceholder('e.g. CBC, lipid panel, MRI').fill(t)
        await page.getByRole('button', { name: 'Add', exact: true }).click()
      }
      await page.getByLabel(/^Treatment plan/).fill(summary.treatmentPlan)
      await page.getByLabel(/^Visit summary/).fill(summary.visitSummary)
      await page.getByLabel(/^Follow-up needed/).check()
      await page.getByLabel(/^Next appointment date/).fill(summary.nextAppointmentDate)

      await page.getByRole('button', { name: 'Mark Complete', exact: true }).click()

      // Modal closes after the PUT returns.
      await expect(summaryHeading).not.toBeVisible({ timeout: 60_000 })

      // === Firestore: status flipped + summary persisted ===
      const afterCompleteDoc = await appointmentsCol.doc(appointmentId).get()
      const afterComplete = afterCompleteDoc.data()
      expect(afterComplete?.status, 'status flipped to completed').toBe('completed')
      expect(afterComplete?.diagnosisGiven).toBe(summary.diagnosisGiven)
      expect(afterComplete?.testsOrdered).toEqual(summary.testsOrdered)
      expect(afterComplete?.treatmentPlan).toBe(summary.treatmentPlan)
      expect(afterComplete?.visitSummary).toBe(summary.visitSummary)
      expect(afterComplete?.followUpNeeded).toBe(true)
      expect(typeof afterComplete?.nextAppointmentDate).toBe('string')
      expect((afterComplete?.nextAppointmentDate as string).startsWith(summary.nextAppointmentDate)).toBe(true)
      expect(typeof afterComplete?.completedAt).toBe('string')
      // Pre-visit prep should still be present (not nuked by completion).
      expect(afterComplete?.preVisitNotes).toBe(prep.notes)
      expect(afterComplete?.preVisitQuestions).toEqual(prep.questions)

      // === Firestore: follow-up auto-created, parent backlinked ===
      const followUpId = afterComplete?.followUpAppointmentId as string | undefined
      expect(followUpId, 'parent has a followUpAppointmentId set').toBeTruthy()
      const followUpDoc = await appointmentsCol.doc(followUpId as string).get()
      expect(followUpDoc.exists, 'follow-up appointment exists in Firestore').toBe(true)
      const followUp = followUpDoc.data()
      expect(followUp?.parentAppointmentId).toBe(appointmentId)
      expect(followUp?.status).toBe('scheduled')
      expect(followUp?.type).toBe('follow-up')
      expect(followUp?.patientId).toBe(patientId)
      expect(followUp?.providerName).toBe(providerName)
      expect((followUp?.dateTime as string).startsWith(summary.nextAppointmentDate)).toBe(true)
      expect(followUp?.reason as string).toContain(reason)

      // === UI: row moves to Past with summary visible ===
      const pastHeading = page.getByRole('heading', { name: /^Past/, level: 3 })
      await expect(pastHeading).toBeVisible({ timeout: 30_000 })

      // Past cards have a different border class than upcoming.
      const pastCard = page
        .locator('div.border-border')
        .filter({ hasText: providerName })
        .filter({ hasText: summary.diagnosisGiven })
      await expect(pastCard).toBeVisible({ timeout: 10_000 })
      await expect(pastCard).toContainText('completed')
      await expect(pastCard).toContainText(summary.testsOrdered[0])
      await expect(pastCard).toContainText(summary.treatmentPlan)
      await expect(pastCard).toContainText('Follow-up needed')

      // ============= Calendar verification =============
      // Land on the family calendar deep-linked to this patient.
      // Asserts the URL filter is honored, the parent's marker
      // renders on its day, and clicking it actually navigates to
      // the appointment detail page (not just our test cheating
      // with page.goto).
      await page.goto(`/calendar?patientId=${patientId}`, { waitUntil: 'domcontentloaded' })

      // The calendar's patient-filter dropdown should pre-select
      // our patient, proving the ?patientId= param wired correctly.
      await expect(page.getByRole('combobox').first()).toHaveValue(patientId, {
        timeout: 30_000,
      })

      // Calendar groups by current month; the parent is at today+7
      // which is on the current view (today is May 10 in this test
      // env, parent at May 17 — same month).
      const parentMonthOfYear = futureDateTime.getMonth()
      const currentDisplayedMonth = new Date().getMonth()
      // If parent's month differs from today's month (e.g. test runs
      // late in the month), advance the calendar.
      if (parentMonthOfYear !== currentDisplayedMonth) {
        await page.getByRole('button', { name: /next month/i }).click()
      }

      // The parent's marker is a button labeled "HH:MM - PatientName"
      // inside the parent's day cell. Click it.
      const parentMarker = page
        .getByRole('button', { name: new RegExp(`${patientName}`, 'i') })
        .first()
      await expect(parentMarker).toBeVisible({ timeout: 10_000 })
      await parentMarker.click()
      await expect(page).toHaveURL(new RegExp(`/appointments/${appointmentId}`), { timeout: 10_000 })
      await page.waitForTimeout(5000)

      // Back to calendar — navigate directly so we don't depend on a
      // back-button affordance that may differ across detail pages.
      await page.goto(`/calendar?patientId=${patientId}`, { waitUntil: 'domcontentloaded' })

      // The follow-up is at today+56 (~8 weeks). Advance the calendar
      // forward until its month is in view.
      const followUpMonth = followUpDate.getMonth()
      const followUpYear = followUpDate.getFullYear()
      // Cap at 24 clicks to avoid infinite loops if something's off.
      for (let i = 0; i < 24; i++) {
        const heading = await page.getByRole('heading', { level: 2 }).first().textContent()
        if (
          heading &&
          heading.includes(followUpYear.toString()) &&
          heading.toLowerCase().includes(
            new Intl.DateTimeFormat('en-US', { month: 'long' })
              .format(followUpDate)
              .toLowerCase(),
          )
        ) {
          break
        }
        await page.getByRole('button', { name: /next month/i }).click()
        await page.waitForTimeout(200)
      }

      const followUpMarker = page
        .getByRole('button', { name: new RegExp(`${patientName}`, 'i') })
        .first()
      await expect(followUpMarker).toBeVisible({ timeout: 10_000 })
      await followUpMarker.click()
      await expect(page).toHaveURL(new RegExp(`/appointments/${followUpId}`), { timeout: 10_000 })
      await page.waitForTimeout(5000)

      // End on the active patient's detail page.
      await page.goto(`/patients/${patientId}`, { waitUntil: 'domcontentloaded' })

      if (process.env.KEEP_OPEN !== '0') {
        await page.pause()
      }
    } finally {
      // Cleanup: delete both the seeded parent and the auto-created
      // follow-up so reruns don't pile up. Each delete is best-effort.
      const parentDoc = await appointmentsCol.doc(appointmentId).get().catch(() => null)
      const followUpId = parentDoc?.exists
        ? (parentDoc.data()?.followUpAppointmentId as string | undefined)
        : undefined
      if (followUpId) await appointmentsCol.doc(followUpId).delete().catch(() => {})
      await appointmentsCol.doc(appointmentId).delete().catch(() => {})
    }
  })
})
