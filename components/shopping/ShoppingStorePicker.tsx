'use client'

/**
 * ShoppingStorePicker — "Which store?" bottom-sheet shown before a
 * caregiver session starts on /shopping/active.
 *
 * Phase 0a-ii consumer of the Phase 0a-i roster (useStoreRoster). The
 * household's curated chains render as tiles; the caregiver taps one
 * and the chosen name flows into shopping_sessions.storeLocation.name
 * → /api/owners/[ownerId]/shopping/start → the owner's bell title +
 * the active-shoppers strip ("Sarah is shopping at Walmart"). A small
 * "Skip" affordance lets the caregiver proceed without a store when
 * they're, e.g., dropping off prescriptions at multiple counters.
 *
 * Self-hiding when:
 *   • Household roster is empty (nothing to pick from)
 *   • Caller skipped (onPick(null) was called)
 *
 * Auto-skip behavior is intentional — we don't want the picker to
 * block in-store flow for a household that hasn't set up their
 * roster yet. The page treats "no roster" identically to "skipped":
 * session starts with no storeLocation.
 */

import { useEffect, useMemo } from 'react'
import { useStoreRoster } from '@/hooks/useStoreRoster'
import { STORE_CATALOG_BY_ID } from '@/constants/store-roster'
import { StoreBrandMark } from '@/components/family/StoreBrandMark'
import { useShopping } from '@/hooks/useShopping'

interface ShoppingStorePickerProps {
  householdId: string
  /** Called when the caregiver picks a store (id, name) or skips (null, null).
   *  The page wrapper uses these to decide what to pass into
   *  shoppingSessionManager.startSession. */
  onPick: (storeId: string | null, storeName: string | null) => void
  /** Called when the household roster is empty — the page wrapper
   *  proceeds with no store. Fired exactly once when the hook settles
   *  on an empty roster, so the parent can move on without rendering
   *  a useless empty modal. */
  onEmptyRoster: () => void
}

/** Per-store item count summary — drives the count badges on each
 *  tile so the caregiver knows where the work is. */
interface StoreCounts {
  /** items where assignedStoreId === storeId */
  perStore: Map<string, number>
  /** items with no / empty assignedStoreId — show in EVERY store's
   *  view since they're "buy wherever convenient" */
  unassigned: number
  /** total needed items (for the "Skip — see all N" footer count) */
  total: number
}

export function ShoppingStorePicker({
  householdId,
  onPick,
  onEmptyRoster,
}: ShoppingStorePickerProps) {
  const { selectedIds, loading } = useStoreRoster(householdId)
  // Phase 0b — read the owner's shopping items so we can show counts
  // per store on each tile. Reuses the same useShopping(targetUserId)
  // path the caregiver's /shopping/active already uses, so the listener
  // state is shared and counts stay in sync.
  const { items: shopItems } = useShopping(householdId)

  const counts: StoreCounts = useMemo(() => {
    const perStore = new Map<string, number>()
    let unassigned = 0
    let total = 0
    for (const it of shopItems) {
      if (!it.needed) continue
      total += 1
      const sid = it.assignedStoreId
      if (sid && sid.length > 0) {
        perStore.set(sid, (perStore.get(sid) || 0) + 1)
      } else {
        unassigned += 1
      }
    }
    return { perStore, unassigned, total }
  }, [shopItems])

  // Roster has finished loading and is empty — kick the page wrapper
  // forward immediately. Effect (not render-time) so we don't call a
  // setter during a parent's render.
  useEffect(() => {
    if (!loading && selectedIds.length === 0) {
      onEmptyRoster()
    }
  }, [loading, selectedIds.length, onEmptyRoster])

  // Show a small placeholder while the roster is loading — better
  // than an empty bottom sheet that flickers as the data lands.
  if (loading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        aria-hidden
        data-testid="shopping-store-picker-loading"
      >
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-6 text-center">
          <p className="text-sm text-muted-foreground">Loading stores…</p>
        </div>
      </div>
    )
  }

  // Roster empty — render nothing while the parent processes
  // onEmptyRoster. Keeps the DOM clean.
  if (selectedIds.length === 0) return null

  // Resolve the household's chosen ids back to catalog entries.
  const stores = selectedIds
    .map((id) => STORE_CATALOG_BY_ID[id])
    .filter((s): s is NonNullable<typeof s> => !!s)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-picker-title"
      data-testid="shopping-store-picker"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
      <div className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-8 max-h-[90vh] overflow-y-auto">
        <h2 id="store-picker-title" className="text-lg font-semibold text-foreground mb-1">
          Which store?
        </h2>
        <p className="text-xs text-muted-foreground mb-5">
          Pick where you&apos;re shopping so the family knows.
        </p>

        <div className="grid grid-cols-3 gap-2.5">
          {stores.map((store) => {
            // Phase 0b — items the caregiver will see when they pick
            // this store = items assigned here + unassigned ("any
            // store"). Unassigned bucket is shared across every tile;
            // that's intentional — they get picked off as the caregiver
            // grabs them at whichever store they're at first.
            const assignedHere = counts.perStore.get(store.id) || 0
            const visibleHere = assignedHere + counts.unassigned
            return (
              <button
                key={store.id}
                type="button"
                onClick={() => onPick(store.id, store.name)}
                data-testid={`shopping-store-pick-${store.id}`}
                data-item-count={visibleHere}
                className="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-4 min-h-[96px] shadow-sm hover:shadow-md active:scale-[0.97] transition-all border border-border bg-card hover:border-foreground/30"
              >
                <StoreBrandMark store={store} size="md" />
                <span className="text-xs font-medium text-center leading-tight">
                  {store.name}
                </span>
                <span className="text-[10px] text-muted-foreground leading-none">
                  {visibleHere} {visibleHere === 1 ? 'item' : 'items'}
                </span>
                {assignedHere > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm"
                    aria-label={`${assignedHere} items assigned to ${store.name}`}
                  >
                    {assignedHere}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => onPick(null, null)}
          className="w-full mt-5 px-4 py-2.5 text-sm font-medium rounded-xl bg-background border-2 border-border text-foreground hover:border-primary min-h-[44px]"
          data-testid="shopping-store-skip"
        >
          Skip — see all {counts.total} {counts.total === 1 ? 'item' : 'items'}
        </button>
      </div>
    </div>
  )
}
