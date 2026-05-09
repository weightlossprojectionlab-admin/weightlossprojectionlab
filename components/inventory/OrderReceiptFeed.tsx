'use client'

/**
 * OrderReceiptFeed — chronological list of OrderReceipts in the
 * user/household. Each row shows status (Draft / Applied / Void),
 * counts, total, and (when locked) who's currently editing.
 *
 * Tap a row → calls onSelect with the receipt. The page wires that to
 * mount the detail view inline (replacing the no-item Purchase History
 * empty state).
 *
 * Status badges:
 *   - Draft (amber)   — awaiting review/apply
 *   - Applied (green) — inventory writes done, audit visible
 *   - Void (gray)     — explicitly rejected, no writes
 *
 * Duplicate-flag affordance: a draft auto-flagged as a likely duplicate
 * shows a small "Possible duplicate" pill so the user knows to compare
 * with whatever's already in the feed.
 */

import { isReceiptLockStale } from '@/lib/order-receipt-utils'
import type { OrderReceipt } from '@/types/shopping'

export interface OrderReceiptFeedProps {
  receipts: OrderReceipt[]
  /** Called when the user taps a row — page mounts the detail view. */
  onSelect: (receipt: OrderReceipt) => void
  /** Listener-level error from useRealtimeOrderReceipts. */
  error?: string | null
}

function formatCents(cents: number | undefined | null): string {
  if (cents == null) return '—'
  return `$${(cents / 100).toFixed(2)}`
}

function statusBadge(status: OrderReceipt['status']): { label: string; tone: string } {
  if (status === 'draft') return { label: 'Draft', tone: 'bg-warning/15 text-warning' }
  if (status === 'applied') return { label: 'Applied', tone: 'bg-success/15 text-success' }
  return { label: 'Void', tone: 'bg-muted text-muted-foreground' }
}

export function OrderReceiptFeed({ receipts, onSelect, error }: OrderReceiptFeedProps) {
  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/30 rounded-lg px-4 py-3">
        <h3 className="text-sm font-semibold text-destructive">Receipt feed unavailable</h3>
        <p className="text-xs text-destructive/80 mt-1 break-words">{error}</p>
      </div>
    )
  }

  if (receipts.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Recent receipts</h3>
        <p className="text-xs text-muted-foreground mt-1">
          No receipts yet. Snap one above to start the audit log.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Recent receipts · {receipts.length}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Tap a receipt to review, edit, and apply to inventory.
        </p>
      </div>
      <ul className="divide-y divide-border">
        {receipts.map((rc) => {
          const status = statusBadge(rc.status)
          const date = rc.createdAt instanceof Date ? rc.createdAt : new Date(rc.createdAt)
          const dateLabel = date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
          const isLocked =
            !!rc.editingBy && !isReceiptLockStale(rc.editingSince ?? null)
          // Counts: prefer applied audit fields, fall back to draft-line route counts.
          const isApplied = rc.status === 'applied'
          const inventoryCount = isApplied
            ? (rc.inventoryUpdated ?? 0) + (rc.inventoryCreated ?? 0)
            : rc.items.filter((l) => l.route === 'inventory').length
          const listCount = isApplied
            ? rc.listCreated ?? 0
            : rc.items.filter((l) => l.route === 'list').length
          const skipCount = isApplied
            ? rc.skipped ?? 0
            : rc.items.filter((l) => l.route === 'skip').length
          const failedCount = rc.failed ?? 0
          return (
            <li key={rc.id}>
              <button
                type="button"
                onClick={() => onSelect(rc)}
                className="w-full text-left px-4 py-3 active:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${status.tone}`}
                      >
                        {status.label}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {rc.receiptNumber}
                      </span>
                      <p className="text-sm font-semibold truncate">
                        {rc.store || 'Receipt'}
                      </p>
                      {rc.duplicateOfId && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-warning/15 text-warning">
                          Possible duplicate
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mt-1 text-[11px]">
                      <span className="text-muted-foreground">{dateLabel}</span>
                      {inventoryCount > 0 && (
                        <span className="text-primary">
                          {inventoryCount} inventory
                        </span>
                      )}
                      {listCount > 0 && (
                        <span className="text-success">{listCount} list</span>
                      )}
                      {skipCount > 0 && (
                        <span className="text-muted-foreground">
                          {skipCount} skip
                        </span>
                      )}
                      {failedCount > 0 && (
                        <span className="text-destructive font-medium">
                          {failedCount} failed
                        </span>
                      )}
                      {rc.totalCents != null && (
                        <span className="text-muted-foreground ml-auto">
                          {formatCents(rc.totalCents)}
                        </span>
                      )}
                    </div>
                    {isLocked && (
                      <p className="text-[11px] text-warning mt-1">
                        Editing by {rc.editingByName || 'someone'} —
                        you&apos;ll be able to take over if they go idle.
                      </p>
                    )}
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
