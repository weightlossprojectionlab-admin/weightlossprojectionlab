/**
 * Script to generate missing recipe steps for all MEAL_SUGGESTIONS
 * Run this once to fill in missing recipeSteps using Gemini AI
 *
 * Usage: npx ts-node scripts/generate-missing-recipe-steps.ts
 */

import { MEAL_SUGGESTIONS } from '../lib/meal-suggestions'
import { generateRecipeSteps } from '../lib/ai-recipe-generator'
import * as fs from 'fs'
import * as path from 'path'

async function generateMissingSteps() {
  console.log('🤖 Generating missing recipe steps with Gemini AI...\n')

  const recipesNeedingSteps = MEAL_SUGGESTIONS.filter(
    recipe => !recipe.recipeSteps || recipe.recipeSteps.length === 0
  )

  console.log(`Found ${recipesNeedingSteps.length} recipes without steps:\n`)
  recipesNeedingSteps.forEach(r => console.log(`  - ${r.name} (${r.id})`))
  console.log()

  const updatedRecipes = []

  for (const recipe of recipesNeedingSteps) {
    console.log(`📝 Generating steps for: ${recipe.name}...`)

    try {
      const generated = await generateRecipeSteps({ recipe })

      updatedRecipes.push({
        ...recipe,
        recipeSteps: generated.recipeSteps,
        cookingTips: generated.cookingTips && generated.cookingTips.length > 0
          ? generated.cookingTips
          : recipe.cookingTips || [],
        requiresCooking: generated.requiresCooking
      })

      console.log(`  ✅ Generated ${generated.recipeSteps.length} steps`)
      console.log(`  🔥 Requires cooking: ${generated.requiresCooking}`)
      console.log()

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error(`  ❌ Failed to generate steps for ${recipe.name}:`, error)
      updatedRecipes.push(recipe) // Keep original
    }
  }

  // Output the updated recipes as TypeScript code
  console.log('\n\n📋 Updated Recipes (copy these into lib/meal-suggestions.ts):\n')
  console.log('='.repeat(80))

  updatedRecipes.forEach(recipe => {
    console.log(`  {`)
    console.log(`    id: '${recipe.id}',`)
    console.log(`    name: '${recipe.name}',`)
    console.log(`    mealType: '${recipe.mealType}',`)
    console.log(`    calories: ${recipe.calories},`)
    console.log(`    macros: ${JSON.stringify(recipe.macros)},`)
    console.log(`    ingredients: ${JSON.stringify(recipe.ingredients)},`)
    console.log(`    prepTime: ${recipe.prepTime},`)
    console.log(`    dietaryTags: ${JSON.stringify(recipe.dietaryTags)},`)
    console.log(`    allergens: ${JSON.stringify(recipe.allergens)},`)
    console.log(`    description: '${recipe.description}',`)
    console.log(`    servingSize: ${recipe.servingSize},`)
    if (recipe.requiresCooking !== undefined) {
      console.log(`    requiresCooking: ${recipe.requiresCooking},`)
    }
    if (recipe.recipeSteps && recipe.recipeSteps.length > 0) {
      console.log(`    recipeSteps: [`)
      recipe.recipeSteps.forEach(step => {
        console.log(`      '${step.replace(/'/g, "\\'")}',`)
      })
      console.log(`    ],`)
    }
    if (recipe.cookingTips && recipe.cookingTips.length > 0) {
      console.log(`    cookingTips: [`)
      recipe.cookingTips.forEach(tip => {
        console.log(`      '${tip.replace(/'/g, "\\'")}',`)
      })
      console.log(`    ]`)
    }
    console.log(`  },`)
    console.log()
  })

  console.log('='.repeat(80))
  console.log('\n✅ Done! Copy the output above into your MEAL_SUGGESTIONS array.')
}

generateMissingSteps().catch(console.error)
