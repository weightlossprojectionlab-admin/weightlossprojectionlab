/**
 * E2E for deleting stale invitations from /family/dashboard (owner-side).
 *
 * Seeds a REVOKED invitation from the E2E owner, opens the invitations tab,
 * clicks Delete on that card, and asserts the familyInvitations doc is gone.
 * Also verifies an ACCEPTED invitation offers no Delete (kept as history).
 */

import { Timestamp } from 'firebase-admin/firestore'
import { test, expect } from './fixtures'

test.describe('Delete stale invitations @delete-invites', () => {
  test.setTimeout(4 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  const seedInvite = async (
    firestore: any,
    ownerUserId: string,
    email: string,
    status: string,
    stamp: number,
  ) => {
    const invRef = firestore.collection('familyInvitations').doc()
    await invRef.set({
      inviteCode: `E2EDEL${stamp}`,
      recipientEmail: email,
      invitedByUserId: ownerUserId,
      invitedByName: 'E2E Owner',
      patientsShared: [],
      permissions: { viewMedicalRecords: true, logVitals: false },
      familyRole: 'caregiver',
      status,
      createdAt: Timestamp.now(),
      expiresAt: new Date(stamp + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    return invRef
  }

  test('sender can delete a revoked invitation', async ({ page, ownerUserId, firestore }) => {
    const stamp = Date.now()
    const email = `e2e-del-${stamp}@example.com`
    const invRef = await seedInvite(firestore, ownerUserId, email, 'revoked', stamp)

    try {
      await page.goto('/family/dashboard?tab=invitations', { waitUntil: 'domcontentloaded' })

      const card = page.locator('.bg-card', { hasText: email })
      await expect(card).toBeVisible({ timeout: 90_000 })

      await card.getByRole('button', { name: /^delete$/i }).click()

      // Generous timeout: the DELETE route compiles on first hit in dev.
      await expect
        .poll(async () => (await invRef.get()).exists, {
          timeout: 60_000,
          message: 'revoked invitation should be hard-deleted',
        })
        .toBe(false)
    } finally {
      await invRef.delete().catch(() => {})
    }
  })

  test('accepted invitations are kept (no Delete offered)', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now() + 1
    const email = `e2e-keep-${stamp}@example.com`
    const invRef = await seedInvite(firestore, ownerUserId, email, 'accepted', stamp)

    try {
      await page.goto('/family/dashboard?tab=invitations', { waitUntil: 'domcontentloaded' })

      const card = page.locator('.bg-card', { hasText: email })
      await expect(card).toBeVisible({ timeout: 90_000 })

      // Accepted rows show the history line, not a Delete button.
      await expect(card.getByRole('button', { name: /^delete$/i })).toHaveCount(0)
      await expect(card.getByText(/has been accepted/i)).toBeVisible()
    } finally {
      await invRef.delete().catch(() => {})
    }
  })
})
