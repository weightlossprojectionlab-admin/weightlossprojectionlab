import { test, expect } from '@playwright/test'

/**
 * Smoke test — the serious-illness caregiver landing page (public marketing route).
 * Asserts the page renders its hero, feature sections, and that the CTA resolves
 * to the real signup entry (/auth). Runs on the public (main) baseURL project.
 */
test('serious illness landing page loads and meets smoke criteria', async ({ page }) => {
  await page.goto('/caregivers/serious-illness')

  // Hero heading
  await expect(page.locator('h1')).toContainText(
    'A companion for families coordinating serious illness care'
  )

  // Feature section headings (real-now surfaces)
  await expect(page.getByText('Appointments & schedule')).toBeVisible()
  await expect(page.getByText('Per-profile notes')).toBeVisible()
  await expect(page.getByText('Intentional permissions')).toBeVisible()

  // FAQ present
  await expect(
    page.getByRole('heading', { name: 'Frequently asked questions' })
  ).toBeVisible()

  // No competitor brand leaked onto the page
  await expect(page.getByText('Within Reach')).toHaveCount(0)

  // CTA resolves to the real signup entry
  const cta = page.locator('a[href="/auth"]').first()
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(page).toHaveURL(/\/auth/)
})
