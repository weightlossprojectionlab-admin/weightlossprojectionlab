'use client'

/**
 * Product image upload — enriches the shared product_database catalog.
 *
 * Trigger paths (any surface that scans an item, ergonomically the
 * same: one hand to scan / hold, one hand to capture):
 *
 *   - In-store shopping: a list row has no image yet, user snaps the
 *     package front while confirming "got it."
 *   - Home inventory: scan-time camera capture for a barcode whose
 *     catalog doc has no imageUrl.
 *   - Shopping list build: same, when adding a manual entry first.
 *
 * Once the image lands, every other user who scans this UPC sees it
 * — same shared-catalog contract as RenameProductModal's name field.
 *
 * DRY notes:
 *   - Compression is delegated to lib/image-compression.ts (same
 *     helper meal-photo upload uses).
 *   - Storage path mirrors the medication-image scheme: a bucket
 *     scoped by primary key (here: barcode) so cleanup/migration
 *     scripts can find related blobs without scanning by content.
 */

import { storage, auth } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { compressImage } from './image-compression'
import { logger } from '@/lib/logger'

/**
 * Upload a captured product image, persist its URL onto
 * product_database/{barcode}, and return the public download URL.
 *
 * Behavior:
 *   - Compresses via the shared compressImage() pipeline before
 *     upload (~80KB target). Captures from a phone camera are
 *     typically 2-5MB raw — uploading them straight to Storage
 *     wastes bandwidth and bloats the catalog over time.
 *   - Storage path: products/{barcode}/{timestamp}_{sanitizedName}.
 *     Public-read so other users see the image without fetching
 *     through an authed endpoint.
 *   - Catalog write: by default (gentle write), only sets imageUrl
 *     when the doc has none — curated images aren't overwritten by
 *     drive-by scans. Pass `{ replace: true }` from explicit-intent
 *     surfaces (Inventory Image tab) to force the new URL onto the
 *     catalog regardless. If no doc exists yet, creates a sparse
 *     stub so the image isn't orphaned.
 *
 * Failures: throws on Storage upload failure (the user explicitly
 * asked for an upload to happen, surfacing the error is correct).
 * The Firestore catalog write is best-effort — swallowed and
 * logged, since the URL can be re-attached later.
 */
export async function addProductImage(
  barcode: string,
  file: File,
  options: { replace?: boolean } = {}
): Promise<string> {
  const cleaned = (barcode || '').replace(/\D/g, '').trim()
  if (!cleaned) {
    throw new Error('Invalid barcode (no digits)')
  }
  if (!auth.currentUser) {
    throw new Error('Not authenticated')
  }

  // Compress before upload — same path meal photos use.
  const { compressedFile } = await compressImage(file)

  const timestamp = Date.now()
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_') || 'image.jpg'
  const storagePath = `products/${cleaned}/${timestamp}_${sanitizedName}`

  logger.info('[Product Image] Uploading', {
    barcode: cleaned,
    storagePath,
    originalSize: file.size,
    compressedSize: compressedFile.size,
  })

  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, compressedFile)
  const downloadURL = await getDownloadURL(storageRef)

  // Catalog write goes through the server endpoint — firestore.rules blocks
  // direct client writes to product_database (server-only collection). The
  // endpoint handles the gentle-write vs. replace decision, sparse-stub
  // creation, and audit-trail logging.
  //
  // Best-effort: a 409 (catalog already has an image; replace not requested)
  // is expected on drive-by scan paths and is not surfaced as an error.
  // Other failures are logged but don't fail the upload — the URL is the
  // primary value (so the caller can render the image immediately) and
  // the catalog row can be reconciled later.
  try {
    const idToken = await auth.currentUser.getIdToken()
    const res = await fetch(`/api/products/${encodeURIComponent(cleaned)}/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        imageUrl: downloadURL,
        replace: !!options.replace,
      }),
    })
    if (res.status === 409) {
      logger.info('[Product Image] Catalog already has imageUrl, leaving alone', {
        barcode: cleaned,
      })
    } else if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      logger.warn('[Product Image] Catalog write failed (URL still returned)', {
        barcode: cleaned,
        status: res.status,
        error: data?.error,
      })
    } else {
      logger.info('[Product Image] Catalog imageUrl written', {
        barcode: cleaned,
        mode: options.replace ? 'replace' : 'first-image',
      })
    }
  } catch (err) {
    logger.warn('[Product Image] Catalog write failed (URL still returned)', {
      barcode: cleaned,
      error: (err as Error).message,
    })
  }

  return downloadURL
}
