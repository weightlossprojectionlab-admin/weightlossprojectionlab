/**
 * White-label Care-Package builder → branded proposal (real-outcome HAST).
 *
 * Runs under the chromium-franchise project (baseURL = the little-care-bears
 * subdomain, storageState = a franchise_admin fixture). Exercises the whole
 * Phase-1 slice as a real user would, asserting PERSISTED, RENDERED outcomes
 * (per feedback_hast_assert_real_outcome), not just that controls exist:
 *
 *   1. From an empty state, use the playbook quick-start to create the three
 *      tiers — asserts the derived prices (Core $1,200 → Anchor $720 / Growth
 *      $2,100) actually render on the cards (proves the write hit Firestore and
 *      the math is right).
 *   2. Generate a client proposal — asserts a share link is produced.
 *   3. Open the public proposal — asserts it renders the FROZEN tiers wearing
 *      the tenant's BRANDING: company name, the three prices, and the primary
 *      color applied as an hsl(...) value (NOT a hex).
 *
 * Uses firebase-admin directly (the .franchise specs use raw @playwright/test,
 * so there's no `firestore` fixture) to wipe carePackages/proposals before and
 * after — a clean slate so the quick-start panel shows, and no residue left on
 * the shared little-care-bears tenant.
 */

import { test, expect } from '@playwright/test'
import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}
const db = admin.firestore()

const TENANT_SLUG = 'little-care-bears'

// Same logic as lib/tenant-branding.ts hslToCss — inlined because the '@'
// path alias doesn't resolve under the Playwright ts runner.
function hslToCss(color: string | undefined | null, fallback = '262 83% 58%'): string {
  const value = (color ?? '').trim() || fallback
  return /^\d/.test(value) ? `hsl(${value})` : value
}

let tenantId = ''
let expectedCompany = ''
let expectedColorCss = ''

async function wipePackagesAndProposals() {
  if (!tenantId) return
  // carePackages live in the tenant subcollection.
  const pkgSnap = await db.collection('tenants').doc(tenantId).collection('carePackages').get()
  await Promise.all(pkgSnap.docs.map(d => d.ref.delete().catch(() => {})))
  // proposals are top-level, keyed by shareToken — filter to this tenant.
  const propSnap = await db.collection('proposals').where('tenantId', '==', tenantId).get()
  await Promise.all(propSnap.docs.map(d => d.ref.delete().catch(() => {})))
}

test.describe('White-label care-package builder → branded proposal', () => {
  test.setTimeout(4 * 60_000)

  test.beforeAll(async () => {
    const snap = await db.collection('tenants').where('slug', '==', TENANT_SLUG).limit(1).get()
    if (snap.empty) throw new Error(`Tenant "${TENANT_SLUG}" not found — provision it before running this spec.`)
    const doc = snap.docs[0]
    tenantId = doc.id
    const data = doc.data() as any
    expectedCompany = data?.branding?.companyName || data?.name || ''
    expectedColorCss = hslToCss(data?.branding?.primaryColor)
    await wipePackagesAndProposals()
  })

  test.afterAll(async () => {
    await wipePackagesAndProposals()
  })

  test('quick-start derives the three tiers, and the proposal renders them branded', async ({ page }) => {
    // ── Builder loads (auth passed) ──
    await page.goto('/dashboard/packages', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Care packages' })).toBeVisible({ timeout: 90_000 })

    // ── Quick-start: Core-first framing (default), target $1,200 ──
    await expect(page.getByRole('heading', { name: 'Quick start' })).toBeVisible()
    await page.getByPlaceholder('1200').fill('1200')
    await page.getByRole('button', { name: 'Create three tiers' }).click()

    // Derived prices must render on the cards — proves the writes persisted and
    // the playbook math is right (Core $1,200 → Anchor 0.6 = $720, Growth 1.75 = $2,100).
    await expect(page.getByText('$720', { exact: false }).first()).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText('$1,200', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('$2,100', { exact: false }).first()).toBeVisible()

    // ── Generate a client proposal ──
    await page.getByPlaceholder('The Rivera family').fill('The Rivera family')
    await page.getByRole('button', { name: 'Generate proposal link' }).click()

    const previewLink = page.getByRole('link', { name: /Preview proposal/i })
    await expect(previewLink).toBeVisible({ timeout: 60_000 })
    const href = await previewLink.getAttribute('href')
    expect(href, 'proposal href present').toBeTruthy()
    expect(href!).toMatch(/^\/pricing-proposal\/[a-f0-9]{48}$/)

    // ── Open the public branded proposal ──
    await page.goto(href!, { waitUntil: 'domcontentloaded' })

    // Branding: company name + "prepared for" + the frozen tiers.
    if (expectedCompany) {
      await expect(page.getByText(expectedCompany).first()).toBeVisible({ timeout: 60_000 })
    }
    await expect(page.getByText('The Rivera family')).toBeVisible()
    await expect(page.getByText('$720', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('$1,200', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('$2,100', { exact: false }).first()).toBeVisible()
    // exact:true — otherwise it also matches the Core blurb "...our recommended plan".
    await expect(page.getByText('Recommended', { exact: true })).toBeVisible() // core tier highlight

    // The primary color must be applied as an hsl(...) value (NOT a hex). The
    // tier price <p> carries `style={{ color: primary }}`; assert the literal
    // inline style, which preserves the hsl() string (getComputedStyle would
    // normalize it to rgb()).
    const priceStyles = await page.locator('p', { hasText: '/mo' }).evaluateAll(els =>
      els.map(el => (el as HTMLElement).getAttribute('style') || ''),
    )
    const hasHslPrice = priceStyles.some(s => s.includes('hsl('))
    expect(hasHslPrice, `a price uses an hsl() color (styles: ${JSON.stringify(priceStyles)})`).toBe(true)
    // And it matches THIS tenant's branding triplet specifically.
    const matchesTenantColor = priceStyles.some(s => s.replace(/\s+/g, ' ').includes(expectedColorCss))
    expect(
      matchesTenantColor,
      `price color matches tenant branding ${expectedColorCss} (styles: ${JSON.stringify(priceStyles)})`,
    ).toBe(true)
  })
})
