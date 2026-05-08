/**
 * scripts/create-test-allergen-recipe.ts
 *
 * One-shot test fixture: creates a published recipe with both
 * 'dairy' AND 'nuts' allergens so the family-meal Commit C
 * allergen pre-flight gate (bfba00c) can be exercised against
 * Steve (whose foodAllergies = ['milk', 'peanuts']).
 *
 * Run: tsx scripts/create-test-allergen-recipe.ts
 *
 * Idempotent: matches by id, won't create a second copy on
 * re-run.
 */

import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const RECIPE_ID = 'test-allergen-gate-dairy-nuts'

async function main() {
  const { adminDb } = await import('../lib/firebase-admin')
  const { Timestamp } = await import('firebase-admin/firestore')

  const ref = adminDb.collection('recipes').doc(RECIPE_ID)
  const existing = await ref.get()
  if (existing.exists) {
    console.log(`[create-test-recipe] Already exists: ${RECIPE_ID} (skipping)`)
    console.log(`[create-test-recipe] Open via /recipes/${RECIPE_ID}`)
    process.exit(0)
  }

  const now = Timestamp.now()

  const recipe = {
    id: RECIPE_ID,
    name: 'Peanut-Butter Cheesecake (Test Recipe)',
    description:
      "TEST RECIPE — exists only to exercise the allergen pre-flight gate at Cook Now. Tagged with both 'dairy' and 'nuts' so Steve's milk + peanut allergies both trigger.",
    mealType: 'dinner',
    calories: 480,
    macros: {
      protein: 9,
      carbs: 42,
      fat: 30,
      saturatedFat: 14,
      transFat: 0,
      fiber: 2,
      sugars: 28,
      addedSugars: 24,
      sodium: 320,
      cholesterol: 95,
    },
    ingredients: [
      '1 cup graham cracker crumbs',
      '1/4 cup melted butter',
      '16 oz cream cheese, softened',
      '3/4 cup creamy peanut butter',
      '3/4 cup sugar',
      '2 large eggs',
      '1/4 cup heavy cream',
      '1 tsp vanilla extract',
    ],
    recipeSteps: [
      'Preheat oven to 325°F. Mix graham cracker crumbs and melted butter; press into a 9-inch springform pan.',
      'Beat cream cheese and peanut butter until smooth. Add sugar and beat until combined.',
      'Add eggs one at a time, beating well. Stir in heavy cream and vanilla.',
      'Pour over crust. Bake 50-55 minutes until center is just set.',
      'Cool to room temperature, then refrigerate at least 4 hours before serving.',
    ],
    cookingTips: [
      'TEST FIXTURE — this is a synthetic recipe for smoke-testing the allergen gate. Do not surface to end users.',
    ],
    servingSize: 8,
    requiresCooking: true,
    prepTime: 30,
    dietaryTags: ['vegetarian'],
    allergens: ['dairy', 'nuts'],
    status: 'published',
    generatedByAI: false,
    curatedBy: 'system-test',
    popularity: 0,
    createdAt: now,
    updatedAt: now,
  }

  await ref.set(recipe)

  console.log(`[create-test-recipe] Created ${RECIPE_ID}`)
  console.log(`[create-test-recipe] Allergens: dairy, nuts`)
  console.log(`[create-test-recipe] Open via /recipes/${RECIPE_ID}`)
  console.log(`[create-test-recipe] Or from Steve's recipes tab`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[create-test-recipe] Fatal:', err)
  process.exit(1)
})
