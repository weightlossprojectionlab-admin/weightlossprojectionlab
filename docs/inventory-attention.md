# Inventory Attention — triage ranking for the inventory tab

The inventory tab is, mathematically, a **stock-flow system whose UI is a ranking
function**. Every item is scored by one number — its *Attention* — and the tab is
just that list sorted descending. Lives in [`lib/inventory-attention.ts`](../lib/inventory-attention.ts).

## The model

Two clocks are the only reasons an item needs attention:

```
T_empty = depletion clock  (when it runs out)   → action: restock
T_spoil = spoilage clock   (when it goes bad)    → action: use-soon
```

Each clock passes through an urgency kernel `u(T;τ) = exp(−max(0,T)/τ)` (→ 1 as a
clock hits 0, → 0 far out). The item's score is the **max** of the two — whichever
crisis is sooner owns it — scaled by a demand weight `D`:

```
A = D · max( w_r·u(T_empty;τ_r),  w_s·u(T_spoil;τ_s) )
```

Phase 0 (shipped): rule-based point estimates, `D = 1`. `T_empty` from purchase
cadence (`averageDaysBetweenPurchases − daysSinceLastPurchase`); `T_spoil` from
`expiresAt`, else category default shelf-life − age. Phase 1 adds the wiring
below. Phase 2 (deferred) swaps point estimates for learned distributions —
see the `project_reorder_restocking_ml` track.

## Ranking — keep the score bounded, break ties separately

`u` pins every overdue / out-of-stock item to `1.00`, so a flat sort leaves the
crisis pile in arbitrary order (20 stockouts → ranking collapses). We **do not**
unbound the score (that destroys its clean `[0,1]` interpretability). Instead
[`compareAttention`](../lib/inventory-attention.ts) is a composite key:

```
score DESC,  then  soonestClock ASC   (most-overdue first)
```

`soonestClock` is the sooner raw clock (cold-start out-of-stock = 0, missing
clock = +∞). So `Salt(−12d) → Flour(−7d) → Yogurt(−3d) → Eggs(−1d) → Coffee(0d)`
all sit at `score 1.00` but rank chronologically.

## Expired ⇒ discard, not use-soon

When `T_spoil < 0` the on-hand stock is already **waste**, so the action is
`discard` (its own state), not a taller use-soon urgency. Escalating-past-zero is
right for restock, wrong for spoil.

## Where it's wired (Phase 1)

- **Main list sort** ([`app/inventory/page.tsx`](../app/inventory/page.tsx) `getItemsForLocation`):
  `compareAttention` first, then newest-added as the tiebreaker for the calm bulk.
- **Per-item badge**: `discard` (solid red, loudest) / `use-soon` (amber) /
  `restock` (blue). Discard always shows; restock/use-soon only when `score ≥ 0.5`
  (~within 5 days) so a stocked pantry isn't drowned in badges.
- **Suggested Reorder tab**: reads the restock facet of the same score.

## Verify

- Unit: `npx jest __tests__/lib/inventory-attention.test.ts` (four corners, the
  action flip when clocks cross, discard state, composite comparator).
- Demo: `npx tsx scripts/demo-inventory-attention.ts` (prints the urgency curve +
  a ranked table).
- E2E: `npx tsx scripts/seed-attention-e2e.ts` then
  `npx playwright test --project=chromium e2e/inventory-attention.spec.ts`
  (asserts live `/inventory` order + badges), then `… --clean`.

## ⚠️ Critical bug fixed alongside this work

`getCategoryMetadata()` returned `CATEGORY_METADATA[category]` with **no
fallback**. A legacy/unmapped category on any inventory row returned `undefined`,
and the card's `categoryMeta.icon` access threw — **unmounting the entire React
tree** (white-screen `/inventory`). tsc + unit tests were green; only the live
E2E render surfaced it. Fixed at the source: unknown categories now fall back to
`'other'`, and `calculateDefaultExpiration` routes through the same guard.
**Unmapped category states are now safe** — a single bad row can no longer crash
the page. See [`lib/product-categories.ts`](../lib/product-categories.ts).
