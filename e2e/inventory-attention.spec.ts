/**
 * Inventory Attention ranking + discard-badge UI gate.
 *
 * Verifies the Phase 1 wiring end-to-end against four seeded "corner" items
 * (run scripts/seed-attention-e2e.ts first):
 *   • the main list is sorted by compareAttention (expired → low → spoiling → plenty)
 *   • the expired item shows a DISCARD badge (distinct from use-soon)
 *   • spoiling → "Use soon", low-stock → "Restock", plentiful → no badge
 */
import { test, expect, type Locator } from '@playwright/test'

const ITEM = {
  expired: 'E2E Expired Yogurt',
  low: 'E2E Low Coffee',
  spoiling: 'E2E Spoiling Bananas',
  plenty: 'E2E Plenty Rice',
}

// The list item card is a role="button" div containing the product name.
const card = (page: import('@playwright/test').Page, name: string): Locator =>
  page.locator('div[role="button"]', { hasText: name }).first()

test('inventory list ranks by attention and flags discard distinctly', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/inventory', { waitUntil: 'domcontentloaded' })

  // The dev server can surface an unrelated console error (e.g. a transient
  // /patients 401 from the members fetch) as a Next.js dev overlay that sits
  // over the page. Dismiss it — the inventory list loads from Firestore
  // independently of that API call.
  await page.keyboard.press('Escape').catch(() => {})

  // Wait out the cold compile of /inventory + the new attention module.
  await expect(card(page, ITEM.expired)).toBeVisible({ timeout: 90_000 })
  for (const name of Object.values(ITEM)) {
    await expect(card(page, name)).toBeVisible({ timeout: 30_000 })
  }

  // --- Badges on the right items ---
  await expect(card(page, ITEM.expired).getByText('Discard', { exact: true })).toBeVisible()
  await expect(card(page, ITEM.spoiling).getByText('Use soon', { exact: true })).toBeVisible()
  await expect(card(page, ITEM.low).getByText('Restock', { exact: true })).toBeVisible()

  // Plentiful item carries no action badge.
  for (const label of ['Discard', 'Use soon', 'Restock']) {
    await expect(card(page, ITEM.plenty).getByText(label, { exact: true })).toHaveCount(0)
  }

  // --- Composite ranking order (vertical position): expired < low < spoiling < plenty ---
  const topY = async (name: string): Promise<number> => {
    const box = await card(page, name).boundingBox()
    if (!box) throw new Error(`no bounding box for ${name}`)
    return box.y
  }
  const [yExpired, yLow, ySpoiling, yPlenty] = await Promise.all([
    topY(ITEM.expired),
    topY(ITEM.low),
    topY(ITEM.spoiling),
    topY(ITEM.plenty),
  ])
  expect(yExpired).toBeLessThan(yLow)
  expect(yLow).toBeLessThan(ySpoiling)
  expect(ySpoiling).toBeLessThan(yPlenty)
})
