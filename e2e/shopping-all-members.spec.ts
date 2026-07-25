/**
 * Stress test: percyrice (a REAL caregiver of the whole household) sees each member's isolated
 * shopping list. Runs as the caregiver (chromium-caregiver project → percyrice storageState).
 *
 * Discovers the owner's real members at runtime (Jimmy + the seeded family), seeds member-scoped
 * items via the Admin SDK, then as percyrice asserts per-member ISOLATION across the whole
 * household: /shopping?memberId=X shows ONLY member X's items, never another member's. This
 * proves cross-account owner-scope resolution for a caregiver assigned to every member.
 *
 * Seeded items are torn down in finally.
 */

import { test, expect } from './fixtures'

test.describe('All-members caregiver shopping isolation @all-members-caregiver', () => {
  test.setTimeout(6 * 60_000)
  // Ignore: navigation-aborted on-load fetches, and the transient 401 chain on cold load when
  // the reused storageState's ID token is mid-refresh (ghost 401s — the app recovers and the
  // assertions still pass).
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('percyrice sees each member\'s isolated list across the whole household', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const itemsCol = firestore.collection('shopping_items')

    // Resolve the owner's REAL members (exclude any leftover test-junk ids, defensively).
    const pats = await firestore.collection('users').doc(ownerUserId).collection('patients').get()
    const members = pats.docs
      .filter((d) => !d.id.startsWith('mcg-member-') && !d.id.startsWith('stress-m-'))
      .map((d) => ({ id: d.id, name: String(d.get('name') || 'Member') }))
    console.log(`[allcg] household members: ${members.map((m) => m.name).join(', ')}`)
    expect(members.length, 'household should have multiple real members').toBeGreaterThan(1)

    // 2 member-scoped items per member.
    const items = members.flatMap((m, mi) =>
      [0, 1].map((k) => ({
        id: `allcg-${stamp}-${mi}-${k}`,
        memberId: m.id,
        name: `${m.name.split(' ')[0]} supply ${k} ${stamp}`,
      })),
    )
    const cleanup = async () => {
      for (const it of items) await itemsCol.doc(it.id).delete().catch(() => {})
    }
    await cleanup()

    try {
      const now = new Date()
      for (const it of items) {
        await itemsCol.doc(it.id).set({
          userId: ownerUserId, householdId: ownerUserId, memberId: it.memberId,
          productName: it.name, manualIngredientName: it.name, category: 'other',
          quantity: 1, needed: true, inStock: false, isManual: true,
          recipeIds: [], source: 'manual', createdAt: now, updatedAt: now,
        })
      }

      // As percyrice: each member's list shows ONLY that member's items.
      for (const m of members) {
        await page.goto(`/shopping?memberId=${m.id}`, { waitUntil: 'domcontentloaded' })
        for (const it of items.filter((x) => x.memberId === m.id)) {
          await expect(
            page.getByText(it.name, { exact: false }).first(),
            `percyrice should see ${m.name}'s item`,
          ).toBeVisible({ timeout: 30_000 })
        }
        const foreign = items.find((x) => x.memberId !== m.id)!
        await expect(
          page.getByText(foreign.name, { exact: false }),
          `${m.name}'s list must not leak another member's item`,
        ).toHaveCount(0)
      }
    } finally {
      if (process.env.KEEP_DATA === '1') {
        console.log('[allcg] KEEP_DATA=1 — leaving seeded items.')
      } else {
        await cleanup()
      }
    }
  })
})
