'use client'

/**
 * Client Roster (white-label CRM).
 *
 * The agency operator's roster of managed clients, with search / status filter
 * / sort — the core "find and triage a client" affordance a care-management
 * console needs (the snapshot-card grid alone doesn't scale past a handful).
 *
 * RSC boundary: FamilySnapshotCard is a Server Component (admin-SDK backed), so
 * the server page pre-renders each card and passes it here as `card` alongside
 * lightweight filter metadata. This component filters/sorts the metadata
 * (instant, no round-trip — the list is already fully loaded) and renders the
 * matching server-rendered cards. No admin code reaches the client bundle.
 */

import { useMemo, useState, type ReactNode } from 'react'

export interface RosterItem {
  id: string
  name: string
  email: string
  lastActiveAt: string | null
  joinedPlatformAt: string | null
  card: ReactNode
}

type StatusFilter = 'all' | 'active' | 'inactive'
type SortKey = 'name' | 'recent' | 'joined'

// Client-safe mirror of _lib/load-families.isActive (that module is admin-SDK
// backed and can't be imported here). "Active" = activity within 30 days.
function isActive(iso: string | null): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return !Number.isNaN(t) && Date.now() - t < 30 * 24 * 60 * 60 * 1000
}

function ts(iso: string | null): number {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

export default function ClientRoster({ items }: { items: RosterItem[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('name')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = items.filter(item => {
      if (needle && !`${item.name} ${item.email}`.toLowerCase().includes(needle)) return false
      if (status === 'active' && !isActive(item.lastActiveAt)) return false
      if (status === 'inactive' && isActive(item.lastActiveAt)) return false
      return true
    })
    return [...list].sort((a, b) => {
      if (sort === 'recent') return ts(b.lastActiveAt) - ts(a.lastActiveAt)
      if (sort === 'joined') return ts(b.joinedPlatformAt) - ts(a.joinedPlatformAt)
      return a.name.localeCompare(b.name)
    })
  }, [items, query, status, sort])

  // Triage: clients with no activity in 30+ days need a check-in.
  const attentionCount = useMemo(
    () => items.filter(item => !isActive(item.lastActiveAt)).length,
    [items],
  )

  // No clients at all — the intake empty state (unchanged from before).
  if (items.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-12 text-center">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No clients yet</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Use the quick-add above, or the full intake form, to add your first client. Their card
          will appear here immediately.
        </p>
      </div>
    )
  }

  const inputClass =
    'px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'

  return (
    <div className="space-y-4">
      {/* Attention rollup — the triage queue at a glance: act on the flag,
          not by reading each card's timestamp. */}
      {attentionCount > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-semibold">{attentionCount}</span> of {items.length}{' '}
            {items.length === 1 ? 'client' : 'clients'} need attention — no activity in 30+ days.
          </p>
          <button
            type="button"
            onClick={() => setStatus('inactive')}
            className="shrink-0 inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium bg-amber-100 dark:bg-amber-800/40 text-amber-900 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-800/60 transition"
          >
            Show
          </button>
        </div>
      )}

      {/* Roster toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          type="search"
          aria-label="Search clients"
          placeholder="Search clients by name or email"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className={`${inputClass} flex-1`}
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={e => setStatus(e.target.value as StatusFilter)}
          className={inputClass}
        >
          <option value="all">All statuses</option>
          <option value="active">Active (last 30 days)</option>
          <option value="inactive">Needs attention</option>
        </select>
        <select
          aria-label="Sort clients"
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          className={inputClass}
        >
          <option value="name">Name (A–Z)</option>
          <option value="recent">Recently active</option>
          <option value="joined">Recently joined</option>
        </select>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400" role="status">
        {filtered.length} of {items.length} {items.length === 1 ? 'client' : 'clients'}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          No clients match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item.id}>{item.card}</div>
          ))}
        </div>
      )}
    </div>
  )
}
