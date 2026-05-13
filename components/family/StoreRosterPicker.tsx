'use client'

/**
 * StoreRosterPicker — multi-select grid of curated chain tiles.
 *
 * The owner clicks tiles to add/remove chains from their household's
 * roster (persisted via useStoreRoster). Selected tiles render with a
 * filled brand-color background; unselected tiles render with a faint
 * border and the brand color reserved for the initial mark only — so
 * a half-completed picker reads at a glance.
 *
 * Pure UI shell over the catalog + hook. Lives under
 * components/family/ because the owner is the primary consumer, but
 * it has no family-dashboard-specific assumptions and can be hosted on
 * a modal, a settings page, or anywhere a roster picker fits.
 *
 * Phase 0a-i: brand-color + initial tiles. Phase 0a-iii (future) drops
 * real logos in via the catalog's optional `logoUrl` slot — same
 * picker UI, no consumer changes needed.
 */

import { useMemo } from 'react'
import {
  STORE_CATALOG,
  STORE_CATEGORY_LABELS,
  type StoreCatalogEntry,
  type StoreCategory,
} from '@/constants/store-roster'

interface StoreRosterPickerProps {
  selectedIds: string[]
  onToggle: (id: string) => void | Promise<void>
  /** When true, tiles are disabled (typically during a save). */
  disabled?: boolean
}

/**
 * Pick a foreground text/initial color that has enough contrast on
 * the brand background. We don't compute YIQ contrast at runtime —
 * the catalog colors are saturated mid-tones, and white initial + a
 * subtle text-shadow reads well on every entry. Kept here as a single
 * source of truth so changes propagate to the whole grid.
 */
const TILE_FG = 'text-white'

function StoreTile({
  store,
  selected,
  onToggle,
  disabled,
}: {
  store: StoreCatalogEntry
  selected: boolean
  onToggle: (id: string) => void | Promise<void>
  disabled?: boolean
}) {
  // Selected: filled brand color, white initial, white name on the line below.
  // Unselected: faint surface, initial keeps the brand color so the
  //             tile still reads "this is Walmart" before tap.
  return (
    <button
      type="button"
      onClick={() => onToggle(store.id)}
      disabled={disabled}
      aria-pressed={selected}
      data-testid={`store-tile-${store.id}`}
      className={[
        'group relative flex flex-col items-center justify-center gap-1.5',
        'rounded-2xl px-3 py-4 min-h-[96px] transition-all',
        'shadow-sm hover:shadow-md active:scale-[0.97]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        selected
          ? 'ring-2 ring-offset-2 ring-foreground/20'
          : 'border border-border bg-card hover:border-foreground/30',
      ].join(' ')}
      style={selected ? { backgroundColor: store.brandColor } : undefined}
    >
      <div
        className={[
          'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0',
          selected ? `${TILE_FG} bg-white/15` : '',
        ].join(' ')}
        style={!selected ? { backgroundColor: store.brandColor, color: 'white' } : undefined}
        aria-hidden
      >
        {store.initial}
      </div>
      <span
        className={[
          'text-xs font-medium text-center leading-tight px-1',
          selected ? TILE_FG : 'text-foreground',
        ].join(' ')}
      >
        {store.name}
      </span>
      {selected && (
        <span
          aria-hidden
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/90 flex items-center justify-center"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 10.5L8.5 14L15 7"
              stroke={store.brandColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </button>
  )
}

export function StoreRosterPicker({
  selectedIds,
  onToggle,
  disabled,
}: StoreRosterPickerProps) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  // Group catalog by category for section headers. Iteration order
  // matches STORE_CATEGORY_LABELS for deterministic layout.
  const grouped = useMemo(() => {
    const byCat = new Map<StoreCategory, StoreCatalogEntry[]>()
    for (const s of STORE_CATALOG) {
      const arr = byCat.get(s.category) || []
      arr.push(s)
      byCat.set(s.category, arr)
    }
    return byCat
  }, [])

  return (
    <div className="space-y-6" data-testid="store-roster-picker">
      {(Object.keys(STORE_CATEGORY_LABELS) as StoreCategory[]).map((cat) => {
        const stores = grouped.get(cat) || []
        if (stores.length === 0) return null
        return (
          <section key={cat} aria-label={STORE_CATEGORY_LABELS[cat]}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
              {STORE_CATEGORY_LABELS[cat]}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {stores.map((s) => (
                <StoreTile
                  key={s.id}
                  store={s}
                  selected={selectedSet.has(s.id)}
                  onToggle={onToggle}
                  disabled={disabled}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
