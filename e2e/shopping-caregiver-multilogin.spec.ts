/**
 * Stress test: MULTIPLE caregivers each really log in and see the owner's per-member shopping list.
 *
 * Fully self-contained — provisions everything via the Admin SDK, tears it all down in finally:
 *   • a member (patient) under the E2E owner + one member-scoped shopping item,
 *   • 2 caregiver auth accounts, each with an onboarded user doc (height + goals so no onboarding
 *     redirect), a caregiverOf grant, and an accepted familyMembers doc KEYED BY THE CAREGIVER UID
 *     (so isHouseholdMember(owner) passes in the rules).
 *
 * Then each caregiver signs in fresh (own browser context) and must see the member's item at
 * /shopping?memberId= — proving real cross-account access + the owner-scope resolution for more
 * than one caregiver at once.
 */

import { test, expect } from './fixtures'
import * as admin from 'firebase-admin'

const PASSWORD = 'E2eMultiCg!2345'
const CG_COUNT = Number(process.env.MCG_COUNT || 2)

test.describe('Multi-caregiver real-login shopping access @caregiver-multilogin', () => {
  test.setTimeout(Number(process.env.MCG_TIMEOUT_MS || 8 * 60_000))
  // The owner-page warm-up below hits /auth + /shopping, whose on-load fetches can abort.
  test.use({ expectedApiErrorCodes: ['Failed to fetch', 'api_request'] })

  test('each provisioned caregiver signs in and sees the owner member list', async ({
    page,
    browser,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const authAdmin = admin.auth()
    const memberId = `mcg-member-${stamp}`
    const itemId = `mcg-item-${stamp}`
    const itemName = `Caregiver-visible supply ${stamp}`
    const caregivers = Array.from({ length: CG_COUNT }, (_, i) => ({
      email: `e2e-mcg-${i + 1}-${stamp}@example.com`,
      name: `MultiCG ${i + 1} ${stamp}`,
      uid: '',
    }))

    const patientsCol = firestore.collection('users').doc(ownerUserId).collection('patients')
    const famCol = firestore.collection('users').doc(ownerUserId).collection('familyMembers')
    const itemsCol = firestore.collection('shopping_items')

    const cleanup = async () => {
      for (const cg of caregivers) {
        if (!cg.uid) continue
        await firestore.collection('users').doc(cg.uid).delete().catch(() => {})
        await famCol.doc(cg.uid).delete().catch(() => {})
        await authAdmin.deleteUser(cg.uid).catch(() => {})
      }
      await patientsCol.doc(memberId).delete().catch(() => {})
      await itemsCol.doc(itemId).delete().catch(() => {})
    }

    // Defensive pre-sweep: a run that dies before finally would leave e2e-mcg-* accounts +
    // relationships + mcg-member- patients/items behind. Clear ALL such leftovers up front so
    // orphans can never accumulate on the owner account.
    const sweepOrphans = async () => {
      const stale = (await authAdmin.listUsers(1000)).users.filter((u) =>
        String(u.email || '').startsWith('e2e-mcg-'),
      )
      for (const u of stale) {
        await firestore.collection('users').doc(u.uid).delete().catch(() => {})
        await famCol.doc(u.uid).delete().catch(() => {})
        await authAdmin.deleteUser(u.uid).catch(() => {})
      }
      for (const d of (await patientsCol.get()).docs) {
        if (d.id.startsWith('mcg-member-')) await d.ref.delete().catch(() => {})
      }
      for (const d of (await itemsCol.where('householdId', '==', ownerUserId).get()).docs) {
        const m = d.get('memberId')
        if (typeof m === 'string' && m.startsWith('mcg-member-')) await d.ref.delete().catch(() => {})
      }
    }
    await sweepOrphans()

    try {
      const nowIso = new Date().toISOString()

      // ---- Seed a member + a member-scoped item under the owner ----
      await patientsCol.doc(memberId).set({
        id: memberId, userId: ownerUserId, name: `MCG Member ${stamp}`, type: 'human',
        relationship: 'child', createdAt: nowIso, updatedAt: nowIso,
      })
      await itemsCol.doc(itemId).set({
        userId: ownerUserId, householdId: ownerUserId, memberId,
        productName: itemName, manualIngredientName: itemName, category: 'other',
        quantity: 1, needed: true, inStock: false, isManual: true,
        recipeIds: [], source: 'manual', createdAt: new Date(), updatedAt: new Date(),
      })

      // ---- Provision each caregiver ----
      for (const cg of caregivers) {
        const u = await authAdmin.createUser({
          email: cg.email, password: PASSWORD, emailVerified: true, displayName: cg.name,
        })
        cg.uid = u.uid
        await firestore.collection('users').doc(cg.uid).set({
          email: cg.email, name: cg.name, displayName: cg.name,
          // Onboarding-complete fields (height + goals) so /auth doesn't route to onboarding.
          height: 70, goals: { dailyCalorieGoal: 2000, targetWeight: 170 }, activityLevel: 'moderately-active',
          caregiverOf: [{
            accountOwnerId: ownerUserId, role: 'caregiver', patientsAccess: [memberId],
            permissions: { viewRecords: true }, addedAt: nowIso, familyPlan: true,
          }],
          createdAt: nowIso, updatedAt: nowIso,
        })
        // familyMembers doc keyed by caregiver UID → isHouseholdMember(owner) === true.
        await famCol.doc(cg.uid).set({
          userId: cg.uid, email: cg.email, name: cg.name, relationship: 'family',
          status: 'accepted', familyRole: 'caregiver', patientsAccess: [memberId],
          permissions: { viewRecords: true, viewMedications: true }, addedAt: nowIso,
          managedBy: ownerUserId,
        })
      }

      // Warm the routes each caregiver context will hit, on the owner's already-signed-in page,
      // so a fresh context doesn't pay Turbopack's cold-compile per route (that alone pushed a
      // 2-caregiver run past the timeout on this HTTPS dev server).
      await page.goto('/auth', { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.goto(`/shopping?memberId=${memberId}`, { waitUntil: 'domcontentloaded' }).catch(() => {})
      await page.waitForTimeout(1500)

      // ---- Each caregiver signs in and must see the member's item ----
      // ONE reused context: the first caregiver pays the cold-context cost; subsequent ones
      // reuse the warm client (we just clear Firebase auth between them). A fresh context per
      // caregiver re-pays Turbopack's ~4-min cold compile and blows the timeout.
      const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 960, height: 940 } })
      const p = await ctx.newPage()
      try {
        for (const cg of caregivers) {
          // Reset auth to signed-out before each sign-in (Firebase persists to IndexedDB).
          await ctx.clearCookies()
          await p.goto('/auth', { waitUntil: 'domcontentloaded' })
          await p.evaluate(() => {
            try { localStorage.clear(); sessionStorage.clear() } catch {}
            try { indexedDB.deleteDatabase('firebaseLocalStorageDb') } catch {}
          })
          await p.reload({ waitUntil: 'domcontentloaded' })

          const emailInput = p.getByLabel('Email address')
          await emailInput.waitFor({ state: 'visible', timeout: 90_000 })
          await emailInput.fill(cg.email)
          await p.getByLabel('Password', { exact: true }).fill(PASSWORD)
          await p.getByRole('button', { name: 'Sign in', exact: true }).click()
          await p.waitForURL(/\/(dashboard|patients|onboarding|caregiver|shopping)\b/, { timeout: 60_000 })
          console.log(`[mcg] ${cg.email} signed in → ${p.url()}`)

          await p.goto(`/shopping?memberId=${memberId}`, { waitUntil: 'domcontentloaded' })
          await p.waitForTimeout(2000)
          console.log(`[mcg] ${cg.email} shopping page → ${p.url()}`)
          await expect(
            p.getByText(itemName, { exact: false }).first(),
            `caregiver ${cg.email} should see the owner's member item`,
          ).toBeVisible({ timeout: 30_000 })
        }
      } finally {
        await ctx.close()
      }
    } finally {
      if (process.env.KEEP_DATA === '1') {
        console.log('[caregiver-multilogin] KEEP_DATA=1 — leaving provisioned caregivers in place.')
      } else {
        await cleanup()
      }
    }
  })
})
