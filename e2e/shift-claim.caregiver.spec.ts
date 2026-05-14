import { test, expect } from '@playwright/test'
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Phase 0d task-gating assertions — multi-assigned duties show the
 * right affordance based on claim state.
 *
 * Three semantic contracts under test, against the signed-in caregiver
 * in the chromium-caregiver Playwright project (uid X0exv...). The
 * caregiver is on WLP's familyMembers list; duties seeded here put
 * the caregiver in assignedTo[] alongside a dummy second uid so the
 * duty is multi-assigned (the case that needs claim semantics).
 *
 *   1. UNCLAIMED multi-assigned duty renders the "Take this →" chip
 *      and the card is interactive. Tapping it claims via the
 *      /claim endpoint and refreshes; chip disappears.
 *   2. CLAIMED-BY-OTHER duty renders the "🔒 Taken" chip, card is
 *      dimmed and not interactive (button disabled).
 *   3. SINGLE-ASSIGNED duty (caregiver is the only assignee, claimedBy
 *      auto-set at create time) renders NO claim chip — neither
 *      "Take this" nor "Taken" appears. The data-claim-state attribute
 *      resolves to 'own'.
 *
 * Seed via admin SDK in beforeAll; cleanup in afterAll. The duties
 * are tagged with __test_phase0d_ prefix so they're easy to identify
 * and tear down without disturbing real data.
 */

const OWNER_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2' // Weight Loss Project
const CAREGIVER_UID = 'X0exvZzk4iPc5OV0lEOBQglWDoA3' // signed-in user in chromium-caregiver
const DUMMY_UID = '__test_phase0d_dummy_caregiver_uid__'
const HOUSEHOLD_DOC_ID = '29GCzfnQ9GvJ58QQo1DB' // WLP's household doc

function findServiceAccountPath(): string {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const c = path.join(dir, 'service_account_key.json')
    if (fs.existsSync(c)) return c
    const p = path.dirname(dir)
    if (p === dir) break
    dir = p
  }
  throw new Error('service_account_key.json not found')
}

if (getApps().length === 0) {
  initializeApp({ credential: cert(require(findServiceAccountPath())) })
}
const adminDb = getFirestore(getApp())

const stamp = Date.now()
const SEED_IDS = {
  unclaimed: `__test_phase0d_unclaimed_${stamp}`,
  claimedByOther: `__test_phase0d_taken_${stamp}`,
  singleAssigned: `__test_phase0d_solo_${stamp}`,
}

const SEED_NAMES = {
  unclaimed: `PHASE0D Pool Duty A (${stamp})`,
  claimedByOther: `PHASE0D Pool Duty B (${stamp})`,
  singleAssigned: `PHASE0D Solo Duty (${stamp})`,
}

test.beforeAll(async () => {
  // Tomorrow as the nextDueDate so urgency renders as 'soon' (not
  // overdue) — avoids the urgency-badge branch overlapping the
  // claim-chip slot in the UI.
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowIso = tomorrow.toISOString()
  const now = new Date().toISOString()

  const baseDuty = {
    householdId: HOUSEHOLD_DOC_ID,
    userId: OWNER_UID,
    category: 'custom' as const,
    isCustom: true,
    assignedBy: OWNER_UID,
    assignedAt: now,
    frequency: 'weekly' as const,
    priority: 'medium' as const,
    status: 'pending' as const,
    completionCount: 0,
    skipCount: 0,
    notifyOnCompletion: false,
    notifyOnOverdue: false,
    reminderEnabled: false,
    createdAt: now,
    createdBy: OWNER_UID,
    lastModified: now,
    isActive: true,
    nextDueDate: tomorrowIso,
  }

  await Promise.all([
    // Unclaimed multi-assigned duty.
    adminDb.collection('household_duties').doc(SEED_IDS.unclaimed).set({
      ...baseDuty,
      name: SEED_NAMES.unclaimed,
      assignedTo: [CAREGIVER_UID, DUMMY_UID],
      // claimedBy intentionally absent — this is the "Take this" case.
    }),
    // Claimed-by-other multi-assigned duty.
    adminDb.collection('household_duties').doc(SEED_IDS.claimedByOther).set({
      ...baseDuty,
      name: SEED_NAMES.claimedByOther,
      assignedTo: [CAREGIVER_UID, DUMMY_UID],
      claimedBy: DUMMY_UID,
      claimedAt: now,
    }),
    // Single-assigned (caregiver is the only one). Auto-claim would
    // happen if created via the POST endpoint; we replicate that here.
    adminDb.collection('household_duties').doc(SEED_IDS.singleAssigned).set({
      ...baseDuty,
      name: SEED_NAMES.singleAssigned,
      assignedTo: [CAREGIVER_UID],
      claimedBy: CAREGIVER_UID,
      claimedAt: now,
    }),
  ])
})

test.afterAll(async () => {
  await Promise.all(
    Object.values(SEED_IDS).map((id) =>
      adminDb.collection('household_duties').doc(id).delete().catch(() => {}),
    ),
  )
})

test('unclaimed multi-assigned duty shows "Take this →" chip; tapping claims it', async ({ page }) => {
  await page.goto(`/caregiver/${OWNER_UID}/shift`, { waitUntil: 'domcontentloaded' })

  // Wait for the worklist to be hydrated. Locate the seeded duty card
  // by its title (stable, unique to this run thanks to the timestamp).
  const card = page.locator('button[data-testid^="shift-item-"]').filter({
    hasText: SEED_NAMES.unclaimed,
  })
  await expect(card).toBeVisible({ timeout: 30_000 })

  // Assert the claim state attribute + the visible affordance.
  await expect(card).toHaveAttribute('data-claim-state', 'unclaimed')
  const takeChip = card.locator('[data-testid^="shift-item-take-this-"]')
  await expect(takeChip).toBeVisible()
  await expect(takeChip).toContainText(/take this/i)

  // Tap to claim. After the round-trip + refresh, the card transitions
  // to 'own' state and the "Take this" chip disappears.
  await card.click()
  await expect(card).toHaveAttribute('data-claim-state', 'own', { timeout: 15_000 })
  await expect(takeChip).toHaveCount(0)
})

test('claimed-by-other duty shows "🔒 Taken" chip and the card is disabled', async ({ page }) => {
  await page.goto(`/caregiver/${OWNER_UID}/shift`, { waitUntil: 'domcontentloaded' })

  const card = page.locator('button[data-testid^="shift-item-"]').filter({
    hasText: SEED_NAMES.claimedByOther,
  })
  await expect(card).toBeVisible({ timeout: 30_000 })

  await expect(card).toHaveAttribute('data-claim-state', 'claimed_by_other')
  const takenChip = card.locator('[data-testid^="shift-item-claimed-by-other-"]')
  await expect(takenChip).toBeVisible()
  await expect(takenChip).toContainText(/taken/i)

  // The button is rendered with disabled — Playwright surfaces that
  // via the standard `isDisabled` check.
  await expect(card).toBeDisabled()
})

test('single-assigned duty renders normally — no claim chip, claim-state is "own"', async ({ page }) => {
  await page.goto(`/caregiver/${OWNER_UID}/shift`, { waitUntil: 'domcontentloaded' })

  const card = page.locator('button[data-testid^="shift-item-"]').filter({
    hasText: SEED_NAMES.singleAssigned,
  })
  await expect(card).toBeVisible({ timeout: 30_000 })

  await expect(card).toHaveAttribute('data-claim-state', 'own')
  // Neither claim chip variant should be present on this card.
  await expect(card.locator('[data-testid^="shift-item-take-this-"]')).toHaveCount(0)
  await expect(card.locator('[data-testid^="shift-item-claimed-by-other-"]')).toHaveCount(0)
})
