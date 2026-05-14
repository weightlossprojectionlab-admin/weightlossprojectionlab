'use client'

/**
 * Write receipt-derived prices back onto inventory rows after a trip.
 *
 * Sequencing in the in-store flow:
 *   1. ActiveShoppingMode's checkout calls markItemAsPurchased() per
 *      found-in-cart item — that already wrote inStock/needed/lastPurchased
 *      and appended a fresh purchaseHistory entry (no price set).
 *   2. Receipt capture + OCR runs.
 *   3. The user confirms matches in ReceiptReviewModal and taps Apply.
 *   4. THIS module writes purchasePriceCents on each matched item AND
 *      patches the price field on the latest purchaseHistory entry
 *      (the one markItemAsPurchased just appended), so historical
 *      reporting can see the price retroactively.
 *
 * Why patch the existing entry instead of appending a new one? Each
 * trip should be one history row. Appending a second entry for the
 * same purchase would double-count in any "purchases per month" or
 * "average price paid" rollup.
 *
 * Idempotent: if the user re-applies the same match (e.g. fixed a
 * mismatch and re-applied), the latest entry's price is overwritten
 * cleanly with the new value rather than re-appended.
 */

import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import { logger } from './logger'
import { COLLECTIONS } from '@/constants/firestore'
import type { ShoppingItem, PurchaseHistoryEntry } from '@/types/shopping'
import { normalizeStoreNameToCatalogId } from '@/constants/store-roster'

const SHOPPING_ITEMS_COLLECTION = COLLECTIONS.SHOPPING_ITEMS

export interface PriceApplication {
  itemId: string
  /** Per-unit price in cents (integer). */
  priceCents: number
}

export interface PriceApplyResult {
  applied: number
  failedItemIds: string[]
}

export async function applyReceiptPrices(
  applications: PriceApplication[],
  options: { storeName?: string; sessionId?: string } = {},
): Promise<PriceApplyResult> {
  const failedItemIds: string[] = []
  let applied = 0

  // Phase 0b — normalize the receipt's free-text store to a catalog
  // id once, up front. Every matched item gets `assignedStoreId` set
  // to this value (receipt = ground truth). When the OCR string
  // doesn't match a catalog entry (rare chain, typo, missing from
  // STORE_CATALOG), normalizedStoreId is null and items keep
  // whatever `assignedStoreId` they had (or stay unassigned).
  const normalizedStoreId = options.storeName
    ? normalizeStoreNameToCatalogId(options.storeName)
    : null

  // Phase 0b-iii — if the trip carried a sessionId AND we resolved a
  // catalog id from the receipt, correct the session's storeId +
  // storeLocation.name to ground-truth what actually happened. The
  // caregiver may have picked "Walmart" at session start but ended
  // up at Costco; receipt overwrites both fields. Best-effort:
  // failure logs but doesn't abort the price apply.
  if (options.sessionId && (normalizedStoreId || options.storeName)) {
    try {
      const sessionRef = doc(db, 'shopping_sessions', options.sessionId)
      const sessionUpdates: Record<string, unknown> = {}
      if (normalizedStoreId) sessionUpdates.storeId = normalizedStoreId
      if (options.storeName) {
        sessionUpdates.storeLocation = {
          name: options.storeName,
          latitude: 0,
          longitude: 0,
        }
      }
      if (Object.keys(sessionUpdates).length > 0) {
        await updateDoc(sessionRef, sessionUpdates)
      }
    } catch (err) {
      logger.warn('[ApplyReceiptPrices] Session store-truth update failed', {
        sessionId: options.sessionId,
        error: (err as Error).message,
      })
    }
  }

  for (const app of applications) {
    if (!app.itemId || !Number.isFinite(app.priceCents) || app.priceCents <= 0) {
      failedItemIds.push(app.itemId)
      continue
    }

    try {
      const ref = doc(db, SHOPPING_ITEMS_COLLECTION, app.itemId)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        logger.warn('[ApplyReceiptPrices] Item not found', { itemId: app.itemId })
        failedItemIds.push(app.itemId)
        continue
      }

      const item = snap.data() as ShoppingItem
      const history: PurchaseHistoryEntry[] = Array.isArray(item.purchaseHistory)
        ? [...item.purchaseHistory]
        : []

      // Patch the latest entry (the one checkout just appended). If the
      // history is empty (shouldn't happen post-checkout, but defensive),
      // append a synthetic entry so the price isn't lost. Build entries
      // without undefined values — Firestore rejects writes containing
      // undefined.
      const priceDollars = app.priceCents / 100
      if (history.length === 0) {
        const seed: PurchaseHistoryEntry = { date: new Date(), price: priceDollars }
        if (options.storeName) seed.store = options.storeName
        history.push(seed)
      } else {
        const latest = history[history.length - 1]
        const patched: PurchaseHistoryEntry = { ...latest, price: priceDollars }
        const store = latest.store ?? options.storeName
        if (store) patched.store = store
        history[history.length - 1] = patched
      }

      // Route the captured price into the tier-specific cents field
      // based on the item's packTier. `purchasePriceCents` keeps the
      // "latest paid" mirror for legacy readers.
      const tier = item.packTier ?? 'U'
      const tierField =
        tier === 'C' ? 'casePriceCents' : tier === 'P' ? 'packPriceCents' : 'unitPriceCents'

      const updates: Record<string, unknown> = {
        purchasePriceCents: app.priceCents,
        [tierField]: app.priceCents,
        purchaseHistory: history,
        updatedAt: new Date(),
      }
      // Phase 0b-ii — if the receipt normalized to a known chain
      // and the item doesn't already carry an explicit assignment
      // (preserves the owner's manual override), set assignedStoreId
      // from the receipt. Receipt is ground truth — they actually
      // bought it there.
      if (normalizedStoreId && !item.assignedStoreId) {
        updates.assignedStoreId = normalizedStoreId
      }
      await updateDoc(ref, updates)
      applied += 1
    } catch (err) {
      logger.error('[ApplyReceiptPrices] Write failed', err as Error, {
        itemId: app.itemId,
      })
      failedItemIds.push(app.itemId)
    }
  }

  logger.info('[ApplyReceiptPrices] Applied prices', {
    applied,
    failed: failedItemIds.length,
  })

  return { applied, failedItemIds }
}
