/**
 * Migration Script: Hardcoded Recipes → Firestore
 *
 * This script migrates the hardcoded MEAL_SUGGESTIONS array to Firestore:
 * 1. Reads existing recipes from MEAL_SUGGESTIONS
 * 2. Generates missing recipe steps using Gemini AI
 * 3. Validates cook/prepare detection
 * 4. Saves to Firestore with status: 'published'
 * 5. Generates migration report
 *
 * Usage: npx tsx scripts/migrate-recipes-to-firestore.ts
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { MEAL_SUGGESTIONS, MealSuggestion } from '../lib/meal-suggestions'
import { generateRecipeSteps } from '../lib/ai-recipe-generator'
import { bulkSaveRecipes } from '../lib/firestore-recipes'
import { requiresCooking, getRecipeActionLabel } from '../lib/meal-suggestions'

interface MigrationStats {
  total: number
  successful: number
  failed: number
  withAIGeneration: number
  requiresCooking: number
  errors: string[]
}

async function migrateRecipes() {
  console.log('🚀 Starting recipe migration to Firestore...\n')
  console.log(`Found ${MEAL_SUGGESTIONS.length} recipes in MEAL_SUGGESTIONS\n`)

  const stats: MigrationStats = {
    total: MEAL_SUGGESTIONS.length,
    successful: 0,
    failed: 0,
    withAIGeneration: 0,
    requiresCooking: 0,
    errors: [],
  }

  const recipesToMigrate: MealSuggestion[] = []

  // Step 1: Process each recipe
  for (const recipe of MEAL_SUGGESTIONS) {
    console.log(`📝 Processing: ${recipe.name} (${recipe.id})`)

    try {
      let processedRecipe = { ...recipe }

      // Generate steps with AI if missing
      if (!recipe.recipeSteps || recipe.recipeSteps.length === 0) {
        console.log(`  🤖 Generating AI steps...`)

        try {
          const generated = await generateRecipeSteps({ recipe })
          processedRecipe = {
            ...processedRecipe,
            recipeSteps: generated.recipeSteps,
            cookingTips: generated.cookingTips || recipe.cookingTips || [],
            requiresCooking: generated.requiresCooking,
            generatedByAI: true,
          }
          stats.withAIGeneration++
          console.log(`  ✅ Generated ${generated.recipeSteps.length} steps`)
        } catch (error) {
          console.log(`  ⚠️  AI generation failed, using as-is`)
          stats.errors.push(`${recipe.id}: AI generation failed - ${error}`)
        }

        // Rate limiting: 2 second delay between AI calls
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } else {
        console.log(`  ✓ Already has ${recipe.recipeSteps.length} steps`)
      }

      // Validate cook/prepare detection
      const needsCooking = requiresCooking(processedRecipe)
      const actionLabel = getRecipeActionLabel(processedRecipe)

      if (needsCooking) {
        stats.requiresCooking++
      }

      console.log(`  🔥 Detection: ${needsCooking ? 'COOK' : 'PREPARE'} → "${actionLabel} Now"`)

      // Add Firestore metadata
      processedRecipe = {
        ...processedRecipe,
        status: 'published', // Mark as published since these are curated recipes
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        popularity: 0,
      }

      recipesToMigrate.push(processedRecipe)
      stats.successful++
      console.log(`  ✅ Ready for migration\n`)
    } catch (error) {
      console.error(`  ❌ Failed to process recipe: ${error}\n`)
      stats.failed++
      stats.errors.push(`${recipe.id}: ${error}`)
    }
  }

  // Step 2: Bulk save to Firestore
  console.log('\n📤 Saving recipes to Firestore...\n')

  try {
    const saveResult = await bulkSaveRecipes(recipesToMigrate)
    console.log(`✅ Saved ${saveResult.success} recipes`)
    console.log(`❌ Failed ${saveResult.failed} recipes`)

    if (saveResult.errors.length > 0) {
      console.log('\nFirestore save errors:')
      saveResult.errors.forEach((err) => console.log(`  - ${err.message}`))
      stats.errors.push(...saveResult.errors.map((e) => `Firestore: ${e.message}`))
    }
  } catch (error) {
    console.error('❌ Bulk save failed:', error)
    stats.errors.push(`Bulk save: ${error}`)
  }

  // Step 3: Generate migration report
  console.log('\n' + '='.repeat(80))
  console.log('📊 MIGRATION REPORT')
  console.log('='.repeat(80))
  console.log(`Total Recipes:           ${stats.total}`)
  console.log(`Successfully Migrated:   ${stats.successful}`)
  console.log(`Failed:                  ${stats.failed}`)
  console.log(`AI-Generated Steps:      ${stats.withAIGeneration}`)
  console.log(`Requires Cooking:        ${stats.requiresCooking}`)
  console.log(`Prepare Only:            ${stats.successful - stats.requiresCooking}`)
  console.log('='.repeat(80))

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors encountered:')
    stats.errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`))
  }

  console.log('\n✅ Migration complete!')
  console.log('\nNext steps:')
  console.log('1. Check Firebase Console to verify recipes are in Firestore')
  console.log('2. Test the admin dashboard at /admin/recipes')
  console.log('3. Update app to fetch recipes from Firestore (Phase 4)')
  console.log('4. Test cook/prepare detection on real recipes (Phase 5)\n')
}

// Validate environment
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY not found in environment')
  console.error('Make sure .env.local exists with GEMINI_API_KEY set')
  process.exit(1)
}

// Run migration
migrateRecipes().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
