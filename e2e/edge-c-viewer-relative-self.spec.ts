/**
 * Account-seats Phase 2 / Edge C — "self" is viewer-relative.
 *
 * A patient who is `relationship:'self'` in ANOTHER account, reached via
 * caregiver access, must NOT render "You" to the caregiver — only the viewer's
 * OWN self does. Mirrors the confirmed Jimmy repro (Percy caregives for an
 * account whose self is Jimmy → Jimmy wrongly showed "You").
 */

import { test, expect } from './fixtures'

test.describe('Edge C: viewer-relative self @edge-c', () => {
  test.setTimeout(3 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('caregiver-access self does not render "You"; owner self does', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const otherOwner = `e2e_edgec_owner_${stamp}`
    const cgSelfPat = `e2e_edgec_cgself_${stamp}`
    const memberId = `e2e_edgec_fm_${stamp}`
    const mySelfPat = `e2e_edgec_myself_${stamp}`
    const cgName = `Caregiver Self ${stamp}`
    const myName = `My Self ${stamp}`

    const otherRef = firestore.collection('users').doc(otherOwner)
    const myRef = firestore.collection('users').doc(ownerUserId)

    // A patient who is `self` in ANOTHER owner's account, that the viewer
    // caregives for (accepted familyMembers grant with patientsAccess).
    await otherRef.collection('patients').doc(cgSelfPat).set({
      name: cgName, relationship: 'self', type: 'human',
      dateOfBirth: '1990-01-01', gender: 'male', userId: otherOwner, status: 'active',
    })
    await otherRef.collection('familyMembers').doc(memberId).set({
      userId: ownerUserId, status: 'accepted', patientsAccess: [cgSelfPat],
      permissions: { viewPatientProfile: true, viewMedicalRecords: true },
      name: 'Viewer', relationship: 'family',
    })
    // The viewer's OWN self — must still read "You".
    await myRef.collection('patients').doc(mySelfPat).set({
      name: myName, relationship: 'self', type: 'human',
      dateOfBirth: '1990-01-01', gender: 'male', userId: ownerUserId, status: 'active',
    })

    const cleanup = async () => {
      await otherRef.collection('patients').doc(cgSelfPat).delete().catch(() => {})
      await otherRef.collection('familyMembers').doc(memberId).delete().catch(() => {})
      await myRef.collection('patients').doc(mySelfPat).delete().catch(() => {})
    }

    try {
      // The "Select Family Member" list renders getPatientBadgeLabel per patient.
      await page.goto('/appointments/new', { waitUntil: 'domcontentloaded' })

      // Caregiver-access self -> neutral life-stage ("Adult"), NEVER "You".
      const cgBtn = page.getByRole('button', { name: new RegExp(cgName) })
      await cgBtn.waitFor({ state: 'visible', timeout: 60_000 })
      await expect(cgBtn, 'caregiver-access self shows life-stage, not "You"').toContainText('Adult')
      await expect(cgBtn, 'caregiver-access self must NOT say "You"').not.toContainText('You')

      // The viewer's OWN self still reads "You".
      const myBtn = page.getByRole('button', { name: new RegExp(myName) })
      await expect(myBtn).toBeVisible()
      await expect(myBtn, 'owner self still reads "You"').toContainText('You')
    } finally {
      await cleanup()
    }
  })
})
