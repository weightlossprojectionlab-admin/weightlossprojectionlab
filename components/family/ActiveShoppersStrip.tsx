'use client'

/**
 * ActiveShoppersStrip — "Sarah is shopping at Walmart, 12 min in" pill
 * for the family dashboard.
 *
 * Semantic intent: the orchestration arc that started with Phase 2's
 * Start/Done bell fan-out. The bell is the EVENT signal ("Sarah just
 * started"); this strip is the PERSISTENT signal ("Sarah is in-store
 * right now"). Together they give the family the time window to plan
 * around — when's dinner, when do meds arrive, who needs to be home.
 *
 * Hidden when no shoppers are active. Live-updates duration every 30s
 * (the same cadence as the session manager's heartbeat, so the pill's
 * "X min in" reads agree with the underlying session state).
 *
 * Phase 3a scope: list one card per active shopper. Phase 3b adds an
 * ETA prediction (from per-(shopper, store) trip-duration history);
 * Phase 3c handles multi-caregiver layout polish.
 */

import { useEffect, useState } from 'react'
import { useActiveShoppers } from '@/hooks/useActiveShoppers'
import type { ShoppingSession } from '@/types/shopping-session'

interface ActiveShoppersStripProps {
  householdId: string | null | undefined
}

function getStartedAtMs(s: ShoppingSession): number {
  return (
    (s.startedAt as any)?.toMillis?.() ??
    (s.startedAt instanceof Date ? s.startedAt.getTime() : 0)
  )
}

/** "12 min in" / "1 hr 5 min in" — bounded by the session's 2-hour
 *  expiry so we don't render absurd values for a stale session that
 *  somehow slipped past the freshness filter. */
function formatDuration(startedAtMs: number): string {
  if (!startedAtMs) return 'just started'
  const diff = Math.max(0, Date.now() - startedAtMs)
  const totalMin = Math.floor(diff / 60_000)
  if (totalMin < 1) return 'just started'
  if (totalMin < 60) return `${totalMin} min in`
  const hr = Math.floor(totalMin / 60)
  const min = totalMin % 60
  return min > 0 ? `${hr} hr ${min} min in` : `${hr} hr in`
}

function ShopperCard({ session }: { session: ShoppingSession }) {
  // Tick the displayed duration every 30s without re-subscribing the
  // listener. setInterval handles the wall-clock drift; the listener
  // handles state changes (status flips, lastActivityAt updates).
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const initial = (session.userName || '?').trim().charAt(0).toUpperCase()
  const storeName = session.storeLocation?.name?.trim()
  const startedAtMs = getStartedAtMs(session)
  const itemsLine = session.itemsScanned > 0
    ? `${session.itemsScanned} item${session.itemsScanned === 1 ? '' : 's'} picked`
    : ''

  return (
    <li
      className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 shadow-sm"
      data-testid={`active-shopper-${session.id}`}
    >
      <div className="w-10 h-10 rounded-full bg-amber-300/80 dark:bg-amber-600/40 flex items-center justify-center text-base font-semibold text-amber-900 dark:text-amber-100 flex-shrink-0">
        <span aria-hidden>{initial}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          <span aria-hidden className="mr-1">🛒</span>
          {session.userName} is shopping
          {storeName ? ` at ${storeName}` : ''}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDuration(startedAtMs)}
          {itemsLine ? ` · ${itemsLine}` : ''}
        </p>
      </div>
      {/* Tiny breathing pulse so the strip reads as "live" without being
          aggressive. Hidden from screen readers via aria-hidden — the
          textual "X min in" already conveys the live state. */}
      <span
        className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"
        aria-hidden
      />
    </li>
  )
}

export function ActiveShoppersStrip({ householdId }: ActiveShoppersStripProps) {
  const { sessions } = useActiveShoppers(householdId)
  if (sessions.length === 0) return null

  return (
    <section
      aria-label="Active shoppers"
      className="mb-6"
      data-testid="active-shoppers-strip"
    >
      <ul className="space-y-2">
        {sessions.map((s) => (
          <ShopperCard key={s.id} session={s} />
        ))}
      </ul>
    </section>
  )
}
