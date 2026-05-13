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

import { useEffect } from 'react'
import { useStoreRoster } from '@/hooks/useStoreRoster'
import { STORE_CATALOG_BY_ID } from '@/constants/store-roster'

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

export function ShoppingStorePicker({
  householdId,
  onPick,
  onEmptyRoster,
}: ShoppingStorePickerProps) {
  const { selectedIds, loading } = useStoreRoster(householdId)

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
          {stores.map((store) => (
            <button
              key={store.id}
              type="button"
              onClick={() => onPick(store.id, store.name)}
              data-testid={`shopping-store-pick-${store.id}`}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-4 min-h-[96px] shadow-sm hover:shadow-md active:scale-[0.97] transition-all border border-border bg-card hover:border-foreground/30"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                style={{ backgroundColor: store.brandColor }}
                aria-hidden
              >
                {store.initial}
              </div>
              <span className="text-xs font-medium text-center leading-tight">
                {store.name}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onPick(null, null)}
          className="w-full mt-5 px-4 py-2.5 text-sm font-medium rounded-xl bg-background border-2 border-border text-foreground hover:border-primary min-h-[44px]"
          data-testid="shopping-store-skip"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
