import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * OPT-IN integration spec — exercises the real Gemini Vision OCR
 * pipeline against fixture prescription labels stored in
 * e2e/fixtures/medication-labels/.
 *
 * Why opt-in:
 *   Real Gemini calls cost money, take 10–30s each, and produce
 *   non-deterministic output. CI shouldn't pay that bill on every
 *   push. The companion spec profile-medication-scan.spec.ts uses
 *   route-mocking to catch UX regressions without ever calling the
 *   real API; it runs on every test pass and is sufficient for
 *   regression-guarding the UX layer.
 *
 *   This spec is for the prompt regression class: missed patientName,
 *   garbled NDC, info-sheet layout drift, Gemini config bugs. You run
 *   it when you specifically want to validate the OCR pipeline against
 *   real-world labels — e.g. before promoting a prompt change to
 *   production, or when adding new pharmacies to the supported set.
 *
 * How fixtures work:
 *   Drop image files (.jpg/.jpeg/.png/.webp) into
 *   e2e/fixtures/medication-labels/. This spec discovers them at test
 *   collection time and generates one test per image. See the README
 *   in that directory for naming + PHI-redaction guidance.
 *
 * Run with:
 *   PowerShell:  $env:RUN_OCR_INTEGRATION="1"; npx playwright test
 *                  e2e/profile-medication-scan-integration.spec.ts
 *   bash:        RUN_OCR_INTEGRATION=1 npx playwright test
 *                  e2e/profile-medication-scan-integration.spec.ts
 *
 * What it asserts:
 *   - The MedicationReviewModal opens after submit (Gemini returned
 *     valid JSON, the route schema-validated, the client mounted the
 *     review surface).
 *   - The medication name field is non-empty (the minimum bar for
 *     "extraction succeeded").
 *   - No uncaught page errors during the flow.
 *
 * What it does NOT assert:
 *   - Specific extracted values. Gemini output varies run to run; an
 *     exact-string assertion would create flake. Instead, the
 *     extracted fields are LOGGED to stdout in the canonical
 *     `{medicationName, strength, dosageForm, frequency, …}` shape
 *     so a human can spot-check for confabulation, missed fields, or
 *     layout-specific drift.
 *
 * What it does NOT do:
 *   - Save the medication. The Cancel path is taken after extraction
 *     so the test account's medications list is never polluted by a
 *     test run.
 */

const ENABLED = process.env.RUN_OCR_INTEGRATION === '1'
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'medication-labels')
const SUPPORTED_EXT = /\.(jpe?g|png|webp)$/i

/**
 * Mirrors the labels in MedicationReviewModal (lines ~390–510 at time
 * of writing). Each entry maps to one input the modal renders for the
 * extracted record. Reading these back gives us the canonical JSON
 * shape the route returns:
 *   { medicationName, strength, dosageForm, frequency, rxNumber,
 *     prescribingDoctor, ... }
 * Brand Name and Prescribed For are also surfaced in the modal but
 * aren't part of the OCR output directly — they're user-entry slots.
 * Included here so the log shows the full review state, not just OCR.
 */
const FIELD_LABELS = [
  'Medication Name',
  'Brand Name',
  'Strength',
  'Form',
  'Dosage Instructions',
  'Prescribed For',
  'Prescribing Doctor',
  'Rx Number',
  'NDC',
] as const

function discoverFixtures(): string[] {
  if (!fs.existsSync(FIXTURES_DIR)) return []
  return fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => SUPPORTED_EXT.test(f))
    .map((f) => path.join(FIXTURES_DIR, f))
    .sort()
}

/**
 * Read the value of the input that follows a given label. The modal
 * uses bare `<label>Field Name</label>` (no `htmlFor`) so we can't use
 * `getByLabel`. The label-then-input sibling pattern is stable across
 * the whole form — anchor by the label text, walk to the next input.
 */
async function readFieldValue(page: Page, labelText: string): Promise<string> {
  // The label text often has a "* " suffix on required fields. Match
  // the leading text leniently so we don't have to track which fields
  // are required.
  const label = page
    .locator('label')
    .filter({ hasText: new RegExp(`^\\s*${labelText}\\s*\\*?\\s*$`, 'i') })
    .first()
  const count = await label.count()
  if (count === 0) return ''
  const input = label.locator('xpath=following-sibling::input[1]').first()
  if ((await input.count()) === 0) return ''
  return await input.inputValue()
}

test.describe('/profile — Medication scan integration (real Gemini)', () => {
  const fixtures = discoverFixtures()
  const enabled = ENABLED
  const hasFixtures = fixtures.length > 0

  // Generate ONE skipped placeholder when the spec isn't runnable so
  // the user sees the reason in test output instead of an empty
  // describe block.
  if (!enabled || !hasFixtures) {
    const reason = !enabled
      ? 'opt-in: set RUN_OCR_INTEGRATION=1 to enable'
      : `no fixtures in ${path.relative(process.cwd(), FIXTURES_DIR)} — drop label images there (see README)`
    test.skip(reason, async () => {})
    return
  }

  // Each test calls real Gemini, which can take a while. Bump the
  // per-test timeout above Playwright's default (set in playwright
  // .config.ts to 2 minutes) so we have headroom for cold-start
  // server compilation + slow Gemini responses.
  test.setTimeout(3 * 60_000)

  for (const fixturePath of fixtures) {
    const fixtureName = path.basename(fixturePath)

    test(`extracts structured data from ${fixtureName}`, async ({ page }) => {
      const pageErrors: string[] = []
      page.on('pageerror', (err) => pageErrors.push(err.message))

      // --- Navigate to the scan modal ---
      await page.goto('/profile')
      await expect(
        page.getByText('Currently Viewing', { exact: false }),
      ).toBeVisible({ timeout: 60_000 })
      await page
        .getByText(/Loading family members/i)
        .waitFor({ state: 'detached', timeout: 30_000 })
        .catch(() => {})

      const medicationsHeading = page.getByRole('heading', {
        name: 'Medications',
        level: 3,
      })
      await expect(medicationsHeading).toBeVisible({ timeout: 30_000 })
      await medicationsHeading.click()

      const scanBtn = page.getByRole('button', {
        name: /Scan or Upload Prescription/,
      })
      await expect(scanBtn).toBeVisible()
      await scanBtn.click()

      await expect(page.getByText(/Step 1 of 2/i)).toBeVisible({ timeout: 10_000 })

      // --- Upload fixture and submit (front-only path) ---
      await page.setInputFiles('input#med-front-upload', fixturePath)
      await expect(page.getByText(/Step 2 of 2/i)).toBeVisible({ timeout: 10_000 })

      const skipLink = page.getByRole('button', {
        name: /Skip — only front available/i,
      })
      await expect(skipLink).toBeVisible()
      await skipLink.click()

      // --- Wait for review modal (real Gemini round-trip) ---
      await expect(
        page.getByRole('heading', { name: /Review Medication/i }),
      ).toBeVisible({ timeout: 90_000 })

      // --- Read extracted fields back into JSON shape ---
      const extracted: Record<string, string> = {}
      for (const label of FIELD_LABELS) {
        extracted[label] = await readFieldValue(page, label)
      }

      // Log the structured result so a human can spot-check for
      // confabulation, missed fields, layout-specific drift. The
      // shape matches what the route returns end-to-end.
      // eslint-disable-next-line no-console
      console.log(
        `\n[Integration] OCR result for ${fixtureName}:\n` +
          JSON.stringify(extracted, null, 2) +
          '\n',
      )

      // --- Minimum-bar assertions ---
      // We don't assert specific values (Gemini output varies). The
      // bar is: extraction returned non-empty for the medication name
      // (the most load-bearing field), and nothing crashed.
      expect(
        extracted['Medication Name'].trim(),
        `${fixtureName}: medication name should be extracted`,
      ).not.toBe('')
      expect(
        pageErrors,
        `${fixtureName}: uncaught page errors during scan:\n${pageErrors.join('\n')}`,
      ).toEqual([])

      // --- Cancel the review modal so the test account isn't polluted ---
      const cancelBtn = page
        .getByRole('button', { name: /^Cancel$/ })
        .first()
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click()
      }
    })
  }
})
