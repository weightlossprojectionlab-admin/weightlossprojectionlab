/**
 * One-time migration script to populate global product_database
 * from existing user shopping_items with barcodes
 *
 * Usage:
 * npx tsx scripts/migrate-products-to-global-db.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { adminDb } from '../lib/firebase-admin'
import { ProductCategory, ShoppingItem } from '../types/shopping'
import admin from 'firebase-admin'

interface ProductAggregation {
  barcode: string
  productName: string
  brand: string
  imageUrl?: string
  category: ProductCategory

  // Aggregated data
  userIds: Set<string>
  totalScans: number
  stores: Set<string>
  regions: Set<string>
  prices: number[]
  firstSeen: Date
  lastSeen: Date

}

async function migrateProductsToGlobalDatabase() {
  console.log('🚀 Starting migration of shopping items to global product database...\n')

  try {
    // Step 1: Fetch ALL shopping items with barcodes
    console.log('📦 Fetching all shopping items with barcodes...')
    const shoppingItemsSnapshot = await adminDb
      .collection('shopping_items')
      .where('barcode', '!=', null)
      .get()

    console.log(`✅ Found ${shoppingItemsSnapshot.size} shopping items with barcodes\n`)

    if (shoppingItemsSnapshot.empty) {
      console.log('⚠️  No shopping items with barcodes found. Nothing to migrate.')
      return
    }

    // Step 2: Aggregate by barcode
    console.log('🔄 Aggregating products by barcode...')
    const productMap = new Map<string, ProductAggregation>()

    shoppingItemsSnapshot.docs.forEach((doc) => {
      const item = doc.data() as any // Use any to handle Firestore Timestamp objects
      const barcode = item.barcode

      if (!barcode) return // Skip if no barcode

      // Convert Firestore Timestamps to Date objects
      const createdAt = item.createdAt?._seconds
        ? new Date(item.createdAt._seconds * 1000)
        : (item.createdAt instanceof Date ? item.createdAt : new Date())
      const updatedAt = item.updatedAt?._seconds
        ? new Date(item.updatedAt._seconds * 1000)
        : (item.updatedAt instanceof Date ? item.updatedAt : new Date())

      if (!productMap.has(barcode)) {
        // Initialize new product aggregation
        productMap.set(barcode, {
          barcode,
          productName: item.productName || 'Unknown Product',
          brand: item.brand || 'Unknown Brand',
          imageUrl: item.imageUrl,
          category: item.category || 'other',
          userIds: new Set([item.userId]),
          totalScans: 1,
          stores: new Set(),
          regions: new Set(),
          prices: [],
          firstSeen: createdAt,
          lastSeen: updatedAt
        })
      } else {
        // Update existing aggregation
        const agg = productMap.get(barcode)!
        agg.userIds.add(item.userId)
        agg.totalScans++

        // Update dates
        const itemCreated = createdAt
        const itemUpdated = updatedAt

        if (itemCreated < agg.firstSeen) agg.firstSeen = itemCreated
        if (itemUpdated > agg.lastSeen) agg.lastSeen = itemUpdated

        // Aggregate store and price data
        if (item.purchaseHistory && item.purchaseHistory.length > 0) {
          item.purchaseHistory.forEach((purchase: any) => {
            if (purchase.store) agg.stores.add(purchase.store)
            if (purchase.price) agg.prices.push(purchase.price)
          })
        }
      }
    })

    console.log(`✅ Aggregated ${productMap.size} unique products\n`)

    // Step 3: Write to product_database
    console.log('💾 Writing to product_database collection...')
    const batch = adminDb.batch()
    let batchCount = 0
    let totalWritten = 0

    for (const [barcode, agg] of productMap.entries()) {
      const productRef = adminDb.collection('product_database').doc(barcode)

      const productData = {
        barcode,
        productName: agg.productName,
        brand: agg.brand,
        imageUrl: agg.imageUrl || '',
        category: agg.category,
        nutrition: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          servingSize: ''
        },
        stats: {
          totalScans: agg.totalScans,
          uniqueUsers: agg.userIds.size,
          totalPurchases: 0, // We don't have purchase data in shopping_items
          firstSeenAt: admin.firestore.Timestamp.fromDate(agg.firstSeen),
          lastSeenAt: admin.firestore.Timestamp.fromDate(agg.lastSeen)
        },
        regional: {
          stores: Array.from(agg.stores),
          regions: Array.from(agg.regions),
          avgPriceCents: agg.prices.length > 0
            ? Math.round(agg.prices.reduce((a, b) => a + b, 0) / agg.prices.length)
            : 0,
          priceMin: agg.prices.length > 0 ? Math.min(...agg.prices) : 0,
          priceMax: agg.prices.length > 0 ? Math.max(...agg.prices) : 0,
          lastPriceUpdate: admin.firestore.Timestamp.now()
        },
        usage: {
          linkedRecipes: 0, // Can be calculated later
          popularityScore: agg.totalScans * 10 + agg.userIds.size * 50
        },
        quality: {
          verified: false,
          verificationCount: 0,
          dataSource: 'aggregate' as const,
          confidence: Math.min(100, 50 + (agg.userIds.size * 10)), // More users = higher confidence
          lastVerified: null
        },
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      }

      batch.set(productRef, productData, { merge: true })
      batchCount++
      totalWritten++

      // Firestore batch limit is 500 operations
      if (batchCount === 500) {
        await batch.commit()
        console.log(`  ✓ Written ${totalWritten} products...`)
        batchCount = 0
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit()
    }

    console.log(`✅ Successfully wrote ${totalWritten} products to product_database\n`)

    // Step 4: Summary statistics
    console.log('📊 Migration Summary:')
    console.log(`   • Total shopping items scanned: ${shoppingItemsSnapshot.size}`)
    console.log(`   • Unique products created: ${productMap.size}`)
    console.log(`   • Average scans per product: ${(shoppingItemsSnapshot.size / productMap.size).toFixed(1)}`)

    // Find top products
    const sortedProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalScans - a.totalScans)
      .slice(0, 5)

    console.log('\n🏆 Top 5 Most Scanned Products:')
    sortedProducts.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.productName} (${p.brand}) - ${p.totalScans} scans by ${p.userIds.size} users`)
    })

    console.log('\n✨ Migration complete!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run migration
migrateProductsToGlobalDatabase()
  .then(() => {
    console.log('\n🎉 Done! You can now view products in the admin barcodes page.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
