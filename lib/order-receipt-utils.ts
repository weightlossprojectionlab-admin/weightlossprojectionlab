/**
 * Pure helpers for OrderReceipt — no I/O, no state. Kept in their own
 * module so the lib/order-receipts.ts (which DOES talk to Firestore)
 * stays focused on the read/write paths.
 *
 *   - generateReceiptNumber: human-friendly identifier shown in UI
 *   - computeReceiptFingerprint: stable hash for duplicate detection
 */

import type { ReceiptOCRResponse } from '@/lib/validations/receipt-ocr'

/**
 * Receipt-number alphabet: 32-char Crockford-ish set excluding visually
 * ambiguous characters (no I/L/O/U, no 0/1) so the user can read or
 * dictate a receipt number without confusion.
 */
const RECEIPT_NUMBER_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'

/** Generate `RC-XXXXXX` — 6-character random suffix from the safe alphabet. */
export function generateReceiptNumber(): string {
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * RECEIPT_NUMBER_ALPHABET.length)
    suffix += RECEIPT_NUMBER_ALPHABET[idx]
  }
  return `RC-${suffix}`
}

/** Lowercase + strip non-alphanumerics — used by the fingerprint to
 *  smooth over OCR noise (extra spaces, casing, punctuation). */
function normalizeForFingerprint(s: string | null | undefined): string {
  if (!s) return ''
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Compute a stable fingerprint for duplicate detection.
 *
 * Signal mix: store + totalCents + line count + first 3 normalized
 * line names sorted alphabetically. Sorting protects against OCR
 * line-order shuffling between captures of the same receipt.
 *
 * Same household scanning the same physical receipt twice → same
 * fingerprint → save flow flags it.
 *
 * Not a cryptographic hash — collisions don't matter (a false-positive
 * just means the user sees the dupe-check warning and dismisses it).
 */
export function computeReceiptFingerprint(ocr: ReceiptOCRResponse): string {
  const store = normalizeForFingerprint(ocr.store)
  const total = ocr.totalCents ?? -1
  const count = ocr.items.length
  const firstThree = ocr.items
    .slice(0, 3)
    .map((it) => normalizeForFingerprint(it.normalizedName || it.rawName))
    .sort()
    .join('|')
  return `${store}::${total}::${count}::${firstThree}`
}

/**
 * Has the lock gone stale? 5 min of no heartbeat = takeover allowed.
 * Pure helper so the UI can format "Editing by X · 2m ago" consistently
 * with the takeover gate.
 */
export const RECEIPT_LOCK_STALE_MS = 5 * 60 * 1000

export function isReceiptLockStale(editingSince: Date | null | undefined): boolean {
  if (!editingSince) return true
  const since = editingSince instanceof Date ? editingSince : new Date(editingSince)
  if (Number.isNaN(since.getTime())) return true
  return Date.now() - since.getTime() > RECEIPT_LOCK_STALE_MS
}

/** Generate a stable per-line id used as the React key + the
 *  identifier the detail view uses when persisting line edits.
 *  Crypto-grade uniqueness isn't required (the receipt has at most
 *  ~80 lines), but collision chance must be ~zero. */
export function generateLineId(): string {
  return `ln_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}
