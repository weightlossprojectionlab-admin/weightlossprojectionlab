/**
 * Medical hub — tabbed clinical hub at /medical.
 *
 * Asserts:
 *   1. All five tabs render and switch panels IN PLACE (URL never leaves
 *      /medical) — Appointments (default) / Providers / Calendar / Notifications
 *      / Import.
 *   2. The standalone routes (/providers, /appointments, /calendar) render the
 *      SAME panels (single source) — proven by their signature controls.
 *   3. The Notifications tab is clinical-filtered: a seeded clinical
 *      notification shows, a seeded non-clinical one does not.
 *
 * Runs headless as the owner fixture (has medical access). Seeded notifications
 * are torn down in finally.
 */

import type { Locator } from '@playwright/test'
import { test, expect } from './fixtures'

/** A control is fat-finger friendly (WCAG 2.5.5) when its rendered height ≥ 44px. */
async function assertTapTarget(loc: Locator, label: string) {
  await expect(loc, `${label} should be visible`).toBeVisible({ timeout: 30_000 })
  const box = await loc.boundingBox()
  expect(box, `${label} should have a bounding box`).not.toBeNull()
  expect(box!.height, `${label} tap-target height (px)`).toBeGreaterThanOrEqual(44)
}

test.describe('Medical hub @medical-hub', () => {
  test.setTimeout(4 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('tabs switch panels in place without leaving /medical', async ({ page }) => {
    await page.goto('/medical', { waitUntil: 'domcontentloaded' })

    for (const name of ['Appointments', 'Providers', 'Calendar', 'Notifications', 'Import']) {
      await expect(page.getByRole('tab', { name })).toBeVisible({ timeout: 60_000 })
    }

    // Default tab = Appointments.
    await expect(page.getByRole('tab', { name: 'Appointments' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('button', { name: /Schedule Appointment/i }).first()).toBeVisible({ timeout: 30_000 })

    // Providers → its Add control; still on /medical.
    await page.getByRole('tab', { name: 'Providers' }).click()
    await expect(page.getByRole('button', { name: /Add Provider/i }).first()).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveURL(/\/medical/)

    // Calendar → the month "Today" control.
    await page.getByRole('tab', { name: 'Calendar' }).click()
    await expect(page.getByRole('button', { name: /^Today$/ })).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveURL(/\/medical/)

    // Notifications → the time-filter chips.
    await page.getByRole('tab', { name: 'Notifications' }).click()
    await expect(page.getByRole('button', { name: 'Upcoming' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'Recent' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Past' })).toBeVisible()
    await expect(page).toHaveURL(/\/medical/)

    // Import → tab becomes selected; still on the page.
    await page.getByRole('tab', { name: 'Import' }).click()
    await expect(page.getByRole('tab', { name: 'Import' })).toHaveAttribute('aria-selected', 'true')
    await expect(page).toHaveURL(/\/medical/)
  })

  test('standalone routes reuse the same panels (single source)', async ({ page }) => {
    await page.goto('/providers', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /Add Provider/i }).first()).toBeVisible({ timeout: 60_000 })

    await page.goto('/appointments', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /Schedule Appointment/i }).first()).toBeVisible({ timeout: 60_000 })

    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /^Today$/ })).toBeVisible({ timeout: 60_000 })
  })

  test('notifications tab shows clinical notifications, hides non-clinical', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const clinicalTitle = `E2E Clinical ${stamp}`
    const noiseTitle = `E2E Noise ${stamp}`
    const nowIso = new Date().toISOString()

    const mk = (type: string, title: string) => ({
      userId: ownerUserId,
      type,
      priority: 'normal',
      status: 'delivered',
      title,
      message: 'e2e',
      actionUrl: '/medical',
      actionLabel: 'Open',
      metadata: {},
      read: false,
      archived: false,
      emailSent: false,
      pushSent: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    })

    const clinicalRef = firestore.collection('notifications').doc(`e2e_clin_${stamp}`)
    const noiseRef = firestore.collection('notifications').doc(`e2e_noise_${stamp}`)
    await clinicalRef.set(mk('appointment_scheduled', clinicalTitle))
    await noiseRef.set(mk('shopping_done', noiseTitle))

    const cleanup = async () => {
      await clinicalRef.delete().catch(() => {})
      await noiseRef.delete().catch(() => {})
    }

    try {
      await page.goto('/medical', { waitUntil: 'domcontentloaded' })
      await page.getByRole('tab', { name: 'Notifications' }).click()

      // The clinical one surfaces; the non-clinical one is filtered out.
      await expect(page.getByText(clinicalTitle)).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(noiseTitle)).toHaveCount(0)
    } finally {
      await cleanup()
    }
  })

  test('notifications time buckets (Upcoming / Recent / Past) filter correctly', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    // Titles deliberately avoid the words Upcoming/Recent/Past so they don't
    // collide with the filter-chip buttons (notification rows are buttons too).
    const upcomingTitle = `E2E Reminder ${stamp}` // reminder type → Upcoming
    const recentTitle = `E2E Fresh ${stamp}` // non-reminder, created now → Recent
    const pastTitle = `E2E Old ${stamp}` // non-reminder, 30 days old → Past

    const nowIso = new Date().toISOString()
    const oldIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const mk = (type: string, title: string, createdAt: string) => ({
      userId: ownerUserId,
      type,
      priority: 'normal',
      status: 'delivered',
      title,
      message: 'e2e',
      actionUrl: '/medical',
      actionLabel: 'Open',
      metadata: {},
      read: false,
      archived: false,
      emailSent: false,
      pushSent: false,
      createdAt,
      updatedAt: createdAt,
    })

    const upcomingRef = firestore.collection('notifications').doc(`e2e_up_${stamp}`)
    const recentRef = firestore.collection('notifications').doc(`e2e_rec_${stamp}`)
    const pastRef = firestore.collection('notifications').doc(`e2e_past_${stamp}`)
    await upcomingRef.set(mk('appointment_reminder', upcomingTitle, nowIso))
    await recentRef.set(mk('appointment_scheduled', recentTitle, nowIso))
    await pastRef.set(mk('vital_logged', pastTitle, oldIso))

    const cleanup = async () => {
      await Promise.all([
        upcomingRef.delete().catch(() => {}),
        recentRef.delete().catch(() => {}),
        pastRef.delete().catch(() => {}),
      ])
    }

    try {
      await page.goto('/medical', { waitUntil: 'domcontentloaded' })
      await page.getByRole('tab', { name: 'Notifications' }).click()

      // All → every bucket visible.
      await expect(page.getByText(upcomingTitle)).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(recentTitle)).toBeVisible()
      await expect(page.getByText(pastTitle)).toBeVisible()

      // Upcoming → only the reminder.
      await page.getByRole('button', { name: 'Upcoming' }).click()
      await expect(page.getByText(upcomingTitle)).toBeVisible()
      await expect(page.getByText(recentTitle)).toHaveCount(0)
      await expect(page.getByText(pastTitle)).toHaveCount(0)

      // Recent → only the recent non-reminder.
      await page.getByRole('button', { name: 'Recent' }).click()
      await expect(page.getByText(recentTitle)).toBeVisible()
      await expect(page.getByText(upcomingTitle)).toHaveCount(0)
      await expect(page.getByText(pastTitle)).toHaveCount(0)

      // Past → only the old non-reminder.
      await page.getByRole('button', { name: 'Past' }).click()
      await expect(page.getByText(pastTitle)).toBeVisible()
      await expect(page.getByText(upcomingTitle)).toHaveCount(0)
      await expect(page.getByText(recentTitle)).toHaveCount(0)
    } finally {
      await cleanup()
    }
  })

  test('interactive controls meet the 44px tap-target minimum (fat-finger)', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const nowIso = new Date().toISOString()
    // Seed a provider so the ProviderCard (with View/Edit/Delete actions) renders.
    const provRef = firestore.collection('users').doc(ownerUserId).collection('providers').doc(`e2e_tap_${stamp}`)
    await provRef.set({
      id: provRef.id, userId: ownerUserId, type: 'doctor', name: `Dr Tap ${stamp}`,
      specialty: 'Cardiology', organization: 'Tap Clinic', address: '1 St', city: 'C',
      state: 'CA', zipCode: '90000', phone: '555-0100', patientsServed: [],
      addedAt: nowIso, createdAt: nowIso,
    })
    const cleanup = async () => { await provRef.delete().catch(() => {}) }

    try {
      await page.goto('/medical', { waitUntil: 'domcontentloaded' })

      // Tabs.
      for (const name of ['Appointments', 'Providers', 'Calendar', 'Notifications', 'Import']) {
        await assertTapTarget(page.getByRole('tab', { name }), `tab: ${name}`)
      }

      // Appointments (default) — schedule control.
      await assertTapTarget(page.getByRole('button', { name: /Schedule Appointment/i }).first(), 'Schedule Appointment')

      // Providers — the card action buttons you flagged.
      await page.getByRole('tab', { name: 'Providers' }).click()
      await assertTapTarget(page.getByRole('button', { name: 'View Details', exact: true }).first(), 'View Details')
      await assertTapTarget(page.getByRole('button', { name: 'Edit', exact: true }).first(), 'Edit')
      await assertTapTarget(page.getByRole('button', { name: 'Delete', exact: true }).first(), 'Delete')

      // Calendar — month nav, today, filters.
      await page.getByRole('tab', { name: 'Calendar' }).click()
      await assertTapTarget(page.getByRole('button', { name: 'Previous month' }), 'Previous month')
      await assertTapTarget(page.getByRole('button', { name: 'Next month' }), 'Next month')
      await assertTapTarget(page.getByRole('button', { name: 'Today', exact: true }), 'Today')
      for (const sel of await page.getByRole('combobox').all()) {
        await assertTapTarget(sel, 'calendar filter select')
      }

      // Notifications — filter chips.
      await page.getByRole('tab', { name: 'Notifications' }).click()
      for (const chip of ['All', 'Upcoming', 'Recent', 'Past']) {
        await assertTapTarget(page.getByRole('button', { name: chip, exact: true }), `chip: ${chip}`)
      }
    } finally {
      await cleanup()
    }
  })

  test('populated hub renders seeded providers and appointments in their tabs', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const providerName = `Dr E2E ${stamp}`
    const patientName = `E2E Patient ${stamp}`
    const nowIso = new Date().toISOString()
    const futureIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    const userRef = firestore.collection('users').doc(ownerUserId)
    const provRef = userRef.collection('providers').doc(`e2e_prov_${stamp}`)
    const aptRef = userRef.collection('appointments').doc(`e2e_apt_${stamp}`)

    await provRef.set({
      id: provRef.id,
      userId: ownerUserId,
      type: 'doctor',
      name: providerName,
      specialty: 'Cardiology',
      organization: 'E2E Heart Clinic',
      address: '1 Test St',
      city: 'Testville',
      state: 'CA',
      zipCode: '90000',
      phone: '555-0100',
      // ProviderCard renders provider.patientsServed.length unguarded.
      patientsServed: [],
      // listenToProviders orders by addedAt — a doc missing it is silently
      // excluded (Firestore orderBy drops field-less docs). See memory.
      addedAt: nowIso,
      createdAt: nowIso,
    })
    await aptRef.set({
      id: aptRef.id,
      userId: ownerUserId,
      // No patientId → passes the panel's active-patient filter without needing
      // a real seeded patient.
      patientName,
      providerId: provRef.id,
      providerName,
      dateTime: futureIso,
      reason: 'E2E Checkup',
      status: 'scheduled',
      addedAt: nowIso,
      createdAt: nowIso,
    })

    const cleanup = async () => {
      await provRef.delete().catch(() => {})
      await aptRef.delete().catch(() => {})
    }

    try {
      await page.goto('/medical', { waitUntil: 'domcontentloaded' })

      // Providers tab shows the seeded provider.
      await page.getByRole('tab', { name: 'Providers' }).click()
      await expect(page.getByText(providerName).first()).toBeVisible({ timeout: 30_000 })

      // Appointments tab shows the seeded (upcoming) appointment — as a real,
      // keyboard-focusable BUTTON (not a click-only div), meeting the tap-target.
      await page.getByRole('tab', { name: 'Appointments' }).click()
      await assertTapTarget(
        page.getByRole('button', { name: new RegExp(patientName) }),
        'appointment open button',
      )
    } finally {
      await cleanup()
    }
  })
})
