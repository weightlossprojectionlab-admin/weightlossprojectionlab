/**
 * Quick diagnostic script to check shopping data availability
 * Usage: npx tsx scripts/check-shopping-data.ts
 */

import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

async function main() {
  try {
    logger.info('Checking shopping data availability...')

    const usersSnapshot = await adminDb.collection('users').limit(10).get()
    logger.info(`Found ${usersSnapshot.size} users (sample)`)

    let totalShoppingItems = 0
    let usersWithItems = 0

    for (const userDoc of usersSnapshot.docs) {
      const shoppingListSnapshot = await adminDb
        .collection('users')
        .doc(userDoc.id)
        .collection('shopping_list')
        .get()

      if (shoppingListSnapshot.size > 0) {
        usersWithItems++
        totalShoppingItems += shoppingListSnapshot.size

        logger.info(`User ${userDoc.id}: ${shoppingListSnapshot.size} shopping items`)

        // Show sample item
        const sampleItem = shoppingListSnapshot.docs[0].data()
        logger.info(`  Sample: ${sampleItem.productName || 'Unknown'} (${sampleItem.barcode || 'no barcode'})`)
      }
    }

    logger.info('\n=== Summary ===')
    logger.info(`Users with shopping items: ${usersWithItems}/${usersSnapshot.size}`)
    logger.info(`Total shopping items (sample): ${totalShoppingItems}`)

    if (totalShoppingItems === 0) {
      logger.warn('⚠️  No shopping data found. Analysis cannot run without data.')
    } else {
      logger.info('✅ Shopping data exists. Analysis can proceed.')
    }
  } catch (error) {
    logger.error('Error checking shopping data', error as Error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().then(() => {
    logger.info('Diagnostic complete')
    process.exit(0)
  }).catch(err => {
    logger.error('Fatal error', err as Error)
    process.exit(1)
  })
}

export { main as checkShoppingData }
