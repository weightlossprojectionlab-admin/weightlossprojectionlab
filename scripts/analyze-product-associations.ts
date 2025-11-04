/**
 * Product Association Analysis Script
 *
 * Analyzes user shopping patterns to find products frequently bought together.
 * Uses Market Basket Analysis (Apriori-style algorithm) to calculate:
 * - Support: How often products appear together
 * - Confidence: Probability of buying B given A
 * - Lift: How much more likely to buy B when buying A
 *
 * Usage: npx tsx scripts/analyze-product-associations.ts
 */

import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

interface ShoppingItem {
  barcode: string
  productName: string
  brand: string
  category: string
  userId: string
  scannedAt: Date
}

interface ShoppingSession {
  userId: string
  sessionDate: string // YYYY-MM-DD
  products: string[] // Array of barcodes
}

interface ProductPair {
  productA: string // barcode
  productB: string // barcode
  productAName?: string
  productBName?: string
  support: number // How many sessions contain both A and B
  confidence: number // P(B|A) = support(A,B) / support(A)
  lift: number // confidence / P(B)
  sessionCount: number
}

interface ProductAssociation {
  barcode: string
  productName: string
  brand?: string
  category?: string
  relatedProducts: Array<{
    barcode: string
    productName: string
    brand?: string
    category?: string
    support: number
    confidence: number
    lift: number
    sessionCount: number
  }>
  analyzedAt: Date
  totalSessions: number
}

const MIN_SUPPORT = 2 // Minimum number of sessions for a pair to be considered
const MIN_CONFIDENCE = 0.1 // Minimum 10% confidence
const MIN_LIFT = 1.1 // Minimum 10% lift over random chance
const SESSION_WINDOW_HOURS = 24 // Group scans within 24 hours as same session

/**
 * Fetch all shopping items from Firestore
 */
async function fetchShoppingItems(): Promise<ShoppingItem[]> {
  logger.info('Fetching shopping items from all users...')

  const usersSnapshot = await adminDb.collection('users').get()
  const allItems: ShoppingItem[] = []

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id
    const shoppingListSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('shopping_list')
      .get()

    for (const itemDoc of shoppingListSnapshot.docs) {
      const data = itemDoc.data()
      if (data.barcode) {
        allItems.push({
          barcode: data.barcode,
          productName: data.productName || 'Unknown',
          brand: data.brand || '',
          category: data.category || 'other',
          userId,
          scannedAt: data.addedAt?.toDate() || data.scannedAt?.toDate() || new Date()
        })
      }
    }
  }

  logger.info(`Found ${allItems.length} shopping items across ${usersSnapshot.size} users`)
  return allItems
}

/**
 * Group shopping items into sessions
 * A session is defined as all products scanned by the same user within SESSION_WINDOW_HOURS
 */
function groupIntoSessions(items: ShoppingItem[]): ShoppingSession[] {
  logger.info('Grouping items into shopping sessions...')

  // Sort by userId and timestamp
  items.sort((a, b) => {
    if (a.userId !== b.userId) return a.userId.localeCompare(b.userId)
    return a.scannedAt.getTime() - b.scannedAt.getTime()
  })

  const sessions: ShoppingSession[] = []
  let currentSession: ShoppingSession | null = null
  let lastTimestamp: Date | null = null

  for (const item of items) {
    const isNewSession =
      !currentSession ||
      currentSession.userId !== item.userId ||
      !lastTimestamp ||
      (item.scannedAt.getTime() - lastTimestamp.getTime()) > SESSION_WINDOW_HOURS * 60 * 60 * 1000

    if (isNewSession) {
      if (currentSession && currentSession.products.length > 0) {
        // Deduplicate products in session
        currentSession.products = Array.from(new Set(currentSession.products))
        sessions.push(currentSession)
      }

      currentSession = {
        userId: item.userId,
        sessionDate: item.scannedAt.toISOString().split('T')[0],
        products: [item.barcode]
      }
    } else {
      currentSession!.products.push(item.barcode)
    }

    lastTimestamp = item.scannedAt
  }

  // Add final session
  if (currentSession && currentSession.products.length > 0) {
    currentSession.products = Array.from(new Set(currentSession.products))
    sessions.push(currentSession)
  }

  logger.info(`Created ${sessions.length} shopping sessions`)
  return sessions
}

/**
 * Find all product pairs and calculate association metrics
 */
function calculateAssociations(sessions: ShoppingSession[]): Map<string, Map<string, ProductPair>> {
  logger.info('Calculating product associations...')

  // Count individual product occurrences
  const productCounts = new Map<string, number>()
  sessions.forEach(session => {
    const uniqueProducts = new Set(session.products)
    uniqueProducts.forEach(product => {
      productCounts.set(product, (productCounts.get(product) || 0) + 1)
    })
  })

  // Count product pair occurrences
  const pairCounts = new Map<string, number>()
  sessions.forEach(session => {
    const uniqueProducts = Array.from(new Set(session.products))

    // Generate all pairs in this session
    for (let i = 0; i < uniqueProducts.length; i++) {
      for (let j = i + 1; j < uniqueProducts.length; j++) {
        const productA = uniqueProducts[i]
        const productB = uniqueProducts[j]

        // Create symmetric pairs (both A->B and B->A)
        const pairKey1 = `${productA}|${productB}`
        const pairKey2 = `${productB}|${productA}`

        pairCounts.set(pairKey1, (pairCounts.get(pairKey1) || 0) + 1)
        pairCounts.set(pairKey2, (pairCounts.get(pairKey2) || 0) + 1)
      }
    }
  })

  // Calculate metrics for each pair
  const totalSessions = sessions.length
  const associations = new Map<string, Map<string, ProductPair>>()

  pairCounts.forEach((pairCount, pairKey) => {
    const [productA, productB] = pairKey.split('|')
    const supportAB = pairCount
    const supportA = productCounts.get(productA) || 0
    const supportB = productCounts.get(productB) || 0

    // Calculate metrics
    const confidence = supportAB / supportA
    const probabilityB = supportB / totalSessions
    const lift = confidence / probabilityB

    // Filter by minimum thresholds
    if (supportAB >= MIN_SUPPORT && confidence >= MIN_CONFIDENCE && lift >= MIN_LIFT) {
      if (!associations.has(productA)) {
        associations.set(productA, new Map())
      }

      associations.get(productA)!.set(productB, {
        productA,
        productB,
        support: supportAB,
        confidence,
        lift,
        sessionCount: supportAB
      })
    }
  })

  logger.info(`Found associations for ${associations.size} products`)
  return associations
}

/**
 * Enrich associations with product metadata from product_database
 */
async function enrichAssociations(
  associations: Map<string, Map<string, ProductPair>>
): Promise<ProductAssociation[]> {
  logger.info('Enriching associations with product metadata...')

  const result: ProductAssociation[] = []

  for (const [barcode, relatedMap] of associations.entries()) {
    // Fetch main product details
    const productDoc = await adminDb.collection('product_database').doc(barcode).get()
    const productData = productDoc.data()

    if (!productData) {
      logger.warn(`Product not found in database: ${barcode}`)
      continue
    }

    // Sort related products by lift score
    const relatedArray = Array.from(relatedMap.values())
    relatedArray.sort((a, b) => b.lift - a.lift)

    // Fetch metadata for related products
    const enrichedRelated = await Promise.all(
      relatedArray.slice(0, 20).map(async (pair) => { // Limit to top 20 associations
        const relatedDoc = await adminDb.collection('product_database').doc(pair.productB).get()
        const relatedData = relatedDoc.data()

        return {
          barcode: pair.productB,
          productName: relatedData?.productName || 'Unknown',
          brand: relatedData?.brand,
          category: relatedData?.category,
          support: pair.support,
          confidence: pair.confidence,
          lift: pair.lift,
          sessionCount: pair.sessionCount
        }
      })
    )

    result.push({
      barcode,
      productName: productData.productName,
      brand: productData.brand,
      category: productData.category,
      relatedProducts: enrichedRelated,
      analyzedAt: new Date(),
      totalSessions: 0 // Will be updated when we have total session count
    })
  }

  logger.info(`Enriched ${result.length} product associations`)
  return result
}

/**
 * Save associations to Firestore
 */
async function saveAssociations(associations: ProductAssociation[]): Promise<void> {
  logger.info('Saving associations to Firestore...')

  const batch = adminDb.batch()
  let batchCount = 0

  for (const association of associations) {
    const docRef = adminDb.collection('product_associations').doc(association.barcode)
    batch.set(docRef, association)
    batchCount++

    // Firestore batch limit is 500
    if (batchCount >= 500) {
      await batch.commit()
      logger.info(`Committed batch of ${batchCount} associations`)
      batchCount = 0
    }
  }

  if (batchCount > 0) {
    await batch.commit()
    logger.info(`Committed final batch of ${batchCount} associations`)
  }

  logger.info(`Saved ${associations.length} product associations to Firestore`)
}

/**
 * Main execution
 */
async function main() {
  try {
    logger.info('Starting product association analysis...')

    // Step 1: Fetch all shopping items
    const items = await fetchShoppingItems()

    if (items.length === 0) {
      logger.warn('No shopping items found. Analysis cannot proceed.')
      return
    }

    // Step 2: Group into shopping sessions
    const sessions = groupIntoSessions(items)

    if (sessions.length === 0) {
      logger.warn('No shopping sessions found. Analysis cannot proceed.')
      return
    }

    // Step 3: Calculate associations
    const associations = calculateAssociations(sessions)

    if (associations.size === 0) {
      logger.warn('No product associations found meeting minimum thresholds.')
      logger.info(`Thresholds: MIN_SUPPORT=${MIN_SUPPORT}, MIN_CONFIDENCE=${MIN_CONFIDENCE}, MIN_LIFT=${MIN_LIFT}`)
      return
    }

    // Step 4: Enrich with product metadata
    const enrichedAssociations = await enrichAssociations(associations)

    // Update total sessions count
    enrichedAssociations.forEach(assoc => {
      assoc.totalSessions = sessions.length
    })

    // Step 5: Save to Firestore
    await saveAssociations(enrichedAssociations)

    // Print summary
    logger.info('=== Analysis Complete ===')
    logger.info(`Total shopping items: ${items.length}`)
    logger.info(`Total shopping sessions: ${sessions.length}`)
    logger.info(`Products with associations: ${enrichedAssociations.length}`)
    logger.info(`Average associations per product: ${
      enrichedAssociations.reduce((sum, a) => sum + a.relatedProducts.length, 0) / enrichedAssociations.length
    }`)

    // Show top 5 strongest associations
    logger.info('\n=== Top 5 Strongest Associations (by lift) ===')
    const allPairs: Array<{ from: string, to: string, lift: number, confidence: number }> = []

    enrichedAssociations.forEach(assoc => {
      assoc.relatedProducts.forEach(related => {
        allPairs.push({
          from: assoc.productName,
          to: related.productName,
          lift: related.lift,
          confidence: related.confidence
        })
      })
    })

    allPairs.sort((a, b) => b.lift - a.lift)
    allPairs.slice(0, 5).forEach((pair, i) => {
      logger.info(`${i + 1}. ${pair.from} → ${pair.to}`)
      logger.info(`   Lift: ${pair.lift.toFixed(2)}x, Confidence: ${(pair.confidence * 100).toFixed(1)}%`)
    })

  } catch (error) {
    logger.error('Error during association analysis', error as Error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().then(() => {
    logger.info('Analysis script completed successfully')
    process.exit(0)
  }).catch(err => {
    logger.error('Fatal error in analysis script', err as Error)
    process.exit(1)
  })
}

export { main as analyzeProductAssociations }
