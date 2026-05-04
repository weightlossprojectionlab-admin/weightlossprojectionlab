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

import { storage, db, auth } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'
import { compressImage } from './image-compression'
import { logger } from '@/lib/logger'

const PRODUCT_DATABASE_COLLECTION = 'product_database'

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
 *   - Catalog write: only sets imageUrl when the doc currently has
 *     none (or holds an empty string). Curated images are never
 *     overwritten — same gentle-write contract as the product-name
 *     endpoint. If no doc exists yet, creates a sparse stub so the
 *     image isn't orphaned.
 *
 * Failures: throws on Storage upload failure (the user explicitly
 * asked for an upload to happen, surfacing the error is correct).
 * The Firestore catalog write is best-effort — swallowed and
 * logged, since the URL can be re-attached later.
 */
export async function addProductImage(
  barcode: string,
  file: File
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

  // Best-effort catalog write. The URL is the primary value the
  // caller wants (so it can render the image immediately); the
  // catalog row can be repaired later if this fails.
  try {
    const productRef = doc(db, PRODUCT_DATABASE_COLLECTION, cleaned)
    const snap = await getDoc(productRef)
    const now = new Date()

    if (snap.exists()) {
      const existing = snap.data() as { imageUrl?: string }
      // Don't overwrite a curated image. Empty string + missing both
      // count as "needs an image" — anything truthy is left alone.
      if (!existing.imageUrl) {
        await updateDoc(productRef, {
          imageUrl: downloadURL,
          updatedAt: now,
        })
        logger.info('[Product Image] Catalog updated with first image', { barcode: cleaned })
      } else {
        logger.info('[Product Image] Catalog already has imageUrl, leaving alone', {
          barcode: cleaned,
        })
      }
    } else {
      // Sparse stub — keeps the image from orphaning. Curated fields
      // (productName, category, nutrition) get filled in by /api/
      // products/[barcode]/name, the lookup pipeline, or admin tools.
      await setDoc(productRef, {
        barcode: cleaned,
        productName: '',
        brand: '',
        imageUrl: downloadURL,
        category: 'other',
        quality: {
          verified: false,
          verificationCount: 0,
          dataSource: 'user',
          confidence: 30,
        },
        createdAt: now,
        updatedAt: now,
      })
      logger.info('[Product Image] Created sparse catalog stub with image', {
        barcode: cleaned,
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
