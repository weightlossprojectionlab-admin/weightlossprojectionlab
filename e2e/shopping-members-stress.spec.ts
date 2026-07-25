/**
 * Stress test: multi-member + multi-caregiver shopping scoping (single-source shopping_items).
 *
 * Seeds a FULL household — 4 family members (patients) + 2 caregiver relationships + member-scoped
 * shopping items attributed across the caregivers — then, as the authenticated owner, asserts:
 *
 *   1. Per-member ISOLATION — /shopping?memberId=X shows ONLY that member's items (no leakage).
 *   2. Model B superset — the household master list shows EVERY member's items, each with the
 *      correct "For {name}" badge.
 *   3. Firestore integrity — one row per item, scoped to the right memberId, no cross-member dups.
 *
 * All seeded data (patients, caregivers, items) is torn down in finally. Owner-side (chromium).
 *
 * NOTE: this drives multiple caregivers at the DATA layer (relationships + item attribution).
 * Multi-caregiver UI login is separate (needs provisioned auth accounts); the percyrice fixture
 * covers one real caregiver login in *.caregiver.spec.ts.
 */

import { test, expect } from './fixtures'

const MEMBER_NAMES = ['Ava', 'Ben', 'Cara', 'Dan']
const CAREGIVER_NAMES = ['Carol', 'Dave']

test.describe('Multi-member + caregiver shopping stress @shopping-members', () => {
  test.setTimeout(6 * 60_000)
  // Navigating between per-member views aborts the pages' on-load fetches; ignore that chain.
  test.use({ expectedApiErrorCodes: ['Failed to fetch', 'api_request'] })

  test('member-scoped isolation + Model B badges hold across a full household', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const patientsCol = firestore.collection('users').doc(ownerUserId).collection('patients')
    const famCol = firestore.collection('users').doc(ownerUserId).collection('familyMembers')
    const itemsCol = firestore.collection('shopping_items')

    const members = MEMBER_NAMES.map((n, i) => ({ id: `stress-m-${stamp}-${i}`, name: `${n} Stress ${stamp}` }))
    const caregivers = CAREGIVER_NAMES.map((n, i) => ({ uid: `stress-cg-${stamp}-${i}`, name: `${n} CG ${stamp}` }))
    // 2 items per member, attributed round-robin across the caregivers.
    const items = members.flatMap((m, mi) =>
      [0, 1].map((k) => ({
        id: `stress-i-${stamp}-${mi}-${k}`,
        memberId: m.id,
        addedBy: caregivers[(mi + k) % caregivers.length].uid,
        name: `${MEMBER_NAMES[mi]} supply ${k} ${stamp}`,
      })),
    )

    const cleanup = async () => {
      await Promise.all([
        ...members.map((m) => patientsCol.doc(m.id).delete().catch(() => {})),
        ...caregivers.map((c) => famCol.doc(c.uid).delete().catch(() => {})),
        ...items.map((it) => itemsCol.doc(it.id).delete().catch(() => {})),
      ])
    }
    await cleanup()

    try {
      const nowIso = new Date().toISOString()

      // ---- Seed 4 members (patients) ----
      await Promise.all(
        members.map((m) =>
          patientsCol.doc(m.id).set({
            id: m.id, userId: ownerUserId, name: m.name, type: 'human',
            relationship: 'child', createdAt: nowIso, updatedAt: nowIso,
          }),
        ),
      )

      // ---- Seed 2 caregiver relationships (accepted, full access to all members) ----
      await Promise.all(
        caregivers.map((c) =>
          famCol.doc(c.uid).set({
            userId: c.uid, name: c.name, relationship: 'family', status: 'accepted',
            familyRole: 'caregiver', patientsAccess: members.map((m) => m.id),
            permissions: { viewRecords: true, viewMedications: true }, addedAt: nowIso,
          }),
        ),
      )

      // ---- Seed member-scoped shopping items (attributed to caregivers) ----
      await Promise.all(
        items.map((it) =>
          itemsCol.doc(it.id).set({
            userId: ownerUserId, householdId: ownerUserId, memberId: it.memberId,
            productName: it.name, manualIngredientName: it.name, category: 'other',
            quantity: 1, needed: true, inStock: false, isManual: true,
            addedBy: [it.addedBy], requestedBy: [it.addedBy], recipeIds: [], source: 'manual',
            createdAt: new Date(), updatedAt: new Date(),
          }),
        ),
      )

      // ============ 1. Per-member ISOLATION ============
      for (const m of members) {
        await page.goto(`/shopping?memberId=${m.id}`, { waitUntil: 'domcontentloaded' })
        for (const it of items.filter((x) => x.memberId === m.id)) {
          await expect(page.getByText(it.name, { exact: false }).first()).toBeVisible({ timeout: 30_000 })
        }
        // An item belonging to a DIFFERENT member must not appear on this member's list.
        const foreign = items.find((x) => x.memberId !== m.id)!
        await expect(page.getByText(foreign.name, { exact: false })).toHaveCount(0)
      }

      // ============ 2. Model B superset + "For {name}" badges ============
      await page.goto('/shopping', { waitUntil: 'domcontentloaded' })
      for (const it of items) {
        await expect(page.getByText(it.name, { exact: false }).first()).toBeVisible({ timeout: 30_000 })
      }
      for (const m of members) {
        await expect(page.getByText(`For ${m.name}`, { exact: false }).first()).toBeVisible({ timeout: 15_000 })
      }

      // ============ 3. Firestore integrity ============
      const snap = await itemsCol.where('householdId', '==', ownerUserId).get()
      for (const it of items) {
        const matches = snap.docs.filter((d) =>
          String(d.data().manualIngredientName || '').includes(it.name),
        )
        expect(matches.length, `exactly one row for "${it.name}"`).toBe(1)
        expect(matches[0].data().memberId, `"${it.name}" scoped to its member`).toBe(it.memberId)
      }
    } finally {
      if (process.env.KEEP_DATA === '1') {
        console.log('[shopping-members] KEEP_DATA=1 — leaving seeded household in Firestore.')
      } else {
        await cleanup()
      }
    }
  })
})
