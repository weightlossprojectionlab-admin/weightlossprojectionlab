import { test, expect, type ConsoleMessage, type Page, type Route } from '@playwright/test'

/**
 * Regression guard for the medication scan flow on /profile.
 *
 * Why a dedicated spec:
 *   profile-lifestyle-save.spec.ts covers the lifestyle write path.
 *   The medication scan path has three additional failure modes:
 *     1. Server OCR call returns 500 (Gemini config drift)
 *     2. Server OCR call returns 502 (schema-validation failure)
 *     3. Server OCR succeeds and the review modal opens correctly
 *
 *   None of these are exercised by the render-only profile-page spec.
 *   And we can't (and shouldn't) call real Gemini from a Playwright
 *   run — it's slow, costs money, and non-deterministic. Solution:
 *   page.route() mocks the /api/ocr/medication endpoint and we assert
 *   that the UX recovers (or advances) correctly for each mock.
 *
 * What this catches:
 *   - Tesseract sneaks back in as a silent garbage fallback
 *   - The processing-step reset bug (modal stuck on spinner after the
 *     review modal closes) — fixed 2026-05-26
 *   - The thinkingConfig nesting / maxOutputTokens drift documented in
 *     feedback_gemini_2_5_flash_gotchas
 *   - Future regressions where a server failure UX silently
 *     accepts a null/empty extraction
 *
 * What this does NOT assert:
 *   - The actual Gemini call. That's a separate concern; tested via
 *     manual smoke + the route's Zod schema gate.
 *   - The save round-trip after the review modal. Lives in
 *     MedicationReviewModal-specific tests when those exist.
 */

const OCR_ENDPOINT = /\/api\/ocr\/medication$/

/**
 * Minimal valid 1×1 transparent PNG. Embedded inline so the test
 * suite has zero fixture-file dependencies. setInputFiles accepts a
 * Buffer payload directly.
 */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

/**
 * Benign console-error patterns (dev-server noise, third-party SDKs).
 * Add to this list only with a clear reason it's never the bug under
 * test. See profile-lifestyle-save.spec.ts for the precedent.
 */
const BENIGN_CONSOLE_PATTERNS: RegExp[] = [
  /Warning: ReactDOM/i,
  /Download the React DevTools/i,
  /\[Firebase\]/i,
  /\[Vercel Speed Insights\]/i,
  /\[DEBUG\]|\[INFO\]/,
  // Browser-level "Failed to load resource" noise on any non-2xx
  // response. Always fires when we mock a server error; not a code
  // signal, just the browser logging the network failure.
  /Failed to load resource/i,
]

/**
 * Console-error patterns that we EXPECT on the OCR failure path.
 * These are the logger.error calls inside the ocr-medication pipeline
 * documenting that the server returned an error — the failure path
 * working as designed, not a bug to catch. Counted separately so the
 * test can assert "no UNEXPECTED errors" instead of "no errors."
 */
const EXPECTED_OCR_FAILURE_PATTERNS: RegExp[] = [
  /\[Gemini OCR\] API request failed/i,
  /\[OCR\] Gemini Vision returned no usable result/i,
]

function isBenign(msg: ConsoleMessage) {
  const text = msg.text()
  return BENIGN_CONSOLE_PATTERNS.some((re) => re.test(text))
}

interface PageCollectors {
  consoleErrors: string[]
  pageErrors: string[]
}

function attachCollectors(page: Page): PageCollectors {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !isBenign(msg)) consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => {
    pageErrors.push(err.message)
  })
  return { consoleErrors, pageErrors }
}

async function gotoProfileMedications(page: Page) {
  await page.goto('/profile')
  await expect(page.getByText('Currently Viewing', { exact: false })).toBeVisible({
    timeout: 60_000,
  })
  await page
    .getByText(/Loading family members/i)
    .waitFor({ state: 'detached', timeout: 30_000 })
    .catch(() => {})

  // Expand the Medications collapsible. The section is gated by
  // patientId being set; the test account is provisioned with
  // patients, so the section renders.
  const medicationsHeading = page.getByRole('heading', { name: 'Medications', level: 3 })
  await expect(medicationsHeading).toBeVisible({ timeout: 30_000 })
  await medicationsHeading.click()

  // Open the scan modal.
  const scanBtn = page.getByRole('button', { name: /Scan or Upload Prescription/ })
  await expect(scanBtn).toBeVisible()
  await scanBtn.click()

  // The modal's front-step heading anchors the open state.
  await expect(page.getByText(/Step 1 of 2/i)).toBeVisible({ timeout: 10_000 })
}

/**
 * Upload the dummy image and trigger OCR by clicking "Skip — only
 * front available." The single-image submit path is the one most
 * users hit in practice (back-of-bottle is the optional 2nd photo).
 */
async function uploadAndSubmitFrontOnly(page: Page) {
  await page.setInputFiles('input#med-front-upload', {
    name: 'front.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  })

  // The auto-advance to step 'back' fires from processFrontFile.
  await expect(page.getByText(/Step 2 of 2/i)).toBeVisible({ timeout: 10_000 })

  // Skip the back photo and submit. The link wording is deliberate;
  // breaking this assertion catches copy drift on the modal.
  const skipLink = page.getByRole('button', { name: /Skip — only front available/i })
  await expect(skipLink).toBeVisible()
  await skipLink.click()
}

test.describe('/profile — Medication scan failure UX', () => {
  test('500 from /api/ocr/medication recovers to step 1 with toast', async ({ page }) => {
    const { consoleErrors, pageErrors } = attachCollectors(page)

    let ocrHits = 0
    await page.route(OCR_ENDPOINT, (route: Route) => {
      ocrHits += 1
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to parse medication information' }),
      })
    })

    await gotoProfileMedications(page)
    await uploadAndSubmitFrontOnly(page)

    // The user-visible toast is the canonical "OCR failed" signal.
    // The exact copy comes from MedicationLabelCapture's catch block.
    await expect(page.getByText(/Could not read the label/i)).toBeVisible({ timeout: 15_000 })

    // The outer modal should NOT close on failure — the user might
    // retry. But the step should reset out of 'processing' so the
    // user isn't stuck on a spinner. Step-1 copy is the proof.
    await expect(page.getByText(/Step 1 of 2/i)).toBeVisible({ timeout: 5_000 })

    // The Cancel link should be reachable and clickable. If a future
    // refactor moves it behind a covered overlay, this catches it.
    const cancelBtn = page.getByRole('button', { name: /^Cancel$/ })
    await expect(cancelBtn).toBeVisible()

    expect(ocrHits, 'expected exactly one OCR call').toBe(1)

    // We don't expect any pageerror — that'd be an uncaught exception.
    expect(pageErrors, `uncaught page error during failed scan:\n${pageErrors.join('\n')}`).toEqual([])

    // Filter out the EXPECTED logger.error lines that document the
    // OCR failure path. Anything left is genuinely unexpected.
    const unexpectedErrors = consoleErrors.filter(
      (msg) => !EXPECTED_OCR_FAILURE_PATTERNS.some((re) => re.test(msg)),
    )
    expect(
      unexpectedErrors,
      `unexpected console.error during failed scan (excludes documented OCR failure logs):\n${unexpectedErrors.join('\n')}`,
    ).toEqual([])
  })

  test('502 from /api/ocr/medication shows same recovery UX', async ({ page }) => {
    // 502 is the route's schema-validation-failure status code (Zod
    // gate rejected Gemini's malformed output). The client treats it
    // the same as 500 — both surface as "Could not read the label."
    attachCollectors(page)

    await page.route(OCR_ENDPOINT, (route: Route) => {
      route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Could not identify medication in image. Please try a clearer photo.',
        }),
      })
    })

    await gotoProfileMedications(page)
    await uploadAndSubmitFrontOnly(page)

    await expect(page.getByText(/Could not read the label/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Step 1 of 2/i)).toBeVisible({ timeout: 5_000 })
  })

  test('200 from /api/ocr/medication opens review modal with extracted data', async ({ page }) => {
    const { pageErrors } = attachCollectors(page)

    await page.route(OCR_ENDPOINT, (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            medicationName: 'Sodium Bicarb',
            strength: '650 mg',
            dosageForm: 'tablet',
            frequency: 'Take 1 tablet by mouth three times a day',
            rxNumber: null,
            ndc: null,
            prescribingDoctor: null,
            patientName: 'Barbara Rice',
            patientAddress: null,
            pharmacy: null,
            pharmacyPhone: null,
            quantity: null,
            refills: null,
            fillDate: null,
            expirationDate: null,
            warnings: null,
            rawText: '',
            suggestedConditions: [],
          },
        }),
      })
    })

    await gotoProfileMedications(page)
    await uploadAndSubmitFrontOnly(page)

    // The review modal is keyed off parsedData being set. Its header
    // is the canonical signal that the OCR-success path landed.
    // MedicationReviewModal uses a distinct heading — match on it.
    await expect(
      page.getByRole('heading', { name: /Review Medication/i }),
    ).toBeVisible({ timeout: 15_000 })

    // The extracted medication name lands in an editable input field
    // inside the review modal. `getByText` won't match an input's
    // value attribute (only its textContent), and `getByDisplayValue`
    // isn't available in this Playwright build. A CSS attribute
    // selector targets the input directly. Using the input's value
    // (rather than a label match) keeps the test honest about what
    // the user actually sees in the field.
    const medNameInput = page.locator('input[value*="Sodium Bicarb" i]').first()
    await expect(medNameInput).toBeVisible({ timeout: 10_000 })

    expect(pageErrors, `uncaught page error during successful scan:\n${pageErrors.join('\n')}`).toEqual([])
  })

  test('auto-matches OCR patientName to the family-member dropdown', async ({ page }) => {
    // The strongest signal we have about who a medication is for is the
    // patient name printed on the label. This locks in the Step-1
    // auto-match: an OCR patientName that resolves to a household member
    // pre-selects that member AND surfaces the "Matched from
    // prescription label" hint.
    //
    // The mock uses the inverted "Last, First" form pharmacies print on
    // info-sheet banners — exercising normalizePatientName's comma
    // inversion + honorific strip in the same pass. The test account
    // has a "Tom Calloway" family member; "Calloway, Tom" must resolve
    // to him. If the account's roster changes, update MATCH_NAME /
    // MATCH_PATIENT_ID below.
    const MATCH_NAME = 'Calloway, Tom'
    const MATCH_PATIENT_ID = 'f42ef3cf-9c41-459a-abb6-eb687256bd76'

    const { pageErrors } = attachCollectors(page)

    await page.route(OCR_ENDPOINT, (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            medicationName: 'Atorvastatin',
            strength: '20 mg',
            dosageForm: 'tablet',
            frequency: 'Take 1 tablet by mouth at bedtime',
            rxNumber: null,
            ndc: null,
            prescribingDoctor: null,
            patientName: MATCH_NAME,
            patientAddress: null,
            pharmacy: null,
            pharmacyPhone: null,
            quantity: null,
            refills: null,
            fillDate: null,
            expirationDate: null,
            warnings: null,
            rawText: '',
            suggestedConditions: [],
          },
        }),
      })
    })

    await gotoProfileMedications(page)
    await uploadAndSubmitFrontOnly(page)

    await expect(
      page.getByRole('heading', { name: /Review Medication/i }),
    ).toBeVisible({ timeout: 15_000 })

    // The green "matched" hint is the user-visible proof the auto-match
    // fired, and it echoes the exact OCR name so the user can sanity
    // check the resolution.
    await expect(page.getByText(/Matched from prescription label/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(MATCH_NAME, { exact: false })).toBeVisible()

    // The dropdown itself must be pre-selected to the matched member —
    // the hint without the selection would be a lie. The page has
    // several selects, so scope to the one carrying the family-member
    // options (it lists Tom Calloway).
    const familySelect = page.locator('select', {
      has: page.locator('option', { hasText: 'Tom Calloway' }),
    })
    await expect(familySelect).toHaveValue(MATCH_PATIENT_ID)

    expect(pageErrors, `uncaught page error during auto-match scan:\n${pageErrors.join('\n')}`).toEqual([])
  })

  test('no-match OCR patientName warns and refuses to pre-select (safety)', async ({ page }) => {
    // The dangerous case: the label clearly names a person who is NOT
    // in the household. The OLD behavior silently fell back to the
    // account holder, so one click would save (e.g.) Barbara's heart
    // medication onto Roger's record. The fix: select NOBODY and warn,
    // forcing a conscious pick. "Barbara Rice" is deliberately absent
    // from the test account roster.
    const NO_MATCH_NAME = 'Barbara Rice'

    const { pageErrors } = attachCollectors(page)

    await page.route(OCR_ENDPOINT, (route: Route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            medicationName: 'Metoprolol Succ ER',
            strength: '200 mg',
            dosageForm: 'tablet',
            frequency: 'Take 2 tablets by mouth once daily',
            rxNumber: null,
            ndc: null,
            prescribingDoctor: null,
            patientName: NO_MATCH_NAME,
            patientAddress: null,
            pharmacy: null,
            pharmacyPhone: null,
            quantity: null,
            refills: null,
            fillDate: null,
            expirationDate: null,
            warnings: null,
            rawText: '',
            suggestedConditions: [],
          },
        }),
      })
    })

    await gotoProfileMedications(page)
    await uploadAndSubmitFrontOnly(page)

    await expect(
      page.getByRole('heading', { name: /Review Medication/i }),
    ).toBeVisible({ timeout: 15_000 })

    // The amber warning must name the unmatched person so the user
    // knows whose label this is and why nothing was auto-selected.
    await expect(page.getByText(/isn't in your family yet/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(NO_MATCH_NAME, { exact: false })).toBeVisible()

    // Critically: the dropdown must be EMPTY, not defaulted to a real
    // member. An empty value is what blocks the silent mis-assignment.
    const familySelect = page.locator('select', {
      has: page.locator('option', { hasText: 'Tom Calloway' }),
    })
    await expect(familySelect).toHaveValue('')

    // And the green "matched" hint must NOT be showing — this is the
    // miss path, not the match path.
    await expect(page.getByText(/Matched from prescription label/i)).toHaveCount(0)

    expect(pageErrors, `uncaught page error during no-match scan:\n${pageErrors.join('\n')}`).toEqual([])
  })
})
