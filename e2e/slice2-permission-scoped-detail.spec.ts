/**
 * Account-seats Phase 2 / Slice 2 — permission-scoped patient detail page.
 *
 * The detail page is already gated (vitals/meds/docs/profile via
 * usePatientPermissions). This asserts the appointments-surface gaps we closed:
 * the "Schedule Appt" quick-action is hidden for a seat WITHOUT
 * scheduleAppointments, and shown for one WITH it. Two separate accounts +
 * fresh navigations (reload+refetch renders flakily on this heavy caregiver
 * page). AppointmentList's Delete is gated on canDeleteAppointments via the same
 * hook — code-reviewed; not e2e'd here (a caregiver's appointment list is
 * owner-scoped, so nothing renders to click).
 */

import { test, expect } from './fixtures'

test.describe('Slice 2: permission-scoped detail page @slice2', () => {
  test.setTimeout(6 * 60_000)
  test.use({
    // A caregiver viewing another account's patient triggers client-side
    // Firestore listeners (meal/weight/etc.) that hit "insufficient permissions"
    // — cross-account client reads are blocked by security rules (a known
    // caregiver limitation; access is enforced server-side). Whitelist that
    // expected noise so it doesn't mask the gating assertion.
    expectedApiErrorCodes: [
      'Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching', 'not found',
      'insufficient permissions', 'listener', 'PatientDetail', 'weightLog', 'Error in',
    ],
  })

  test('Schedule Appt is hidden for a view-only caregiver, shown when granted', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const scheduleBtn = () => page.getByRole('button', { name: /Schedule Appt/i })

    // Seed a patient in `owner`'s account + a caregiver grant (the fixture user)
    // with the given scheduleAppointments permission. Returns cleanup.
    const seed = async (tag: string, canSchedule: boolean) => {
      const owner = `e2e_s2_${tag}_owner_${stamp}`
      const pat = `e2e_s2_${tag}_pat_${stamp}`
      const memberId = `e2e_s2_${tag}_fm_${stamp}`
      const name = `Slice2 ${tag} ${stamp}`
      const ref = firestore.collection('users').doc(owner)
      await ref.collection('patients').doc(pat).set({
        name, relationship: 'parent', type: 'human',
        dateOfBirth: '1970-01-01', gender: 'female', userId: owner, status: 'active',
      })
      await ref.collection('familyMembers').doc(memberId).set({
        userId: ownerUserId, status: 'accepted', patientsAccess: [pat],
        name: 'Viewer', relationship: 'family',
        permissions: { viewPatientProfile: true, viewMedicalRecords: true, viewVitals: true, scheduleAppointments: canSchedule },
      })
      const cleanup = async () => {
        await ref.collection('familyMembers').doc(memberId).delete().catch(() => {})
        await ref.collection('patients').doc(pat).delete().catch(() => {})
      }
      return { pat, name, cleanup }
    }

    const viewOnly = await seed('viewonly', false)
    const scheduler = await seed('scheduler', true)

    try {
      // View-only caregiver: the detail page loads, but no "Schedule Appt".
      await page.goto(`/patients/${viewOnly.pat}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByText(viewOnly.name).first(), 'caregiver can view the patient').toBeVisible({ timeout: 120_000 })
      await expect(scheduleBtn(), 'view-only caregiver: no Schedule Appt').toHaveCount(0)

      // Caregiver WITH scheduleAppointments: the control is present.
      await page.goto(`/patients/${scheduler.pat}`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByText(scheduler.name).first()).toBeVisible({ timeout: 120_000 })
      await expect(scheduleBtn(), 'granted caregiver: Schedule Appt shows').toBeVisible({ timeout: 30_000 })
    } finally {
      await viewOnly.cleanup()
      await scheduler.cleanup()
    }
  })
})
