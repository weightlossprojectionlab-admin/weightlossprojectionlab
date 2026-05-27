import { test, expect } from './fixtures'
import {
  type MemberProfile,
  seedMemberProfile,
  deleteMember,
} from './helpers/family-sim'
import { Timestamp } from 'firebase-admin/firestore'

/**
 * Cause→effect chains — PRODUCT-PROOF e2e.
 *
 * Unlike scripts/simulate-family-week.ts (logs-only, no-write), these
 * write real data / drive real flows and assert the PRODUCT actually
 * produces the downstream effect. Built one chain at a time.
 *
 *   Chain 1  Missed appointment → surfaces in "Past", NOT marked completed
 *   Chain 2  Abnormal vital → vital_alert notification  (TODO)
 *   Chain 3  Overdue chore → duty_overdue notification   (TODO)
 *   Chain 4  Shopping session → items land in inventory  (TODO)
 *
 * Run:
 *   npx playwright test e2e/family-chains.spec.ts --headed
 */

const STAMP = String(Date.now()).slice(-5)

const member: MemberProfile = {
  key: 'chain', name: `Chain Demo ${STAMP}`, dob: '1979-08-30', gender: 'female',
  heightInches: 65, currentWeightLbs: 172, startWeight: 185, targetWeight: 150, relationship: 'self',
  healthConditions: ['Hypertension'],
}

test.use({ launchOptions: { slowMo: 300 } })

test.describe.serial('Cause→effect chains', () => {
  test.setTimeout(180_000)

  test('seed the chain-test member', async ({ ownerUserId, firestore }) => {
    await seedMemberProfile(firestore, ownerUserId, member, '')
    expect(member.patientId).toBeTruthy()
    console.log(`→ Seeded chain member ${member.patientId}`)
  })

  test('Chain 1 — a missed appointment surfaces in Past, not completed', async ({ page, ownerUserId, firestore }) => {
    expect(member.patientId, 'patientId from seed').toBeTruthy()
    const userRef = firestore.collection('users').doc(ownerUserId)
    const apptNow = new Date().toISOString()

    // CAUSE: appointments whose time has passed without being completed.
    // The platform has no explicit "missed" status — "missed" = a
    // `scheduled` appointment with a past dateTime, or an explicit
    // `no-show`. Seed both (USER-level collection, the canonical path).
    const missed = new Date(); missed.setDate(missed.getDate() - 5); missed.setHours(9, 0, 0, 0)
    const noShow = new Date(); noShow.setDate(noShow.getDate() - 12); noShow.setHours(14, 0, 0, 0)
    await userRef.collection('appointments').add({
      userId: ownerUserId, patientId: member.patientId, patientName: member.name,
      dateTime: missed.toISOString(), type: 'follow-up', status: 'scheduled',
      providerName: 'Dr. Missed', specialty: 'Cardiology', reason: 'BP recheck (missed)',
      requiresDriver: false, driverStatus: 'not-needed',
      createdAt: apptNow, createdBy: ownerUserId, updatedAt: apptNow, updatedBy: ownerUserId,
      dataSource: 'family-sim',
    })
    await userRef.collection('appointments').add({
      userId: ownerUserId, patientId: member.patientId, patientName: member.name,
      dateTime: noShow.toISOString(), type: 'check-up', status: 'no-show',
      providerName: 'Dr. Noshow', specialty: 'Primary Care', reason: 'Annual physical (no-show)',
      requiresDriver: false, driverStatus: 'not-needed',
      createdAt: apptNow, createdBy: ownerUserId, updatedAt: apptNow, updatedBy: ownerUserId,
      dataSource: 'family-sim',
    })

    // EFFECT: both surface under "Past", and the missed one is NOT
    // badged "✓ completed" (the product treats elapsed-but-not-completed
    // as simply past — there is no dedicated missed/overdue indicator,
    // which is itself a finding worth noting).
    await page.goto(`/patients/${member.patientId}?tab=appointments`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Loading your health journey...')).toBeHidden({ timeout: 90_000 })

    await expect(page.getByRole('heading', { name: /^Past \(/i }).first()).toBeVisible({ timeout: 30_000 })
    const drMissed = page.getByText('Dr. Missed', { exact: false }).first()
    await expect(drMissed).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Dr. Noshow', { exact: false }).first()).toBeVisible()

    // The missed appointment's card must NOT carry the "completed" badge.
    const missedCard = page.locator('div').filter({ hasText: 'Dr. Missed' }).filter({ hasText: /BP recheck|Cardiology/ }).first()
    await expect(missedCard.getByText(/✓ completed/i)).toHaveCount(0)

    console.log('→ Chain 1 OK: missed + no-show appointments surface in Past, not marked completed')
    await page.waitForTimeout(2000)
  })

  test('cleanup', async ({ ownerUserId, firestore }) => {
    if (process.env.KEEP_DATA === '1') return
    if (member.patientId) await deleteMember(firestore, ownerUserId, member.patientId)
    console.log('[chains] Cleanup done')
  })
})
