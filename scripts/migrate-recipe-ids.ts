/**
 * Migration Script: recipeId → recipeIds Array
 *
 * Migrates ShoppingItem documents from single recipeId to recipeIds array format.
 * This enables multi-recipe linking where one ingredient can be associated with
 * multiple recipes.
 *
 * Before: { recipeId: "recipe-123" }
 * After: { recipeIds: ["recipe-123"], primaryRecipeId: "recipe-123" }
 *
 * Run with: ts-node scripts/migrate-recipe-ids.ts
 * Or: npx tsx scripts/migrate-recipe-ids.ts
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

// Initialize Firebase Admin SDK
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json')

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: serviceAccountKey.json not found!')
  console.error(`   Expected location: ${serviceAccountPath}`)
  console.error('   Please download your Firebase service account key and place it in the project root.')
  process.exit(1)
}

const serviceAccount = require(serviceAccountPath)

initializeApp({
  credential: cert(serviceAccount)
})

const db = getFirestore()

interface MigrationStats {
  totalItems: number
  itemsWithRecipeId: number
  itemsMigrated: number
  itemsAlreadyMigrated: number
  errors: number
  errorDetails: Array<{ itemId: string; error: string }>
}

async function migrateRecipeIds() {
  console.log('🚀 Starting migration: recipeId → recipeIds array')
  console.log('─'.repeat(60))

  const stats: MigrationStats = {
    totalItems: 0,
    itemsWithRecipeId: 0,
    itemsMigrated: 0,
    itemsAlreadyMigrated: 0,
    errors: 0,
    errorDetails: []
  }

  try {
    // Query all shopping items
    const shoppingItemsRef = db.collection('shopping_items')
    const snapshot = await shoppingItemsRef.get()

    stats.totalItems = snapshot.size
    console.log(`📊 Found ${stats.totalItems} total shopping items`)

    // Process each item
    for (const doc of snapshot.docs) {
      const data = doc.data()
      const itemId = doc.id

      try {
        // Check if item has old recipeId field
        if (data.recipeId !== undefined && data.recipeId !== null) {
          stats.itemsWithRecipeId++

          // Check if already migrated (has recipeIds array)
          if (Array.isArray(data.recipeIds)) {
            stats.itemsAlreadyMigrated++
            console.log(`⏭️  Skipping ${itemId} (already migrated)`)
            continue
          }

          // Migrate the item
          const updateData: any = {
            recipeIds: [data.recipeId], // Convert string to array
            primaryRecipeId: data.recipeId, // Set as primary recipe
            recipeId: FieldValue.delete(), // Remove old field
            updatedAt: FieldValue.serverTimestamp()
          }

          await doc.ref.update(updateData)
          stats.itemsMigrated++
          console.log(`✅ Migrated ${itemId}: ${data.recipeId} → [${data.recipeId}]`)
        } else if (data.recipeId === null) {
          // Item had recipeId explicitly set to null
          // Set empty recipeIds array
          await doc.ref.update({
            recipeIds: [],
            primaryRecipeId: null,
            recipeId: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp()
          })
          stats.itemsMigrated++
          console.log(`✅ Migrated ${itemId}: null → []`)
        }
      } catch (error: any) {
        stats.errors++
        stats.errorDetails.push({
          itemId,
          error: error.message
        })
        console.error(`❌ Error migrating ${itemId}:`, error.message)
      }
    }

    // Print summary
    console.log('\n' + '─'.repeat(60))
    console.log('📈 Migration Summary')
    console.log('─'.repeat(60))
    console.log(`Total items:              ${stats.totalItems}`)
    console.log(`Items with recipeId:      ${stats.itemsWithRecipeId}`)
    console.log(`Items migrated:           ${stats.itemsMigrated}`)
    console.log(`Items already migrated:   ${stats.itemsAlreadyMigrated}`)
    console.log(`Errors:                   ${stats.errors}`)

    if (stats.errorDetails.length > 0) {
      console.log('\n❌ Error Details:')
      stats.errorDetails.forEach(({ itemId, error }) => {
        console.log(`   ${itemId}: ${error}`)
      })
    }

    if (stats.errors === 0) {
      console.log('\n✅ Migration completed successfully!')
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review error details above.')
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Run migration
migrateRecipeIds()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
