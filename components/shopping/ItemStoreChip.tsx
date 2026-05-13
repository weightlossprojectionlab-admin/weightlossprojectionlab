'use client'

/**
 * ItemStoreChip — per-row store-assignment control on /shopping.
 *
 * Phase 0b-iv. Renders the item's current `assignedStoreId` as a
 * compact chip (brand mark + name). Tap → opens a bottom-sheet
 * picker scoped to the household's curated roster. Owner picks /
 * clears assignment; persisted via `updateShoppingItem`.
 *
 * When unassigned: chip reads "Any store" with the neutral border
 * style. Caregivers picking any store in their Start Shopping flow
 * see unassigned items (they're "buy wherever convenient").
 *
 * Visual:
 *   - Assigned: brand-color outline, 24px brand mark, store name
 *   - Unassigned: muted "+ Set store" affordance
 *
 * DRY: brand-mark rendering reuses StoreBrandMark; roster reuses
 * useStoreRoster; the picker shape mirrors ShoppingStorePicker but
 * smaller (no "skip" footer because the chip itself supports clearing
 * via a 'none' tile).
 */

import { useState } from 'react'
import { STORE_CATALOG_BY_ID, type StoreCatalogEntry } from '@/constants/store-roster'
import { useStoreRoster } from '@/hooks/useStoreRoster'
import { StoreBrandMark } from '@/components/family/StoreBrandMark'

interface ItemStoreChipProps {
  /** Current assignment (undefined / empty = "Any store"). */
  assignedStoreId?: string
  /** Whose household roster to render. Defaults to caller's signed-in
   *  user via useStoreRoster's default. Pass when an admin / caregiver
   *  is editing on someone else's behalf. */
  ownerId?: string
  /** Called with the new assignment (catalog id) OR null to clear. */
  onAssign: (storeId: string | null) => void | Promise<void>
  /** Disable interaction (e.g. while a write is in flight). */
  disabled?: boolean
}

export function ItemStoreChip({
  assignedStoreId,
  ownerId,
  onAssign,
  disabled,
}: ItemStoreChipProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { selectedIds, loading } = useStoreRoster(ownerId)
  const assigned: StoreCatalogEntry | undefined = assignedStoreId
    ? STORE_CATALOG_BY_ID[assignedStoreId]
    : undefined

  const handlePick = async (id: string | null) => {
    setPickerOpen(false)
    await onAssign(id)
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // Stop propagation so the chip doesn't bubble up to the
          // ShoppingItemCard's row-level onClick (which would open
          // the item detail modal).
          e.stopPropagation()
          setPickerOpen(true)
        }}
        disabled={disabled}
        data-testid="item-store-chip"
        data-assigned-store-id={assignedStoreId || ''}
        className={[
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          'transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          assigned
            ? 'bg-background border-2'
            : 'bg-muted/50 border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-foreground/40',
        ].join(' ')}
        style={
          assigned
            ? { borderColor: assigned.brandColor, color: assigned.brandColor }
            : undefined
        }
      >
        {assigned ? (
          <>
            <StoreBrandMark store={assigned} size="sm" />
            <span className="truncate max-w-[120px]">{assigned.name}</span>
          </>
        ) : (
          <>
            <span aria-hidden>+</span>
            <span>Any store</span>
          </>
        )}
      </button>

      {pickerOpen && (
        <ItemStorePickerSheet
          selectedIds={selectedIds}
          rosterLoading={loading}
          currentAssignment={assignedStoreId}
          onPick={handlePick}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}

interface ItemStorePickerSheetProps {
  selectedIds: string[]
  rosterLoading: boolean
  currentAssignment?: string
  onPick: (storeId: string | null) => void | Promise<void>
  onClose: () => void
}

function ItemStorePickerSheet({
  selectedIds,
  rosterLoading,
  currentAssignment,
  onPick,
  onClose,
}: ItemStorePickerSheetProps) {
  const rosterStores = selectedIds
    .map((id) => STORE_CATALOG_BY_ID[id])
    .filter((s): s is StoreCatalogEntry => !!s)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-store-picker-title"
      data-testid="item-store-picker"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-8 max-h-[80vh] overflow-y-auto">
        <h2 id="item-store-picker-title" className="text-base font-semibold text-foreground mb-1">
          Where to buy this?
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Pick a store from your list, or leave it as &ldquo;Any store.&rdquo;
        </p>

        {rosterLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : rosterStores.length === 0 ? (
          <div className="py-4">
            <p className="text-sm text-foreground mb-2">No stores in your list yet.</p>
            <a
              href="/shopping/stores"
              className="text-sm text-primary underline"
            >
              Add stores on My Stores →
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {/* "Any store" tile — clears the assignment. */}
            <button
              type="button"
              onClick={() => onPick(null)}
              data-testid="item-store-pick-none"
              className={[
                'flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-4 min-h-[88px]',
                'shadow-sm hover:shadow-md active:scale-[0.97] transition-all',
                !currentAssignment
                  ? 'ring-2 ring-foreground/30 bg-card border border-border'
                  : 'border border-dashed border-muted-foreground/30 bg-card hover:border-foreground/40',
              ].join(' ')}
            >
              <div className="w-7 h-7 rounded-xl flex items-center justify-center text-base text-muted-foreground bg-muted">
                ✱
              </div>
              <span className="text-xs font-medium text-center">Any store</span>
            </button>
            {rosterStores.map((store) => {
              const selected = store.id === currentAssignment
              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => onPick(store.id)}
                  data-testid={`item-store-pick-${store.id}`}
                  className={[
                    'flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-4 min-h-[88px]',
                    'shadow-sm hover:shadow-md active:scale-[0.97] transition-all',
                    selected
                      ? 'ring-2 ring-offset-2 ring-foreground/20'
                      : 'border border-border bg-card hover:border-foreground/30',
                  ].join(' ')}
                  style={selected ? { backgroundColor: store.brandColor } : undefined}
                >
                  <StoreBrandMark store={store} size="md" whiteSurface />
                  <span
                    className={[
                      'text-xs font-medium text-center leading-tight',
                      selected ? 'text-white' : 'text-foreground',
                    ].join(' ')}
                  >
                    {store.name}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
