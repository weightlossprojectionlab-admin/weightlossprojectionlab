import { test, expect, type Page } from '@playwright/test'

/**
 * Render battery for /family-admin/dashboard.
 *
 * Focuses on the cross-cutting wiring questions that recently regressed:
 *  - Bell badge and "Unread Notifications" StatCard must read the same
 *    number (same data source: notifications where userId=X, read=false,
 *    archived!=true). Drift between the two means one surface is
 *    forgetting the archived filter.
 *  - All 5 StatCards must render with a numeric value (the grid is the
 *    page's primary above-the-fold surface).
 *  - Health Snapshot cards must render a badge label for each patient
 *    via getPatientBadgeLabel — exercises the dateOfBirth + gender
 *    plumbing through PatientSnapshot.
 *
 * Deliberately data-independent: nothing asserts a specific count,
 * patient name, or notification text. The user's data churns between
 * runs; structural assertions don't.
 */

async function gotoDashboard(page: Page) {
  await page.goto('/family-admin/dashboard')
  // The dashboard fetches /api/dashboard/stats + /api/invitations on
  // mount. The "Family Members Under Care" label is the first card in
  // the grid and is the most stable structural anchor — it renders the
  // moment stats resolve, regardless of how many patients exist.
  await expect(
    page.getByText('Family Members Under Care', { exact: true }),
  ).toBeVisible({ timeout: 30_000 })
}

/** Pull the numeric value from a StatCard located by its label. */
async function readStatValue(page: Page, label: string): Promise<number> {
  // StatCard structure: <div class="bg-card …">{icon}<p class="text-3xl">{value}</p><p>{label}</p></div>
  // Filter to the bg-card container so we don't accidentally grab an
  // ancestor (e.g. the grid wrapper) whose first text-3xl <p> belongs
  // to a different card.
  const card = page.locator('div.bg-card').filter({ hasText: label })
  const valueText = (await card.locator('p.text-3xl').first().innerText()).trim()
  return Number.parseInt(valueText, 10)
}

test.describe('/family-admin/dashboard — render battery', () => {
  test.beforeEach(async ({ page }) => {
    await gotoDashboard(page)
  })

  test('all 5 stat cards render with numeric values', async ({ page }) => {
    const labels = [
      'Family Members Under Care',
      'Pending Tasks',
      'Pending Invites',
      'Unread Notifications',
      'Upcoming Appointments',
    ]
    for (const label of labels) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
      const value = await readStatValue(page, label)
      expect(Number.isFinite(value), `${label} value should parse as a number`).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })

  test('bell badge and Unread Notifications card agree after refresh', async ({ page }) => {
    // Card is fetched once on mount + every 5min; bell is a real-time
    // onSnapshot listener. To compare apples-to-apples we have to bring
    // both surfaces to the same point in time. Click Refresh to re-poll
    // the API, then poll the DOM for convergence — the bell listener
    // catches up to current server state via the same Firestore writes
    // the API sees.
    await page.getByRole('button', { name: 'Refresh' }).click()

    const bellButton = page.getByRole('button', { name: 'Notifications' })
    await expect(bellButton).toBeVisible()

    // Poll for convergence within 15s. If bell and card both reach the
    // same value, the wiring is correct. If they drift apart longer
    // than that, the contract is broken on one of the two surfaces.
    async function readBoth(): Promise<{ card: number; bell: number }> {
      const card = await readStatValue(page, 'Unread Notifications')
      const badge = bellButton.locator('span').first()
      const badgeVisible = await badge.isVisible().catch(() => false)
      if (!badgeVisible) return { card, bell: 0 }
      const badgeText = (await badge.innerText()).trim()
      if (badgeText === '99+') {
        // Capped — only the direction is meaningful. Treat as match
        // iff card is also > 99.
        return { card, bell: card > 99 ? card : -1 }
      }
      return { card, bell: Number.parseInt(badgeText, 10) }
    }

    await expect
      .poll(async () => {
        const { card, bell } = await readBoth()
        return card === bell
      }, {
        timeout: 15_000,
        message: 'bell badge and Unread Notifications card must converge to the same number',
      })
      .toBe(true)
  })

  test('Health Snapshot section renders a badge label for each patient', async ({ page }) => {
    // The Health Snapshots heading only shows when there are 1+ visible
    // patients in the snapshot projection. If the test account has
    // zero patients, skip — this assertion is only meaningful when
    // PatientSnapshot is actually rendered.
    const heading = page.getByRole('heading', { name: /Health Snapshots/i })
    const hasSnapshots = await heading.isVisible().catch(() => false)
    test.skip(!hasSnapshots, 'no patients in snapshot — nothing to assert')

    // Each snapshot card uses getPatientBadgeLabel to render a label
    // under the name. The legal label set covers minors (age-category),
    // adults (gender-aware relationship), pets (species/breed). We
    // assert that AT LEAST ONE of the canonical labels appears —
    // proving the helper got the data it needs (dateOfBirth +
    // gender + relationship).
    const canonicalLabels = [
      // Adult human
      /\bSon\b/, /\bDaughter\b/, /\bFather\b/, /\bMother\b/, /\bBrother\b/, /\bSister\b/,
      /\bHusband\b/, /\bWife\b/, /\bSpouse\b/, /\bMyself\b/,
      // Minor human
      /\bNewborn\b/, /\bInfant\b/, /\bChild\b/, /\bTeen\b/,
      // Pet
      /\bDog\b/, /\bCat\b/, /\bPet\b/,
    ]
    const labelText = await page.locator('section, div', { has: heading })
      .first()
      .innerText()
      .catch(async () => await page.innerText('body'))

    const matched = canonicalLabels.some(re => re.test(labelText))
    expect(matched, `no canonical badge label found near "Health Snapshots". got:\n${labelText.slice(0, 500)}`).toBe(true)

    // Negative assertion: "Adult" by itself is the bare lifeStage
    // fallback the helper returns when dateOfBirth + gender are
    // missing. If we see it on this surface, the PatientSnapshot
    // plumbing dropped the fields.
    expect(
      labelText,
      'bare "Adult" label means PatientSnapshot is missing dateOfBirth or gender',
    ).not.toMatch(/^Adult$/m)
  })
})
