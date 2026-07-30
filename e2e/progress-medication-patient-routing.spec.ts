/**
 * /progress medications — patient view routes to the canonical patient meds
 * surface, NOT the self-only modal (the save-target / PHI-misplacement fix).
 *
 * Before the fix, the medication "+ Add" on /progress opened a modal that saved
 * to /api/user-profile — the CALLER's own profile.medications array — so a med
 * added while viewing a family member landed on the caregiver's own record. Now,
 * when a patient is selected (?patientId=), the action is a link to
 * /patients/{id}?tab=medications, which reads/writes the patient's medications
 * subcollection under editMedications RBAC.
 *
 * Real-outcome HAST: seed a patient on the fixture owner, load
 * /progress?patientId={id}, assert the med action is an anchor to the patient
 * meds surface, and clicking it actually navigates there.
 */

import { test, expect } from './fixtures'

test.describe('Progress medications route to the patient surface @progress-meds', () => {
  test.setTimeout(3 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'not found', 'Error', 'onboarding'],
  })

  test('patient-view "Add" links to /patients/[id]?tab=medications (not the self modal)', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const pid = `e2e_meds_${stamp}`
    const ownerRef = firestore.collection('users').doc(ownerUserId)

    // A patient with goals so /progress renders its Health Profile (incl. the
    // medications row) rather than an onboarding/empty state.
    await ownerRef.collection('patients').doc(pid).set({
      name: `MedRoute ${stamp}`,
      relationship: 'parent',
      type: 'human',
      dateOfBirth: '1970-01-01',
      gender: 'male',
      height: 70, // required — /progress shows a "complete onboarding" gate without it
      userId: ownerUserId,
      status: 'active',
      goals: {
        dailyCalorieGoal: 2000,
        dailySteps: 8000,
        startWeight: 200,
        targetWeight: 180,
        weeklyWeightLossGoal: 1,
      },
      profile: { currentWeight: 200, healthConditions: [] },
    })
    // A med in the patient's SUBCOLLECTION (where patient meds live) — the
    // display-read fix must surface this, not the empty profile.medications.
    const medName = `Lisinopril ${stamp}`
    await ownerRef.collection('patients').doc(pid).collection('medications').doc(`e2e_med_${stamp}`).set({
      name: medName, strength: '10mg', patientId: pid, userId: ownerUserId,
      addedAt: new Date().toISOString(),
    })

    const cleanup = async () => {
      await ownerRef.collection('patients').doc(pid).collection('medications').doc(`e2e_med_${stamp}`).delete().catch(() => {})
      await ownerRef.collection('patients').doc(pid).delete().catch(() => {})
    }

    try {
      await page.goto(`/progress?patientId=${pid}`, { waitUntil: 'domcontentloaded' })

      // Display-read: the patient's subcollection med must render here (was
      // showing "No medications added yet" because it read profile.medications).
      await expect(page.getByText(medName), 'patient subcollection med displays').toBeVisible({
        timeout: 60_000,
      })

      // The medication action for a patient must be an anchor to the canonical
      // meds surface — proves it's no longer the self-writing modal.
      const medLink = page.locator(`a[href="/patients/${pid}?tab=medications"]`)
      await expect(medLink.first(), 'patient med action links to the patient surface').toBeVisible({
        timeout: 30_000,
      })

      // And it genuinely navigates there when clicked. Poll the URL only
      // (toHaveURL) rather than waiting for the heavy patient page's load event.
      await medLink.first().click()
      await expect(page).toHaveURL(new RegExp(`/patients/${pid}`), { timeout: 30_000 })
    } finally {
      await cleanup()
    }
  })
})
