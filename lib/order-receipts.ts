'use client'

/**
 * OrderReceipt persistence + apply pipeline.
 *
 *   saveOrderReceipt(ocrResult, options)
 *     - Generates receiptNumber + fingerprint
 *     - Auto-flags duplicates (same household, same fingerprint, status != void)
 *     - Writes the doc as `draft` — NO inventory writes yet
 *     - Returns { receiptId, isDuplicate, duplicateOfId? }
 *
 *   applyOrderReceipt(receiptId, lines, options)
 *     - Runs match-and-merge against current inventory (DRY w/ in-trip review)
 *     - Updates the receipt doc to `applied` with audit fields + per-line outcomes
 *     - Releases the editor lock
 *
 *   voidOrderReceipt(receiptId, options)
 *     - Marks `void`, no inventory writes, releases lock
 *
 *   claimReceiptLock / heartbeatReceiptLock / releaseReceiptLock
 *     - Single-editor concurrency control with 5-min stale-lock recovery
 *
 * The trip-flow (lib/apply-receipt-prices.ts) is unchanged — that path
 * has different semantics (it patches prices onto existing items the
 * user already touched in-store, never creates new rows). The PO flow
 * (this module) is for retroactive bulk intake.
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import { logger } from './logger'
import { addManualShoppingItem } from './shopping-operations'
import { pickPriceCents } from './receipt-matcher'
import { COLLECTIONS } from '@/constants/firestore'
import {
  computeReceiptFingerprint,
  generateLineId,
  generateReceiptNumber,
  isReceiptLockStale,
  RECEIPT_LOCK_STALE_MS,
} from './order-receipt-utils'
import type { ReceiptOCRResponse } from '@/lib/validations/receipt-ocr'
import type {
  OrderReceipt,
  OrderReceiptLine,
  PackTier,
  PurchaseHistoryEntry,
  ShoppingItem,
} from '@/types/shopping'

const SHOPPING_ITEMS_COLLECTION = COLLECTIONS.SHOPPING_ITEMS
const ORDER_RECEIPTS_COLLECTION = COLLECTIONS.ORDER_RECEIPTS

// ============================================================
// SAVE — write a draft from OCR, auto-flag duplicates
// ============================================================

export interface SaveOrderReceiptOptions {
  userId: string
  householdId?: string
}

export interface SaveOrderReceiptResult {
  receiptId: string
  receiptNumber: string
  isDuplicate: boolean
  duplicateOfId?: string
  duplicateOfReceiptNumber?: string
}

/**
 * Look for a non-void receipt with the same fingerprint in the user/
 * household scope. Returns the first match (or null).
 *
 * One-shot getDocs is fine here — fingerprint queries run once per
 * save, not in a hot loop. No need for an indexed listener.
 */
async function findDuplicateByFingerprint(
  fingerprint: string,
  options: SaveOrderReceiptOptions,
): Promise<{ id: string; receiptNumber: string } | null> {
  try {
    const baseQuery = options.householdId
      ? query(
          collection(db, ORDER_RECEIPTS_COLLECTION),
          where('householdId', '==', options.householdId),
          where('fingerprint', '==', fingerprint),
          firestoreLimit(5),
        )
      : query(
          collection(db, ORDER_RECEIPTS_COLLECTION),
          where('userId', '==', options.userId),
          where('fingerprint', '==', fingerprint),
          firestoreLimit(5),
        )
    const snap = await getDocs(baseQuery)
    for (const d of snap.docs) {
      const data = d.data() as OrderReceipt
      if (data.status !== 'void') {
        return { id: d.id, receiptNumber: data.receiptNumber }
      }
    }
    return null
  } catch (err) {
    // Don't block save on a failed dupe check — log and continue.
    logger.warn('[OrderReceipts] Duplicate-check query failed', {
      message: (err as Error).message,
    })
    return null
  }
}

export async function saveOrderReceipt(
  ocrResult: ReceiptOCRResponse,
  options: SaveOrderReceiptOptions,
): Promise<SaveOrderReceiptResult> {
  if (!options.userId) {
    throw new Error('Sign-in required to save a receipt.')
  }

  const fingerprint = computeReceiptFingerprint(ocrResult)
  const dupe = await findDuplicateByFingerprint(fingerprint, options)

  // Build the draft lines — every parsed item starts routed to
  // 'inventory'. The user can change routes per line in the detail
  // view. Stable lineIds let the detail view track edits across
  // re-renders.
  const lines: OrderReceiptLine[] = ocrResult.items.map((it) => {
    const line: OrderReceiptLine = {
      lineId: generateLineId(),
      rawName: it.rawName,
      route: 'inventory',
    }
    if (it.normalizedName) line.normalizedName = it.normalizedName
    // Quantity defaults to 1 when the receipt didn't print one — the
    // most common case is single-line items where the qty is implicit
    // (one product = one row). Weighed items also land here ("1.42 LB
    // @ 2.99/LB"); for those, qty=1 means "one package of the weighed
    // item" which is semantically correct for inventory + ML purposes.
    // Eliminates the null-handling branch in every downstream consumer
    // (apply, display, ML feature extraction).
    line.quantity = it.quantity != null && it.quantity > 0 ? it.quantity : 1
    if (it.unitPriceCents != null) line.unitPriceCents = it.unitPriceCents
    if (it.totalPriceCents != null) line.totalPriceCents = it.totalPriceCents
    return line
  })

  const receiptNumber = generateReceiptNumber()
  const docPayload: Record<string, unknown> = {
    userId: options.userId,
    receiptNumber,
    status: 'draft',
    confidence: ocrResult.confidence,
    items: lines,
    fingerprint,
    createdAt: Timestamp.fromDate(new Date()),
  }
  if (options.householdId) docPayload.householdId = options.householdId
  if (ocrResult.store) docPayload.store = ocrResult.store
  // Phase 0h — capture address + hours from OCR; feeds the ML
  // substrate (per-location reorder timing, time-of-day patterns).
  if (ocrResult.storeAddress) docPayload.storeAddress = ocrResult.storeAddress
  if (ocrResult.storeHours) docPayload.storeHours = ocrResult.storeHours
  if (ocrResult.date) docPayload.receiptDate = ocrResult.date
  if (ocrResult.totalCents != null) docPayload.totalCents = ocrResult.totalCents
  if (ocrResult.subtotalCents != null) docPayload.subtotalCents = ocrResult.subtotalCents
  if (ocrResult.taxCents != null) docPayload.taxCents = ocrResult.taxCents
  if (dupe) docPayload.duplicateOfId = dupe.id

  const ref = await addDoc(collection(db, ORDER_RECEIPTS_COLLECTION), docPayload)

  logger.info('[OrderReceipts] Draft saved', {
    receiptId: ref.id,
    receiptNumber,
    lineCount: lines.length,
    isDuplicate: !!dupe,
  })

  return {
    receiptId: ref.id,
    receiptNumber,
    isDuplicate: !!dupe,
    duplicateOfId: dupe?.id,
    duplicateOfReceiptNumber: dupe?.receiptNumber,
  }
}

// ============================================================
// LINE EDITS — persist user edits while in draft state
// ============================================================

/**
 * Replace the items array on a draft receipt. Caller passes the
 * updated array; we don't merge per-field because the detail view
 * controls the canonical line state. Strips undefined values from
 * lines so Firestore accepts the write.
 */
export async function updateReceiptLines(
  receiptId: string,
  lines: OrderReceiptLine[],
): Promise<void> {
  const cleaned = lines.map(stripUndefinedFromLine)
  const ref = doc(db, ORDER_RECEIPTS_COLLECTION, receiptId)
  await updateDoc(ref, { items: cleaned })
}

/**
 * Phase 0h — update editable header metadata on a DRAFT receipt:
 * receiptDate (for "I snapped this 3 days late" or OCR misreads),
 * storeAddress, storeHours, store name. The applyOrderReceipt flow
 * reads receiptDate as the canonical purchase date for every line's
 * purchaseHistory entry, so allowing the user to correct it before
 * apply is the difference between accurate inventory + ML data and
 * silently-stale prices.
 *
 * Caller-supplied undefined / empty values are skipped (no clobber);
 * pass `null` to explicitly clear a field. Doesn't transition state.
 */
export async function updateReceiptMetadata(
  receiptId: string,
  patch: {
    store?: string | null
    storeAddress?: string | null
    storeHours?: string | null
    receiptDate?: string | null
  },
): Promise<void> {
  const updates: Record<string, any> = {}
  for (const key of ['store', 'storeAddress', 'storeHours', 'receiptDate'] as const) {
    const v = patch[key]
    if (v === undefined) continue
    if (v === null || v === '') {
      // Caller asked to clear. Use Firestore's null sentinel so a
      // future read sees the absence cleanly.
      updates[key] = null
    } else {
      updates[key] = v
    }
  }
  if (Object.keys(updates).length === 0) return
  const ref = doc(db, ORDER_RECEIPTS_COLLECTION, receiptId)
  await updateDoc(ref, updates)
}

function stripUndefinedFromLine(line: OrderReceiptLine): OrderReceiptLine {
  const out: OrderReceiptLine = {
    lineId: line.lineId,
    rawName: line.rawName,
    route: line.route,
  }
  if (line.normalizedName) out.normalizedName = line.normalizedName
  if (line.quantity != null) out.quantity = line.quantity
  if (line.unitPriceCents != null) out.unitPriceCents = line.unitPriceCents
  if (line.totalPriceCents != null) out.totalPriceCents = line.totalPriceCents
  if (line.matchedItemId) out.matchedItemId = line.matchedItemId
  if (line.matchedItemName) out.matchedItemName = line.matchedItemName
  if (line.status) out.status = line.status
  if (line.createdItemId) out.createdItemId = line.createdItemId
  if (line.errorMessage) out.errorMessage = line.errorMessage
  return out
}

// ============================================================
// LOCK — single-editor concurrency control
// ============================================================

export interface ClaimLockResult {
  granted: boolean
  /** When refused: who currently holds the lock. */
  heldBy?: string
  heldByName?: string
  staleAt?: Date
}

/**
 * Try to claim the editor lock on a receipt. Granted when:
 *   - lock is unset, OR
 *   - lock is held by the same user, OR
 *   - lock is held by another user but has gone stale (no heartbeat
 *     for RECEIPT_LOCK_STALE_MS).
 */
export async function claimReceiptLock(
  receiptId: string,
  options: { userId: string; userName: string },
): Promise<ClaimLockResult> {
  const ref = doc(db, ORDER_RECEIPTS_COLLECTION, receiptId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error(`Receipt ${receiptId} not found`)
  const data = snap.data() as OrderReceipt
  const lockedBy = data.editingBy
  const lockedSince =
    (data.editingSince as unknown as { toDate?: () => Date })?.toDate?.() ??
    (data.editingSince ? new Date(data.editingSince as unknown as string) : null)

  if (lockedBy && lockedBy !== options.userId && !isReceiptLockStale(lockedSince)) {
    return {
      granted: false,
      heldBy: lockedBy,
      heldByName: data.editingByName,
      staleAt: lockedSince
        ? new Date(lockedSince.getTime() + RECEIPT_LOCK_STALE_MS)
        : undefined,
    }
  }

  await updateDoc(ref, {
    editingBy: options.userId,
    editingByName: options.userName,
    editingSince: Timestamp.fromDate(new Date()),
  })
  return { granted: true }
}

/** Refresh the heartbeat — called periodically while detail view is open. */
export async function heartbeatReceiptLock(
  receiptId: string,
  userId: string,
): Promise<void> {
  const ref = doc(db, ORDER_RECEIPTS_COLLECTION, receiptId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data = snap.data() as OrderReceipt
  if (data.editingBy !== userId) return
  await updateDoc(ref, { editingSince: Timestamp.fromDate(new Date()) })
}

/** Release the editor lock (called on apply, void, or navigate-away). */
export async function releaseReceiptLock(
  receiptId: string,
  userId: string,
): Promise<void> {
  try {
    const ref = doc(db, ORDER_RECEIPTS_COLLECTION, receiptId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    const data = snap.data() as OrderReceipt
    // Only clear when we hold it — don't trample someone else's lock.
    if (data.editingBy !== userId) return
    await updateDoc(ref, {
      editingBy: null,
      editingByName: null,
      editingSince: null,
    })
  } catch (err) {
    logger.warn('[OrderReceipts] Lock release failed', {
      receiptId,
      message: (err as Error).message,
    })
  }
}

// ============================================================
// APPLY — execute the receipt against inventory
// ============================================================

export interface ApplyOrderReceiptOptions {
  userId: string
  householdId?: string
}

export interface ApplyOrderReceiptResult {
  inventoryUpdated: number
  inventoryCreated: number
  listCreated: number
  skipped: number
  failed: number
}

function tierFieldFor(tier: PackTier | undefined): 'unitPriceCents' | 'packPriceCents' | 'casePriceCents' {
  if (tier === 'C') return 'casePriceCents'
  if (tier === 'P') return 'packPriceCents'
  return 'unitPriceCents'
}

function parseReceiptDate(raw: string | null | undefined): Date {
  if (!raw) return new Date()
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return new Date()
  return parsed
}

function buildHistoryEntry(
  purchaseDate: Date,
  storeName: string | undefined,
  priceCents: number | null,
): PurchaseHistoryEntry {
  const entry: PurchaseHistoryEntry = { date: purchaseDate }
  if (storeName) entry.store = storeName
  if (priceCents != null) entry.price = priceCents / 100
  return entry
}

/** Apply a single line's intent against inventory. Returns the
 *  outcome that gets stamped onto the line audit record. */
async function executeLine(
  line: OrderReceiptLine,
  receipt: OrderReceipt,
  applyOptions: ApplyOrderReceiptOptions,
): Promise<{
  status: 'success' | 'failed' | 'skipped'
  matchedItemName?: string
  createdItemId?: string
  errorMessage?: string
  bucket: 'inventoryUpdated' | 'inventoryCreated' | 'listCreated' | 'skipped' | 'failed'
}> {
  if (line.route === 'skip') {
    return { status: 'skipped', bucket: 'skipped' }
  }

  const purchaseDate = parseReceiptDate(receipt.receiptDate)
  const priceCents = pickPriceCents({
    rawName: line.rawName,
    normalizedName: line.normalizedName,
    quantity: line.quantity ?? null,
    unitPriceCents: line.unitPriceCents ?? null,
    totalPriceCents: line.totalPriceCents ?? null,
  })
  const purchasedQty = line.quantity != null && line.quantity > 0 ? line.quantity : 1

  try {
    if (line.route === 'inventory') {
      if (line.matchedItemId) {
        // Update existing inventory row.
        const ref = doc(db, SHOPPING_ITEMS_COLLECTION, line.matchedItemId)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          throw new Error(`Matched item ${line.matchedItemId} no longer exists`)
        }
        const item = snap.data() as ShoppingItem
        const history: PurchaseHistoryEntry[] = Array.isArray(item.purchaseHistory)
          ? [...item.purchaseHistory, buildHistoryEntry(purchaseDate, receipt.store, priceCents)]
          : [buildHistoryEntry(purchaseDate, receipt.store, priceCents)]
        const updates: Record<string, unknown> = {
          inStock: true,
          needed: false,
          quantity: (item.quantity ?? 0) + purchasedQty,
          lastPurchased: purchaseDate,
          purchaseHistory: history,
          foundInStore: true,
          updatedAt: new Date(),
        }
        if (priceCents != null) {
          updates.purchasePriceCents = priceCents
          updates[tierFieldFor(item.packTier)] = priceCents
        }
        await updateDoc(ref, updates)
        return {
          status: 'success',
          matchedItemName: item.productName ?? '',
          bucket: 'inventoryUpdated',
        }
      }

      // No match → create a fresh inventory row.
      const name = (line.normalizedName?.trim() || line.rawName.trim()) || 'Unknown item'
      const created = await addManualShoppingItem(applyOptions.userId, name, {
        quantity: purchasedQty,
        householdId: applyOptions.householdId,
      })
      const ref = doc(db, SHOPPING_ITEMS_COLLECTION, created.id)
      const updates: Record<string, unknown> = {
        inStock: true,
        needed: false,
        foundInStore: true,
        lastPurchased: purchaseDate,
        purchaseHistory: [buildHistoryEntry(purchaseDate, receipt.store, priceCents)],
        updatedAt: new Date(),
      }
      if (priceCents != null) {
        updates.purchasePriceCents = priceCents
        updates.unitPriceCents = priceCents
      }
      await updateDoc(ref, updates)
      return { status: 'success', createdItemId: created.id, bucket: 'inventoryCreated' }
    }

    // 'list' — always a new shopping-list row.
    const name = (line.normalizedName?.trim() || line.rawName.trim()) || 'Unknown item'
    const created = await addManualShoppingItem(applyOptions.userId, name, {
      quantity: purchasedQty,
      householdId: applyOptions.householdId,
    })
    return { status: 'success', createdItemId: created.id, bucket: 'listCreated' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { status: 'failed', errorMessage: message, bucket: 'failed' }
  }
}

export async function applyOrderReceipt(
  receiptId: string,
  options: ApplyOrderReceiptOptions,
): Promise<ApplyOrderReceiptResult> {
  const ref = doc(db, ORDER_RECEIPTS_COLLECTION, receiptId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error(`Receipt ${receiptId} not found`)
  const receipt = { id: snap.id, ...(snap.data() as Omit<OrderReceipt, 'id'>) } as OrderReceipt
  if (receipt.status !== 'draft') {
    throw new Error(`Receipt ${receipt.receiptNumber} is already ${receipt.status}.`)
  }

  const result: ApplyOrderReceiptResult = {
    inventoryUpdated: 0,
    inventoryCreated: 0,
    listCreated: 0,
    skipped: 0,
    failed: 0,
  }

  const updatedLines: OrderReceiptLine[] = []
  for (const line of receipt.items) {
    const outcome = await executeLine(line, receipt, options)
    const next: OrderReceiptLine = stripUndefinedFromLine({
      ...line,
      status: outcome.status,
      matchedItemName: outcome.matchedItemName ?? line.matchedItemName,
      createdItemId: outcome.createdItemId,
      errorMessage: outcome.errorMessage,
    })
    updatedLines.push(next)
    result[outcome.bucket] += 1
  }

  await updateDoc(ref, {
    status: 'applied',
    items: updatedLines.map(stripUndefinedFromLine),
    appliedAt: Timestamp.fromDate(new Date()),
    inventoryUpdated: result.inventoryUpdated,
    inventoryCreated: result.inventoryCreated,
    listCreated: result.listCreated,
    skipped: result.skipped,
    failed: result.failed,
    // Release the lock once apply lands.
    editingBy: null,
    editingByName: null,
    editingSince: null,
  })

  logger.info('[OrderReceipts] Applied', { receiptId, ...result })
  return result
}

// ============================================================
// VOID — reject without inventory writes
// ============================================================

export async function voidOrderReceipt(receiptId: string): Promise<void> {
  const ref = doc(db, ORDER_RECEIPTS_COLLECTION, receiptId)
  await updateDoc(ref, {
    status: 'void',
    editingBy: null,
    editingByName: null,
    editingSince: null,
  })
  logger.info('[OrderReceipts] Voided', { receiptId })
}
