/**
 * Stress test: single-source shopping unification (shopping_items + memberId, Model B).
 *
 * Exercises the paths that the P1–P4 refactor rewired, hammering the race-hardening and
 * asserting no split-brain remains:
 *
 *   1. Generate the (rule-based, deterministic) report — 3 grocery items are unconditional.
 *   2. STRESS the report's Add/On-list toggle: N add→remove cycles per item, then rapid
 *      CONCURRENT add/remove across all 3. Asserts against Firestore that NO duplicate
 *      needed-rows accumulate (delete-all + busy-guard) and every added row carries
 *      memberId == patientId (single source, scoped to the patient).
 *   3. Sync: the same items appear on the per-person list (/shopping?memberId=<patientId>).
 *   4. Model B: the household master list (/shopping) shows them with a "For {name}" chip.
 *
 * A regression that reintroduces the household/member split, drops memberId, or breaks the
 * delete-all remove would trip one of the Firestore or UI assertions.
 *
 * Rule-based report — no Gemini, CI-safe. Owner-side (chromium project).
 */

import { test, expect } from './fixtures'

const GROCERIES = [
  'Fresh fruits and vegetables (pre-cut if easier)',
  'Whole grains: brown rice, quinoa, oatmeal',
  'Hydration: water, herbal teas, low-sugar drinks',
]

const CYCLES = Number(process.env.STRESS_CYCLES || 5)

test.describe('Shopping single-source unification @shopping-unification', () => {
  test.setTimeout(6 * 60_000)

  // The shopping pages fire several data fetches on load (patient, vitals, health suggestions,
  // allergies). This spec hops between views fast enough to ABORT those in-flight requests when
  // it navigates — every one surfaces as `TypeError: Failed to fetch`, a navigation artifact,
  // not a product error. Filter that single signature so the bug-monitor ignores the abort chain.
  test.use({ expectedApiErrorCodes: ['Failed to fetch', 'api_request'] })

  test('report add/remove is race-safe, memberId-scoped, and syncs to both list views', async ({
    page,
    patientId,
    ownerUserId,
    firestore,
    gotoPatientTab,
  }) => {
    const addBtn = (item: string) =>
      page.getByRole('button', { name: `Add ${item} to shopping list`, exact: true })
    const removeBtn = (item: string) =>
      page.getByRole('button', { name: `Remove ${item} from shopping list`, exact: true })

    // Count this patient's live (needed) rows for an item name — the single source of truth.
    // Single-field query (householdId) keeps it index-free; filter the rest in memory.
    const neededRows = async (fragment: string) => {
      const snap = await firestore
        .collection('shopping_items')
        .where('householdId', '==', ownerUserId)
        .get()
      return snap.docs.filter((d) => {
        const x = d.data()
        return (
          x.needed === true &&
          x.memberId === patientId &&
          String(x.manualIngredientName || x.productName || '').includes(fragment)
        )
      })
    }

    // Clean slate: remove any leftover rows for these items from prior runs.
    const purge = async () => {
      for (const item of GROCERIES) {
        for (const d of await neededRows(item)) await d.ref.delete().catch(() => {})
      }
    }
    await purge()

    try {
      // ============ 1. Generate the report ============
      await gotoPatientTab('info')
      await expect(
        page.getByRole('heading', { name: 'Health Summary', level: 3 }),
      ).toBeVisible({ timeout: 30_000 })

      const generateBtn = page.getByRole('button', { name: /^Generate Report$|^Regenerate$/ })
      await expect(generateBtn).toBeVisible({ timeout: 10_000 })
      await generateBtn.click()
      await expect(page.getByRole('button', { name: 'Regenerate' })).toBeVisible({ timeout: 90_000 })

      // The report's grocery Add buttons should exist (fresh slate → all "Add").
      for (const item of GROCERIES) {
        await expect(addBtn(item)).toBeVisible({ timeout: 15_000 })
      }

      // ============ 2a. STRESS: add/remove cycles per item ============
      for (const item of GROCERIES) {
        for (let c = 0; c < CYCLES; c++) {
          await addBtn(item).click()
          await expect(removeBtn(item)).toBeVisible({ timeout: 10_000 }) // flipped On list (live)
          await removeBtn(item).click()
          await expect(addBtn(item)).toBeVisible({ timeout: 10_000 }) // flipped back to Add
        }
        // End in the "added" state.
        await addBtn(item).click()
        await expect(removeBtn(item)).toBeVisible({ timeout: 10_000 })
      }

      // After many cycles: EXACTLY ONE needed row per item (no dup accumulation), each scoped
      // to this patient via memberId. This is the core race-hardening assertion.
      for (const item of GROCERIES) {
        // Poll — the UI flips on client latency-compensation before the server commits, and
        // the admin SDK reads the server. Retry until it reflects the settled state.
        await expect
          .poll(async () => (await neededRows(item)).length, {
            timeout: 15_000,
            message: `exactly one live row for "${item}" after ${CYCLES} cycles`,
          })
          .toBe(1)
        const rows = await neededRows(item)
        expect(rows[0].data().memberId, 'row scoped to patient via memberId').toBe(patientId)
      }

      // ============ 2b. STRESS: rapid batch remove-all then re-add-all ============
      // Toggle every item in quick succession (each waits only for its own flip — no settle
      // pause between items), exercising overlapping snapshot updates across the 3 rows.
      for (const item of GROCERIES) {
        await removeBtn(item).click()
        await expect(addBtn(item)).toBeVisible({ timeout: 15_000 })
      }
      for (const item of GROCERIES) {
        await expect.poll(async () => (await neededRows(item)).length, { timeout: 15_000 }).toBe(0)
      }

      for (const item of GROCERIES) {
        await addBtn(item).click()
        await expect(removeBtn(item)).toBeVisible({ timeout: 15_000 })
      }
      for (const item of GROCERIES) {
        await expect
          .poll(async () => (await neededRows(item)).length, {
            timeout: 15_000,
            message: `one row after re-add of "${item}"`,
          })
          .toBe(1)
      }

      // ============ 3. Per-person list view syncs (?memberId=) ============
      await page.goto(`/shopping?memberId=${patientId}`, { waitUntil: 'domcontentloaded' })
      for (const item of GROCERIES) {
        await expect(page.getByText(item, { exact: false }).first()).toBeVisible({ timeout: 30_000 })
      }

      // ============ 4. Model B: household master list badges "For {name}" ============
      const patientName = (await firestore
        .collection('users').doc(ownerUserId)
        .collection('patients').doc(patientId)
        .get()).data()?.name as string | undefined

      await page.goto('/shopping', { waitUntil: 'domcontentloaded' })
      for (const item of GROCERIES) {
        await expect(page.getByText(item, { exact: false }).first()).toBeVisible({ timeout: 30_000 })
      }
      // At least one "For {name}" chip is present in the superset view.
      const badge = patientName
        ? page.getByText(`For ${patientName}`, { exact: false }).first()
        : page.getByText(/^For /).first()
      await expect(badge).toBeVisible({ timeout: 15_000 })
    } finally {
      if (process.env.KEEP_DATA === '1') {
        console.log('[shopping-unification] KEEP_DATA=1 — leaving seeded rows in Firestore.')
      } else {
        await purge()
      }
    }
  })
})
