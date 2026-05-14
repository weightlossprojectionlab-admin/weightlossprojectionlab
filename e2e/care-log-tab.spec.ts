import { test, expect } from './fixtures'

/**
 * Owner-side Care Log tab — UI smoke.
 *
 * What's tested:
 *   1. The "📝 Care Log" tab renders on /family/dashboard.
 *   2. Clicking it reveals the composer.
 *   3. Typing + submitting posts a note that appears in the feed within
 *      a few seconds (real-time onSnapshot delivers it back).
 *   4. A unique timestamp in the body lets us prove this run's post
 *      surfaced (not just any old note).
 *
 * The fixture user signs in as the household owner — they post on
 * their own household ledger. Caregiver-side flow (posting from the
 * shift view) needs a second fixture user and is deferred. The
 * underlying primitives are exercised by scripts/test-caregiver-apis.ts.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/family/dashboard?tab=notes', { waitUntil: 'domcontentloaded' })
})

test('Care Log tab loads with composer + feed', async ({ page }) => {
  // The tab itself is rendered as a button (not a [role="tab"]) so we
  // match by visible text. There are several tab buttons; we just need
  // the Care Log one.
  await expect(page.getByRole('button', { name: /Care Log/i })).toBeVisible({ timeout: 30_000 })

  // Composer should be the placeholder textarea — keyed by its visible
  // placeholder text so an unrelated textarea elsewhere on the page
  // can't accidentally satisfy this.
  const composer = page.getByPlaceholder(/Share what's happening with .+ family care/i)
  await expect(composer).toBeVisible({ timeout: 30_000 })

  // The Post button is rendered as "Add to log" after the rename.
  await expect(page.getByRole('button', { name: /Add to log/i })).toBeVisible()
})

test('post a note from the composer → note appears in the feed', async ({ page }) => {
  const stamp = `e2e ui probe ${Date.now()}`

  const composer = page.getByPlaceholder(/Share what's happening with .+ family care/i)
  await composer.waitFor({ state: 'visible', timeout: 30_000 })
  await composer.fill(stamp)

  // Submit. The button enables only when the textarea has a non-empty
  // trimmed value, so we already met that bar by fill()ing.
  await page.getByRole('button', { name: /Add to log/i }).click()

  // The hook refetches after a successful post AND the onSnapshot
  // listener fires when the notification row lands — either path puts
  // the note in the feed. Give it a generous window for the round-trip
  // (Turbopack-cold-compile + Firestore + listener).
  await expect(page.getByText(stamp, { exact: false })).toBeVisible({ timeout: 30_000 })
})
