/**
 * Cached Product Lookup
 *
 * Uses our product_database as a cache layer to reduce OpenFoodFacts API calls.
 * Automatically falls back to OpenFoodFacts if product not in cache or data is stale.
 */

import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import type { OpenFoodFactsResponse } from './openfoodfacts-api'

/**
 * Lookup product by barcode using cache-first strategy
 *
 * This should be used instead of direct OpenFoodFacts API calls to:
 * - Reduce external API usage (cost savings)
 * - Improve performance (faster cache hits)
 * - Support offline scenarios (cached data available)
 */
export async function lookupBarcodeWithCache(barcode: string): Promise<OpenFoodFactsResponse> {
  try {
    // Get auth token if user is signed in
    let token: string | undefined
    const currentUser = auth.currentUser
    if (currentUser) {
      try {
        token = await currentUser.getIdToken()
      } catch {
        // Continue without token - lookup still works
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`/api/products/lookup?barcode=${barcode}`, {
      headers
    })

    if (!response.ok) {
      throw new Error(`Lookup failed: ${response.status}`)
    }

    const data = await response.json()

    // Log cache performance for monitoring
    if (data._cached) {
      logger.debug(`[Cache Hit] Barcode ${barcode} (${data._cacheFreshnessDays || 0} days old)`)
    } else {
      logger.debug(`[Cache Miss] Barcode ${barcode} - fetched from OpenFoodFacts`)
    }

    return data
  } catch (error) {
    logger.error('Error in cached barcode lookup', error as Error, { barcode })
    throw error
  }
}

/**
 * Check if cached lookup is available (requires API route)
 * Falls back to direct OpenFoodFacts if cache layer not available
 */
export function isCachedLookupAvailable(): boolean {
  // Check if we're in a browser environment with our API routes available
  return typeof window !== 'undefined' && window.location.hostname !== ''
}
