/**
 * Inventory health-layer UI gates — the visible surfaces of the demand weight D
 * and the per-item deep-link. Run scripts/seed-attention-e2e.ts first; it seeds
 * `E2E Sugary Cereal` (a nutrient panel: sodium/sugars/satFat, basis 100g) and a
 * household member with `["Type 2 Diabetes"]` (a REAL-WORLD condition string, so
 * this also proves normalizeCondition end-to-end).
 *
 * Covers three things shipped without UI proof:
 *   • the caregiver health NOTE ("High in sugar — best to limit for …")
 *   • the details NUTRITION FACTS rows (sodium/sugars/saturated fat) + "per 100 g"
 *   • the item DEEP-LINK (?tab=details&item=<id>) surviving a refresh
 */
import { test, expect, type Locator, type Page } from '@playwright/test'

// List item card is a role="button" div containing the product name.
const card = (page: Page, name: string): Locator =>
  page.locator('div[role="button"]', { hasText: name }).first()

// Dismiss the transient Next.js dev overlay (a stray /patients 401 can surface
// one over the page); the list loads from Firestore independently of it.
async function openInventory(page: Page) {
  await page.goto('/inventory', { waitUntil: 'domcontentloaded' })
  await page.keyboard.press('Escape').catch(() => {})
}

test('sugary item shows the caregiver health note for a diabetic member', async ({ page }) => {
  test.setTimeout(120_000)
  await openInventory(page)

  const sugar = card(page, 'E2E Sugary Cereal')
  await expect(sugar).toBeVisible({ timeout: 90_000 })

  // The note depends on a SECOND async fetch (getPatients → /patients API →
  // members → score). On a cold server that API route compiles on first call,
  // so allow generous room beyond the item snapshot's first paint.
  await expect(sugar.getByText(/high in sugar/i)).toBeVisible({ timeout: 30_000 })
  await expect(sugar.getByText(/best to limit for E2E Allergy Kid/i)).toBeVisible({ timeout: 30_000 })
})

test('item details surface sodium / sugars / saturated fat and a per-100g label', async ({ page }) => {
  test.setTimeout(120_000)
  await openInventory(page)

  const sugar = card(page, 'E2E Sugary Cereal')
  await expect(sugar).toBeVisible({ timeout: 90_000 })
  await sugar.click()

  // Now on the Item Details tab — the Nutrition Facts card.
  await expect(page.getByText('Nutrition facts', { exact: false })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('per 100 g')).toBeVisible()
  await expect(page.getByText('Sodium', { exact: true })).toBeVisible()
  await expect(page.getByText('Total sugars', { exact: true })).toBeVisible()
  await expect(page.getByText('Saturated fat', { exact: true })).toBeVisible()
  // Seeded sugar value (40 g) renders — and only sugars is 40, so this is unambiguous.
  await expect(page.getByText('40 g').first()).toBeVisible()
})

test('opening an item deep-links ?item= and survives a reload', async ({ page }) => {
  test.setTimeout(120_000)
  await openInventory(page)

  const rice = card(page, 'E2E Plenty Rice')
  await expect(rice).toBeVisible({ timeout: 90_000 })
  await rice.click()

  // The open item is now reflected in the URL.
  await expect(page).toHaveURL(/tab=details/, { timeout: 15_000 })
  await expect(page).toHaveURL(/item=/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'E2E Plenty Rice' })).toBeVisible({ timeout: 15_000 })

  // Reload: the item must reopen from the URL, not drop to the empty picker.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.keyboard.press('Escape').catch(() => {})
  await expect(page.getByRole('heading', { name: 'E2E Plenty Rice' })).toBeVisible({ timeout: 60_000 })
})
