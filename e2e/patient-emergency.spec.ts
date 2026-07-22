import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'

/**
 * Emergency layer on the patient page.
 *
 * Verifies the one-tap entry point end-to-end WITHOUT firing a real family alert
 * (sendEmergencyAlert writes notifications + push): the flow is button -> prompt
 * modal -> dismiss -> unlock gate -> assembled read-only view. Deliberately clicks
 * "View emergency info" / "Open emergency info", never "Alert family members", so the
 * test mutates nothing.
 *
 * The assembled record sits behind EmergencyUnlockGate (audit + biometric-first). The
 * fixture caregiver has no biometric credential registered, so the gate FAILS OPEN to a
 * single deliberate "Open emergency info" tap — the availability-first behaviour we want.
 *
 * Data-agnostic: asserts the section labels + a "None recorded" empty state, so it holds
 * regardless of whether the fixture patient has emergency fields populated.
 */

async function openEmergency(page: Page, gotoPatientTab: (tab: string) => Promise<void>) {
  await gotoPatientTab('info') // land on the patient page (any tab)
  // The button's accessible name includes the 🚨 emoji ("🚨 Emergency"); match by
  // substring rather than exact. It's the only button carrying "Emergency" before
  // the modal opens.
  const emergencyBtn = page.getByRole('button', { name: 'Emergency' })
  await expect(emergencyBtn).toBeVisible({ timeout: 30_000 })
  await emergencyBtn.click()
}

// Pass the unlock gate. The fixture caregiver has no biometric registered, so the gate
// fails open — one deliberate tap reveals the record.
async function passUnlockGate(page: Page) {
  await expect(page.getByRole('heading', { name: /Emergency access/i })).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: /Open emergency info/i }).click()
}

test.describe('Patient page — Emergency layer', () => {
  test('Emergency action opens the alert prompt, then unlocks the read-only emergency view', async ({ page, gotoPatientTab }) => {
    await openEmergency(page, gotoPatientTab)

    // 1. The prompt modal with its three choices (scoped to the dialog — the same
    //    actions also exist in the view behind it).
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 10_000 })
    await expect(dialog.getByRole('heading', { name: /Emergency —/i })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Alert family members/i })).toBeVisible()
    await expect(dialog.getByRole('link', { name: /Call 911/i })).toBeVisible()

    // 2. Dismiss to the gated view (NOT the alert button — no real notification), then
    //    pass the unlock gate.
    await dialog.getByRole('button', { name: /View emergency info/i }).click()
    await passUnlockGate(page)

    // 3. The read-only emergency view assembles the must-knows.
    await expect(page.getByRole('heading', { name: /Emergency Info/i })).toBeVisible({ timeout: 10_000 })
    for (const label of ['Drug allergies', 'Code status', 'Conditions', 'Medications', 'Emergency contacts']) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible()
    }

    // The persistent in-view alert action survives the modal being dismissed.
    await expect(page.getByRole('button', { name: /Alert family members/i })).toBeVisible()
  })

  test('summoning help is never gated — Alert family + Call 911 stay reachable while the record is locked', async ({ page, gotoPatientTab }) => {
    await openEmergency(page, gotoPatientTab)

    // Dismiss the prompt WITHOUT unlocking (X / Close), leaving the gate up.
    await page.getByRole('dialog').getByRole('button', { name: /Close/i }).click()

    // The sensitive record is withheld behind the gate...
    await expect(page.getByRole('heading', { name: /Emergency access/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /Emergency Info/i })).toHaveCount(0)

    // ...but calling for help must never wait on an unlock: both live above the gate.
    await expect(page.getByRole('button', { name: /Alert family members/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Call 911/i }).first()).toBeVisible()
  })

  test('code status is read-only in the emergency view (directs editing to the Info tab)', async ({ page, gotoPatientTab }) => {
    await openEmergency(page, gotoPatientTab)
    await page.getByRole('dialog').getByRole('button', { name: /View emergency info/i }).click()
    await passUnlockGate(page)
    await expect(page.getByRole('heading', { name: /Emergency Info/i })).toBeVisible({ timeout: 10_000 })

    // The emergency view must not let anyone SET an advance decision like DNR under
    // stress — it's read-only. For a patient with no code status on file, the view
    // shows an empty state that points editing back to the calm Info tab. That copy
    // is proof the field can't be authored here.
    await expect(page.getByText(/set it in advance from the Info tab/i)).toBeVisible({ timeout: 10_000 })
    // And the Info-tab editor's label ("Code status (advance decision)") is NOT here.
    await expect(page.getByText('Code status (advance decision)')).toHaveCount(0)
  })
})
