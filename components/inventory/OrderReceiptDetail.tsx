'use client'

/**
 * OrderReceiptDetail — per-receipt editable view, mounted inside the
 * Purchase History tab when a receipt is selected from the feed.
 *
 * Responsibilities:
 *   - Hold a single-editor lock on the receipt while open
 *     (claim on mount, heartbeat every 60s, release on unmount).
 *   - Show a header with status, store, date, total, confidence,
 *     duplicate-flag.
 *   - Show editable line list (qty, prices, route, normalized name,
 *     match override).
 *   - Apply → runs lib/order-receipts.applyOrderReceipt; transitions
 *     status to 'applied' + writes inventory.
 *   - Void → runs voidOrderReceipt; status goes to 'void', no writes.
 *
 * Lock UX:
 *   - If another user holds the lock and it isn't stale → show a
 *     read-only banner with "Editing by X". Take-over button appears
 *     once the lock is stale (5+ min of no heartbeat).
 *   - If we hold the lock OR the lock is stale → the form is
 *     editable.
 *
 * Real-time updates: useRealtimeOrderReceipt subscribes to the doc
 * itself, so a concurrent caregiver applying or voiding the receipt
 * causes the detail view to reflect that immediately.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  CheckIcon,
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { matchReceiptToTrip } from '@/lib/receipt-matcher'
import {
  applyOrderReceipt,
  claimReceiptLock,
  heartbeatReceiptLock,
  releaseReceiptLock,
  updateReceiptLines,
  voidOrderReceipt,
} from '@/lib/order-receipts'
import { isReceiptLockStale } from '@/lib/order-receipt-utils'
import { useRealtimeOrderReceipt } from '@/hooks/useRealtimeOrderReceipts'
import type { OrderReceipt, OrderReceiptLine, ShoppingItem } from '@/types/shopping'

const HEARTBEAT_MS = 60 * 1000
const SAVE_DEBOUNCE_MS = 800

export interface OrderReceiptDetailProps {
  receiptId: string
  inventory: ShoppingItem[]
  onClose: () => void
}

function formatCents(cents: number | undefined | null): string {
  if (cents == null) return '—'
  return `$${(cents / 100).toFixed(2)}`
}

function statusBadgeTone(status: OrderReceipt['status']): string {
  if (status === 'draft') return 'bg-warning/15 text-warning'
  if (status === 'applied') return 'bg-success/15 text-success'
  return 'bg-muted text-muted-foreground'
}

const ROUTE_LABELS: Record<OrderReceiptLine['route'], string> = {
  inventory: 'Inventory',
  list: 'List',
  skip: 'Skip',
}

export function OrderReceiptDetail({ receiptId, inventory, onClose }: OrderReceiptDetailProps) {
  const userId = auth.currentUser?.uid
  const userName = auth.currentUser?.displayName || auth.currentUser?.email || 'You'

  const { receipt, loading, error } = useRealtimeOrderReceipt(receiptId)

  const [lockState, setLockState] = useState<
    | { status: 'pending' }
    | { status: 'granted' }
    | { status: 'refused'; heldBy: string; heldByName?: string }
    | { status: 'error'; message: string }
  >({ status: 'pending' })

  // Local working copy of lines — debounced-saved back to Firestore so
  // typing in price inputs doesn't fire a write per keystroke.
  const [lines, setLines] = useState<OrderReceiptLine[] | null>(null)
  const lastSavedRef = useRef<string>('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [applying, setApplying] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [confirmVoid, setConfirmVoid] = useState(false)

  // ----- LOCK lifecycle -----
  useEffect(() => {
    if (!userId || !receiptId) return

    let cancelled = false
    ;(async () => {
      try {
        const result = await claimReceiptLock(receiptId, { userId, userName })
        if (cancelled) return
        if (result.granted) {
          setLockState({ status: 'granted' })
        } else {
          setLockState({
            status: 'refused',
            heldBy: result.heldBy ?? '',
            heldByName: result.heldByName,
          })
        }
      } catch (err) {
        if (cancelled) return
        setLockState({ status: 'error', message: (err as Error).message })
      }
    })()

    // Heartbeat while we hold the lock — every 60s.
    const heartbeat = setInterval(() => {
      heartbeatReceiptLock(receiptId, userId).catch((err) =>
        logger.warn('[OrderReceiptDetail] Heartbeat failed', {
          message: (err as Error).message,
        }),
      )
    }, HEARTBEAT_MS)

    return () => {
      cancelled = true
      clearInterval(heartbeat)
      // Best-effort release on unmount. Server-side stale-lock recovery
      // catches cases where this fails (network drop, browser kill).
      releaseReceiptLock(receiptId, userId).catch(() => undefined)
    }
  }, [receiptId, userId, userName])

  // Hydrate the local lines once the receipt arrives.
  useEffect(() => {
    if (!receipt) return
    // Don't clobber local edits when the snapshot tick lands while we
    // were typing — only seed from server when we don't have a local
    // copy yet, OR when the doc transitioned out of draft.
    if (lines === null || receipt.status !== 'draft') {
      setLines(receipt.items)
      lastSavedRef.current = JSON.stringify(receipt.items)
    }
  }, [receipt, lines])

  // Debounced auto-save — only when we hold the lock and we're in draft.
  useEffect(() => {
    if (!receipt || receipt.status !== 'draft') return
    if (lockState.status !== 'granted') return
    if (lines === null) return
    const serialized = JSON.stringify(lines)
    if (serialized === lastSavedRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      updateReceiptLines(receiptId, lines)
        .then(() => {
          lastSavedRef.current = serialized
        })
        .catch((err) => {
          logger.warn('[OrderReceiptDetail] Line save failed', {
            message: (err as Error).message,
          })
        })
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [lines, receipt, receiptId, lockState.status])

  // Auto-match the lines that don't yet have a matchedItemId. Runs once
  // when the receipt arrives — keeps the user from doing the obvious
  // matching by hand. They can override per line.
  const matchedSeedRef = useRef(false)
  useEffect(() => {
    if (matchedSeedRef.current) return
    if (!receipt || receipt.status !== 'draft' || lines === null) return
    if (lockState.status !== 'granted') return
    const needsSeed = lines.some(
      (l) => !l.matchedItemId && l.route === 'inventory',
    )
    if (!needsSeed) {
      matchedSeedRef.current = true
      return
    }
    const matchResult = matchReceiptToTrip(
      lines.map((l) => ({
        rawName: l.rawName,
        normalizedName: l.normalizedName,
        quantity: l.quantity ?? null,
        unitPriceCents: l.unitPriceCents ?? null,
        totalPriceCents: l.totalPriceCents ?? null,
      })),
      inventory,
    )
    if (matchResult.matches.length === 0) {
      matchedSeedRef.current = true
      return
    }
    const inventoryById = new Map(inventory.map((it) => [it.id, it]))
    const next = [...lines]
    for (const m of matchResult.matches) {
      const target = next[m.receiptIndex]
      if (!target || target.matchedItemId) continue
      const item = inventoryById.get(m.tripItemId)
      next[m.receiptIndex] = {
        ...target,
        matchedItemId: m.tripItemId,
        matchedItemName: item?.productName,
      }
    }
    setLines(next)
    matchedSeedRef.current = true
  }, [receipt, lines, inventory, lockState.status])

  const inventoryById = useMemo(() => {
    const map = new Map<string, ShoppingItem>()
    for (const it of inventory) map.set(it.id, it)
    return map
  }, [inventory])

  // ----- Render guards -----
  if (!receiptId) return null
  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border px-5 py-8 text-center">
        <p className="text-sm text-muted-foreground">Loading receipt…</p>
      </div>
    )
  }
  if (error || !receipt) {
    return (
      <div className="bg-destructive/5 border border-destructive/30 rounded-lg px-5 py-4">
        <h3 className="text-sm font-semibold text-destructive">Couldn&apos;t load receipt</h3>
        <p className="text-xs text-destructive/80 mt-1 break-words">
          {error || 'Receipt not found'}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-xs text-destructive hover:underline"
        >
          ← Back to feed
        </button>
      </div>
    )
  }

  const isDraft = receipt.status === 'draft'
  const lockedByOther =
    !!receipt.editingBy &&
    receipt.editingBy !== userId &&
    !isReceiptLockStale(receipt.editingSince ?? null)
  const editable = isDraft && lockState.status === 'granted' && !lockedByOther

  const handleLineChange = (lineId: string, patch: Partial<OrderReceiptLine>) => {
    if (!lines) return
    setLines(lines.map((l) => (l.lineId === lineId ? { ...l, ...patch } : l)))
  }

  const handleApply = async () => {
    if (!userId) return
    setApplying(true)
    try {
      // Force any pending debounced save through before applying so the
      // server-side apply reads our latest line edits.
      if (lines) {
        await updateReceiptLines(receiptId, lines).catch(() => undefined)
        lastSavedRef.current = JSON.stringify(lines)
      }
      const result = await applyOrderReceipt(receiptId, { userId })
      const parts: string[] = []
      if (result.inventoryUpdated > 0) parts.push(`${result.inventoryUpdated} merged`)
      if (result.inventoryCreated > 0) parts.push(`${result.inventoryCreated} new`)
      if (result.listCreated > 0) parts.push(`${result.listCreated} on list`)
      if (parts.length === 0) parts.push('No changes')
      toast.success(`Applied ${receipt.receiptNumber} · ${parts.join(' · ')}`)
      if (result.failed > 0) {
        toast.error(`${result.failed} line${result.failed === 1 ? '' : 's'} failed — see receipt`)
      }
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Apply failed'
      toast.error(msg)
    } finally {
      setApplying(false)
    }
  }

  const handleVoid = async () => {
    setVoiding(true)
    try {
      await voidOrderReceipt(receiptId)
      toast.success(`Voided ${receipt.receiptNumber}`)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Void failed'
      toast.error(msg)
    } finally {
      setVoiding(false)
      setConfirmVoid(false)
    }
  }

  // ----- Render -----
  const renderedLines = lines ?? receipt.items

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header strip */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
              Back
            </button>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusBadgeTone(receipt.status)}`}
            >
              {receipt.status.toUpperCase()}
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {receipt.receiptNumber}
            </span>
          </div>
          <h2 className="text-base font-semibold mt-1 truncate">
            {receipt.store || 'Receipt'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {[
              receipt.receiptDate,
              receipt.totalCents != null
                ? `Total ${formatCents(receipt.totalCents)}`
                : null,
              `${receipt.items.length} line${receipt.items.length === 1 ? '' : 's'}`,
              `${receipt.confidence}% read`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      {/* Duplicate-flag banner */}
      {receipt.duplicateOfId && (
        <div className="px-5 py-2 bg-warning/10 border-b border-warning/30 text-xs text-warning flex items-start gap-2">
          <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            This receipt looks like a duplicate of one already in your feed.
            Compare both before applying — applying twice will double-count
            inventory.
          </p>
        </div>
      )}

      {/* Lock banner */}
      {lockedByOther && (
        <div className="px-5 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground">
          Editing by {receipt.editingByName || 'another user'} — read-only
          until they finish or go idle.
        </div>
      )}
      {lockState.status === 'refused' && !lockedByOther && (
        <div className="px-5 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground">
          Couldn&apos;t claim the editor lock. The doc may have stale lock state — try reopening.
        </div>
      )}
      {lockState.status === 'error' && (
        <div className="px-5 py-2 bg-destructive/10 border-b border-destructive/30 text-xs text-destructive">
          Lock error: {lockState.message}
        </div>
      )}

      {/* Line list */}
      <ul className="divide-y divide-border max-h-[60vh] overflow-y-auto">
        {renderedLines.map((line) => {
          const matched = line.matchedItemId
            ? inventoryById.get(line.matchedItemId)
            : null
          const matchName = matched?.productName ?? line.matchedItemName
          const showLineError = receipt.status === 'applied' && line.status === 'failed'
          return (
            <li key={line.lineId} className="px-5 py-3 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {line.rawName}
                </p>
                {line.status === 'success' && (
                  <CheckIcon className="w-4 h-4 text-success flex-shrink-0" />
                )}
                {line.status === 'failed' && (
                  <XCircleIcon className="w-4 h-4 text-destructive flex-shrink-0" />
                )}
              </div>

              {editable ? (
                <>
                  {/* Editable controls — only for draft + lock-held + not held by other */}
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                        Qty
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={line.quantity ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          handleLineChange(line.lineId, {
                            quantity: v === '' ? undefined : Number(v),
                          })
                        }}
                        className="form-input w-full text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                        Unit $
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={
                          line.unitPriceCents != null
                            ? (line.unitPriceCents / 100).toFixed(2)
                            : ''
                        }
                        onChange={(e) => {
                          const v = e.target.value
                          handleLineChange(line.lineId, {
                            unitPriceCents:
                              v === '' ? undefined : Math.round(Number(v) * 100),
                          })
                        }}
                        className="form-input w-full text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                        Total $
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={
                          line.totalPriceCents != null
                            ? (line.totalPriceCents / 100).toFixed(2)
                            : ''
                        }
                        onChange={(e) => {
                          const v = e.target.value
                          handleLineChange(line.lineId, {
                            totalPriceCents:
                              v === '' ? undefined : Math.round(Number(v) * 100),
                          })
                        }}
                        className="form-input w-full text-sm"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                      Cleaner name (optional)
                    </span>
                    <input
                      type="text"
                      value={line.normalizedName ?? ''}
                      onChange={(e) =>
                        handleLineChange(line.lineId, {
                          normalizedName: e.target.value || undefined,
                        })
                      }
                      placeholder={line.rawName}
                      className="form-input w-full text-sm"
                    />
                  </label>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {/* Route segmented control */}
                    <div className="flex flex-shrink-0 rounded-lg overflow-hidden border border-border">
                      {(['inventory', 'list', 'skip'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleLineChange(line.lineId, { route: r })}
                          className={`text-[11px] font-semibold px-2.5 py-1 min-w-[64px] border-l first:border-l-0 transition-colors ${
                            line.route === r
                              ? r === 'inventory'
                                ? 'bg-primary text-white border-primary'
                                : r === 'list'
                                  ? 'bg-success text-white border-success'
                                  : 'bg-muted text-muted-foreground'
                              : 'bg-card text-foreground active:bg-muted'
                          }`}
                          aria-pressed={line.route === r}
                        >
                          {ROUTE_LABELS[r]}
                        </button>
                      ))}
                    </div>
                    {line.route === 'inventory' && (
                      <div className="text-[11px] flex-1 min-w-[140px]">
                        {matchName ? (
                          <span className="text-primary truncate inline-flex items-center gap-1">
                            <CheckIcon className="w-3 h-3 flex-shrink-0" />
                            Merge into {matchName}
                            <button
                              type="button"
                              onClick={() =>
                                handleLineChange(line.lineId, {
                                  matchedItemId: undefined,
                                  matchedItemName: undefined,
                                })
                              }
                              className="ml-1 text-[10px] text-muted-foreground hover:underline"
                            >
                              clear
                            </button>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            New inventory row
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Read-only summary — applied / void / locked-by-other */}
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {line.normalizedName || line.rawName}
                    </span>
                    <span className="text-muted-foreground">
                      {line.quantity != null ? `${line.quantity} × ` : ''}
                      {formatCents(line.unitPriceCents ?? line.totalPriceCents ?? null)}
                    </span>
                  </div>
                  {matchName && (
                    <p className="text-[11px] text-primary">→ {matchName}</p>
                  )}
                  {line.route === 'list' && (
                    <p className="text-[11px] text-success">→ shopping list</p>
                  )}
                  {line.route === 'skip' && (
                    <p className="text-[11px] text-muted-foreground">→ skipped</p>
                  )}
                  {showLineError && line.errorMessage && (
                    <p className="text-[11px] text-destructive break-words">
                      {line.errorMessage}
                    </p>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>

      {/* Action footer — only for drafts where we hold the lock */}
      {isDraft && (
        <footer className="border-t border-border px-5 py-3 bg-card">
          {confirmVoid ? (
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                Void <span className="font-mono">{receipt.receiptNumber}</span>?
                No inventory writes will run.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmVoid(false)}
                  disabled={voiding}
                  className="flex-1 min-h-[44px] py-2 rounded-lg border border-border text-sm font-medium active:bg-muted disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVoid}
                  disabled={voiding}
                  className="flex-1 min-h-[44px] py-2 rounded-lg bg-destructive text-white text-sm font-semibold active:opacity-90 disabled:opacity-40"
                >
                  {voiding ? 'Voiding…' : 'Confirm void'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmVoid(true)}
                disabled={!editable || applying}
                className="min-h-[44px] px-3 py-2 rounded-lg border border-border text-sm font-medium text-destructive active:bg-muted disabled:opacity-40"
              >
                Void
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!editable || applying}
                className="flex-1 min-h-[44px] py-2 rounded-lg bg-primary text-white text-sm font-semibold active:bg-primary-dark disabled:opacity-40"
              >
                {applying ? 'Applying…' : 'Apply to inventory'}
              </button>
            </div>
          )}
        </footer>
      )}
    </div>
  )
}
