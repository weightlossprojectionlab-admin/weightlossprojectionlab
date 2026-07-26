/**
 * E2E for batch family invites on /family/dashboard.
 *
 *  1. Invite several people at once — fill one invitee, "Add another person"
 *     (which clones the first row's member selection + permissions), fill the
 *     second email, send both, and assert TWO familyInvitations were created.
 *  2. The self-invite guard blocks using your own email (no self-caregiver).
 *
 * Owner-side (chromium). Seeded invitations are torn down in finally.
 */

import { test, expect } from './fixtures'

test.describe('Batch family invites @batch-invites', () => {
  test.setTimeout(6 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  const openInvite = async (page: any) => {
    await page.goto('/family/dashboard?tab=members', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /invite caregiver/i }).first().click({ timeout: 90_000 })
    await expect(page.getByPlaceholder('family.member@example.com').first()).toBeVisible({
      timeout: 20_000,
    })
  }

  const patientNameOf = async (firestore: any, ownerUserId: string, patientId: string) => {
    const d = (
      await firestore.collection('users').doc(ownerUserId).collection('patients').doc(patientId).get()
    ).data()
    return (d?.name as string) || ''
  }

  test('invites multiple people at once', async ({ page, ownerUserId, patientId, firestore }) => {
    const stamp = Date.now()
    const email1 = `e2e-batch-a-${stamp}@example.com`
    const email2 = `e2e-batch-b-${stamp}@example.com`
    const invs = firestore.collection('familyInvitations')

    const patientName = await patientNameOf(firestore, ownerUserId, patientId)
    expect(patientName, 'test patient should have a name').toBeTruthy()

    const cleanup = async () => {
      const snap = await invs.where('invitedByUserId', '==', ownerUserId).get()
      await Promise.all(
        snap.docs
          .filter((d: any) => [email1, email2].includes(d.data().recipientEmail))
          .map((d: any) => d.ref.delete().catch(() => {})),
      )
    }
    await cleanup()

    try {
      await openInvite(page)
      const emails = page.getByPlaceholder('family.member@example.com')

      // Invitee #1 — email + pick a family member to share.
      await emails.first().fill(email1)
      await page.getByRole('checkbox', { name: patientName }).first().check()

      // Invitee #2 — clones #1's member selection + permissions; just the email.
      await page.getByRole('button', { name: /add another person/i }).click()
      await emails.nth(1).fill(email2)

      await page.getByRole('button', { name: /send 2 invitations/i }).click()

      await expect
        .poll(
          async () => {
            const snap = await invs.where('invitedByUserId', '==', ownerUserId).get()
            const set = new Set(snap.docs.map((d: any) => d.data().recipientEmail))
            return [email1, email2].every((e) => set.has(e))
          },
          { timeout: 25_000, message: 'both batch invitations should be created' },
        )
        .toBe(true)
    } finally {
      await cleanup()
    }
  })

  test('blocks inviting yourself', async ({ page, ownerUserId, patientId, firestore }) => {
    const myEmail = process.env.E2E_TEST_USER_EMAIL as string
    expect(myEmail, 'E2E_TEST_USER_EMAIL must be set').toBeTruthy()
    const patientName = await patientNameOf(firestore, ownerUserId, patientId)

    await openInvite(page)
    await page.getByPlaceholder('family.member@example.com').first().fill(myEmail)
    await page.getByRole('checkbox', { name: patientName }).first().check()
    await page.getByRole('button', { name: /send invitation/i }).click()

    // Blocked inline — the send never fires.
    await expect(page.getByText(/can't invite yourself/i)).toBeVisible({ timeout: 10_000 })
  })
})
