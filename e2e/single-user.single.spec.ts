import { test, expect } from './fixtures'

/**
 * Single-user mode — verifies the multi-member/household UI does NOT
 * appear for a `single`-plan account (capped at 1 patient, 1 household),
 * and that the recent household-scoping + member-switcher fixes are
 * correctly inert for solo users.
 *
 * Runs under the chromium-single project (storageState =
 * e2e/.auth/single.json), signed in as the provisioned single-plan
 * fixture (scripts/provision-single-user-e2e.ts → "Solo Sam").
 *
 * Run:
 *   npx playwright test e2e/single-user.single.spec.ts --project=chromium-single
 */

const SELF = 'Solo Sam'

test.describe('Single-user mode — no multi-member UI', () => {
  test.setTimeout(120_000)

  test('/patients shows the one member, no household scope chips or switcher', async ({ page }) => {
    await page.goto('/patients', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 })

    // The solo member is listed.
    await expect(page.getByText(SELF, { exact: false }).first()).toBeVisible({ timeout: 30_000 })

    // Household scoping UI must be ABSENT (gated on households.length >= 2;
    // a single-plan account caps at 1 household).
    await expect(page.getByText('Showing:', { exact: false })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^All households/ })).toHaveCount(0)

    // The header household switcher renders only at 2+ households —
    // its "Select Household" / household-name button must be absent.
    await expect(page.getByRole('button', { name: /Select Household/i })).toHaveCount(0)

    console.log('→ Single-user /patients OK: member shown, no scope chips, no switcher')
    await page.waitForTimeout(1500)
  })

  test('/progress shows the member with NO member selector', async ({ page }) => {
    await page.goto('/progress', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 })

    // The member-picker dropdown only renders at 2+ patients; a solo
    // account auto-selects its one patient, so the "Pick a family
    // member…" option must not exist.
    await expect(page.getByText('Pick a family member…', { exact: false })).toHaveCount(0)

    console.log('→ Single-user /progress OK: no member selector')
    await page.waitForTimeout(1500)
  })
})
