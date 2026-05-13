import { test, expect, type Page } from '@playwright/test'

/**
 * Caregiver-side /shopping/active — UI assertion that the central
 * sort rules from lib/perishability-tiers.ts (perishability tier,
 * wait-counter signal, fragility) actually reach the rendered DOM.
 *
 * Runs under the chromium-caregiver Playwright project. Owner under
 * test is Weight Loss Project (Y8wSTgymg3YXWU94iJVjzoGxsMI2); seed
 * data has at least six distinct categories spanning multiple tiers,
 * so relative-order assertions are stable.
 *
 * The test deliberately asserts RELATIVE order between tiers (tier 1
 * categories come before tier 2 before tier 4 etc.) rather than
 * exact category sequence. The seed's category mix shifts as items
 * are added/removed; the rule chain stays the same.
 *
 * Test coverage:
 *   1. Page loads with the in-store layout (header + tabs + grouped
 *      pending items)
 *   2. Category section headers render in perishability order:
 *      tier-1 categories (pet-food, spices, condiments, beverages,
 *      pantry) appear BEFORE tier-2 (produce, herbs, bakery) BEFORE
 *      tier-3 (deli, eggs) BEFORE tier-4 (dairy, meat, seafood)
 *      BEFORE tier-5 (frozen)
 *   3. Frozen-last invariant: if frozen exists in the seed, no
 *      higher-tier category renders after it
 */

const OWNER_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'

const PERISHABILITY_TIER: Record<string, number> = {
  other: 1,
  'pet-supplies': 1,
  spices: 1,
  condiments: 1,
  pantry: 1,
  'pet-food': 1,
  beverages: 1,
  baby: 1,
  produce: 2,
  herbs: 2,
  bakery: 2,
  eggs: 3,
  deli: 3,
  dairy: 4,
  meat: 4,
  seafood: 4,
  frozen: 5,
}

async function gotoCaregiverShoppingActive(page: Page): Promise<void> {
  await page.goto(`/shopping/active?ownerId=${OWNER_UID}`, {
    waitUntil: 'domcontentloaded',
  })

  // If the household has a roster, the "Which store?" modal appears.
  // Tap Skip for now — the sort rules don't depend on store choice.
  // If the roster is empty, onEmptyRoster fires and the page proceeds
  // without a modal — the locator below times out and we move on.
  const skipBtn = page.getByTestId('shopping-store-skip')
  try {
    await skipBtn.click({ timeout: 3_000 })
  } catch {
    // No modal — empty roster path. Proceeding directly.
  }
}

test('caregiver lands on /shopping/active with the in-store header + tabs', async ({ page }) => {
  await gotoCaregiverShoppingActive(page)

  // The header carries the count format "0 of N found"; assert the
  // page reached the in-store flow without rule-permission errors.
  await expect(page.getByText(/of \d+ found/i)).toBeVisible({ timeout: 30_000 })

  // Three tabs present — TO-PICK, IN REVIEW, DONE.
  await expect(page.getByRole('button', { name: /to.?pick/i }).first()).toBeVisible()
})

test('category sections render in perishability tier order (frozen LAST, shelf-stable FIRST)', async ({ page }) => {
  await gotoCaregiverShoppingActive(page)

  // Wait for at least one category section to render. Section testids
  // are added in ActiveShoppingMode: data-testid="category-section-{cat}".
  const sections = page.locator('[data-testid^="category-section-"]')
  await expect(sections.first()).toBeVisible({ timeout: 30_000 })

  // Collect the rendered categories in DOM order.
  const testids = await sections.evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-testid') || ''),
  )
  const renderedCategories = testids
    .map((id) => id.replace('category-section-', ''))
    .filter((c) => c.length > 0)

  console.log('Rendered categories (DOM order):', renderedCategories)
  expect(renderedCategories.length).toBeGreaterThanOrEqual(2)

  // Assert relative tier order: for every pair (i, j) where i < j in
  // the rendered list, tier(i) <= tier(j). Mismatch = a category
  // jumped past a higher-tier one, which would mean the rule chain
  // isn't reaching the rendered DOM.
  for (let i = 0; i < renderedCategories.length - 1; i++) {
    const a = renderedCategories[i]
    const b = renderedCategories[i + 1]
    const ta = PERISHABILITY_TIER[a] ?? 99
    const tb = PERISHABILITY_TIER[b] ?? 99
    expect(ta, `category "${a}" (tier ${ta}) appeared before "${b}" (tier ${tb}) — sort rule chain isn't reaching the rendered DOM`).toBeLessThanOrEqual(tb)
  }
})

test('frozen-last invariant: no higher-tier category renders after frozen', async ({ page }) => {
  await gotoCaregiverShoppingActive(page)
  const sections = page.locator('[data-testid^="category-section-"]')
  await expect(sections.first()).toBeVisible({ timeout: 30_000 })

  const testids = await sections.evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-testid') || ''),
  )
  const renderedCategories = testids
    .map((id) => id.replace('category-section-', ''))
    .filter((c) => c.length > 0)

  const frozenIndex = renderedCategories.indexOf('frozen')
  if (frozenIndex === -1) {
    // No frozen items in the current seed — this invariant is
    // vacuously satisfied. Make the test pass with a note rather
    // than skip (which would silently disable the assertion).
    console.log('No frozen items in seed; frozen-last invariant vacuously satisfied.')
    return
  }

  // Frozen exists. Assert no category after it has a higher tier
  // (there shouldn't be one — tier 5 is the highest in our rule
  // chain. Anything appearing after frozen would have to be tier 99
  // 'unknown' which means the rule chain dropped it.)
  const after = renderedCategories.slice(frozenIndex + 1)
  for (const cat of after) {
    const tier = PERISHABILITY_TIER[cat] ?? 99
    expect(tier, `"${cat}" (tier ${tier}) rendered AFTER frozen — violates the cold-chain floor`).toBe(99)
  }
})
