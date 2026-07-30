/**
 * Guide-as-spec: the Medical user guide ↔ the Medical hub.
 *
 * The guide (app/docs/user-guides/medical/page.tsx) is treated as the SPEC. The
 * FEATURES table pairs each claim the guide makes with the control that fulfils
 * it in the app, and three tests assert both sides plus the round-trip link — so
 * drift in EITHER direction (guide drops a feature, or the app removes one) fails.
 *
 * Reuses the fixtures + seeding + selector patterns from medical-hub.spec.ts.
 */

import type { Locator, Page } from '@playwright/test'
import { test, expect } from './fixtures'

const TABS = ['Appointments', 'Providers', 'Calendar', 'Notifications', 'Import'] as const

type Feature = {
  label: string
  /** Must appear on /docs/user-guides/medical (the guide documents it). */
  guideText: string
  /** App tab to open before asserting the control(s). */
  tab: (typeof TABS)[number]
  /** Control(s) that must be visible in the app (the hub implements it). */
  app: (page: Page) => Locator[]
}

const FEATURES: Feature[] = [
  {
    label: 'Schedule appointments',
    guideText: 'Schedule Appointment',
    tab: 'Appointments',
    app: (p) => [p.getByRole('button', { name: /Schedule Appointment/i }).first()],
  },
  {
    label: 'Add a provider',
    guideText: '+ Add Provider',
    tab: 'Providers',
    app: (p) => [p.getByRole('button', { name: /\+ Add Provider/ })],
  },
  {
    label: 'Serving N patients',
    guideText: 'Serving N patients',
    tab: 'Providers',
    app: (p) => [p.getByText(/Serving \d+ patient/).first()],
  },
  {
    label: 'Calendar month navigation',
    guideText: 'Today',
    tab: 'Calendar',
    app: (p) => [
      p.getByRole('button', { name: 'Today', exact: true }),
      p.getByRole('button', { name: 'Previous month' }),
      p.getByRole('button', { name: 'Next month' }),
    ],
  },
  {
    label: 'Notification filters',
    guideText: 'Upcoming',
    tab: 'Notifications',
    app: (p) =>
      ['All', 'Upcoming', 'Recent', 'Past'].map((c) =>
        p.getByRole('button', { name: c, exact: true }),
      ),
  },
  {
    label: 'File import',
    guideText: 'bring existing records into WPL', // guide's wording (app is CSV-specific)
    tab: 'Import',
    app: (p) => [
      p.getByText('Upload your spreadsheet'),
      p.getByText('Choose CSV file'), // a styled <label> over a hidden file input, not a <button>
    ],
  },
]

test.describe('Medical guide-as-spec @medical-guide-spec', () => {
  test.setTimeout(4 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching', 'not found'],
  })

  test('the Medical guide documents the hub features', async ({ page }) => {
    await page.goto('/docs/user-guides/medical', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Medical Hub' })).toBeVisible({ timeout: 30_000 })

    // The overview lists all five tabs.
    for (const tab of TABS) {
      await expect(page.getByText(`${tab}:`).first(), `guide documents the ${tab} tab`).toBeVisible()
    }
    // …and each feature is described.
    for (const f of FEATURES) {
      await expect(page.getByText(f.guideText).first(), `guide documents: ${f.label}`).toBeVisible()
    }
  })

  test('the Medical hub implements what the guide documents', async ({ page, ownerUserId, firestore }) => {
    const stamp = Date.now()
    const pid = `e2e_gs_pat_${stamp}`
    const provId = `e2e_gs_prov_${stamp}`
    const ownerRef = firestore.collection('users').doc(ownerUserId)

    // A patient + a provider serving them, so the Providers tab shows both
    // "+ Add Provider" (header appears once a provider exists) and
    // "Serving N patients" (ProviderCard reads patientsServed; listenToProviders
    // orders by addedAt, so it must be present).
    await ownerRef.collection('patients').doc(pid).set({
      name: `GuideSpec Patient ${stamp}`, relationship: 'parent', type: 'human',
      dateOfBirth: '1970-01-01', gender: 'male', userId: ownerUserId, status: 'active',
    })
    await ownerRef.collection('providers').doc(provId).set({
      id: provId, userId: ownerUserId, type: 'physician', name: `Dr GuideSpec ${stamp}`,
      specialty: 'Testology', patientsServed: [pid],
      addedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    })

    const cleanup = async () => {
      await Promise.all([
        ownerRef.collection('patients').doc(pid).delete(),
        ownerRef.collection('providers').doc(provId).delete(),
      ].map((p) => p.catch(() => {})))
    }

    try {
      await page.goto('/medical', { waitUntil: 'domcontentloaded' })

      // All five documented tabs render.
      for (const tab of TABS) {
        await expect(page.getByRole('tab', { name: tab }), `hub has the ${tab} tab`).toBeVisible({ timeout: 60_000 })
      }

      // Each documented feature's control is present on its tab.
      for (const f of FEATURES) {
        await page.getByRole('tab', { name: f.tab }).click()
        for (const loc of f.app(page)) {
          await expect(loc, `hub implements: ${f.label}`).toBeVisible({ timeout: 30_000 })
        }
      }
    } finally {
      await cleanup()
    }
  })

  test('guide and hub link to each other', async ({ page }) => {
    // Hub → guide (the HelpLink "?" icon).
    await page.goto('/medical', { waitUntil: 'domcontentloaded' })
    await expect(
      page.locator('a[href="/docs/user-guides/medical"]').first(),
      '/medical help icon links to the guide',
    ).toBeVisible({ timeout: 60_000 })

    // Guide → hub (GuideTemplate "Open in App", appRoute="/medical").
    await page.goto('/docs/user-guides/medical', { waitUntil: 'domcontentloaded' })
    await expect(
      page.locator('a[href="/medical"]').first(),
      'guide "Open in App" links to the hub',
    ).toBeVisible({ timeout: 30_000 })
  })
})
