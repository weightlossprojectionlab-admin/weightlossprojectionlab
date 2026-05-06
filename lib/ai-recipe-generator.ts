/**
 * AI Recipe Generator
 *
 * Generates missing recipe instructions using Gemini AI
 * Ensures cook/prepare detection works by including appropriate keywords
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { MealSuggestion } from './meal-suggestions'
import { logger } from '@/lib/logger'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')

export interface GenerateRecipeStepsOptions {
  recipe: MealSuggestion
  servingSize?: number
}

export interface GenerateRecipeStepsResult {
  recipeSteps: string[]
  cookingTips?: string[]
  requiresCooking: boolean
  suggestedMealTypes?: string[]
  suggestedIngredients?: string[]
  description?: string
  suggestedDietaryTags?: string[]
  nutrition?: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sodium?: number
  }
}

/**
 * Generate recipe instructions using Gemini AI
 */
export async function generateRecipeSteps(
  options: GenerateRecipeStepsOptions
): Promise<GenerateRecipeStepsResult> {
  const { recipe, servingSize = recipe.servingSize } = options

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000,
      responseMimeType: 'application/json',
    }
  })

  const tags = (recipe.dietaryTags || [])
  const dietaryConstraints = tags.length > 0
    ? `\nDIETARY REQUIREMENTS (MUST follow these strictly):
${tags.map((t: string) => {
  switch (t) {
    case 'vegan': return '- VEGAN: No animal products whatsoever (no meat, dairy, eggs, honey)'
    case 'vegetarian': return '- VEGETARIAN: No meat or fish. Dairy and eggs are OK'
    case 'keto': return '- KETO: Very low carb (under 20g net carbs). High fat. No sugar, grains, or starchy vegetables'
    case 'paleo': return '- PALEO: No grains, legumes, dairy, refined sugar, or processed foods'
    case 'gluten-free': return '- GLUTEN-FREE: No wheat, barley, rye, or cross-contaminated ingredients. Suggest GF substitutes'
    case 'dairy-free': return '- DAIRY-FREE: No milk, cheese, butter, cream, or whey. Suggest dairy-free alternatives'
    case 'high-protein': return '- HIGH-PROTEIN: Emphasize protein-rich ingredients. Target 30g+ protein per serving'
    case 'low-carb': return '- LOW-CARB: Keep carbs under 30g per serving. Suggest low-carb substitutes for starchy items'
    default: return `- ${t.toUpperCase()}`
  }
}).join('\n')}
If any ingredient conflicts with these dietary requirements, suggest a compliant substitute in the steps.`
    : ''

  const prompt = `Create detailed cooking steps for "${recipe.name}".

Based on these ingredients: ${(recipe.ingredients || []).join(', ')}

Recipe context:
- Description: ${recipe.description || 'N/A'}
- Meal Type: ${recipe.mealType || 'N/A'}
- Servings: ${servingSize}
- Prep Time: ${recipe.prepTime || 30} minutes
${dietaryConstraints}

Write step-by-step cooking instructions that a home cook can follow. Be specific about:
- Exact temperatures and cooking times
- How to prep each ingredient (dice, mince, slice, etc.)
- When to add each ingredient and why
- Visual cues for doneness (golden brown, sizzling, etc.)
- Include 2-3 helpful cooking tips
- Calculate estimated nutrition PER SINGLE SERVING (divide total recipe nutrition by ${servingSize} servings). Default to 1 serving if not specified
- Determine which meal types this recipe is commonly served as (can be multiple: breakfast, lunch, dinner, snack)
- Enhance the ingredients list: add measurements for the given serving size, include prep notes (e.g., "minced", "thinly sliced"), and substitute any ingredients that conflict with the dietary requirements
- Write an SEO-friendly description (2-3 sentences) that captures the essence of the recipe, includes key ingredients and cooking method, and is optimized for search engines and NLP indexing
- Detect applicable dietary tags from: vegan, vegetarian, keto, paleo, gluten-free, dairy-free, high-protein, low-carb. Only include tags that genuinely apply based on the ingredients

CRITICAL — suggestedIngredients is for GROCERY items only:
- The "suggestedIngredients" array is for items the user must buy or
  have in inventory. NEVER include ambient resources or equipment.
- AMBIENT (always available — DO NOT include in suggestedIngredients):
  cold water, hot water, warm water, tap water, ice, ice cubes, ice
  bath, salt to taste, pepper to taste, salt and pepper to taste,
  cooking spray, oil for greasing the pan, water for boiling,
  flour for dusting (when not a primary ingredient).
- EQUIPMENT (not consumed — DO NOT include in suggestedIngredients):
  aluminum foil, parchment paper, plastic wrap, ziploc bags, paper
  towels, toothpicks (for tests), kitchen string. Reference these
  freely in cooking steps but they're not grocery items.
- These resources can and SHOULD be referenced in the cooking STEPS
  (e.g., "Cover the eggs with cold water by about 1 inch"). They
  just don't belong in the ingredient list because they're not
  groceries.

CRITICAL — quantity-agnostic step text (recipes scale to different
serving sizes; instructions must work at any scale):
- When referencing INGREDIENTS in step text, use generic terms like
  "the eggs", "the chicken", "the potatoes", "the tomatoes",
  "the salmon" — NOT specific quantities like "2 eggs", "1 lb chicken",
  "3 potatoes", "the 4 tomatoes".
- Readers cross-reference the ingredient list above the instructions,
  which IS scaled to the chosen servings. Embedding "2 eggs" in step
  text creates a contradiction at servings=2 (where the list says
  "4 eggs") or servings=4 (list says "8 eggs"). The bug compounds
  across the catalog: potatoes, tomatoes, chicken breasts, fillets,
  slices, taco shells — anything quantified-and-countable.
- DO keep specific numbers for values that DON'T scale with servings:
  cooking times (10-12 minutes), oven temperatures (350°F), water
  depth (1 inch above ingredients), pan size, salt-for-boiling-water
  (1 teaspoon), and similar process measurements.
- Examples:
  GOOD: "Place the eggs in a single layer in a saucepan."
   BAD: "Place the 2 eggs in a single layer in a saucepan."
  GOOD: "Slice the chicken thinly against the grain."
   BAD: "Slice 4 oz lean beef thinly against the grain."
  GOOD: "Add the potatoes to the boiling water; cook 12-15 min."
   BAD: "Add 3 potatoes to the boiling water; cook 12-15 min."

Return a JSON object with this exact structure:
{
  "recipeSteps": ["step 1", "step 2", ...],
  "cookingTips": ["tip 1", "tip 2", ...],
  "suggestedIngredients": ["2 lbs chicken breast, diced", "1 cup brown rice", ...] (enhanced ingredients with measurements for the serving size, prep notes, and dietary substitutions),
  "description": "SEO-friendly description (2-3 sentences with key ingredients, cooking method, and appeal)",
  "nutrition": {
    "calories": number (PER SINGLE SERVING — total divided by servings),
    "protein": number (grams per serving),
    "carbs": number (grams per serving),
    "fat": number (grams per serving),
    "fiber": number (grams per serving),
    "sodium": number (milligrams per serving)
  },
  "requiresCooking": true/false (true if recipe needs heat/cooking equipment),
  "suggestedMealTypes": ["lunch", "dinner"] (array of applicable meal types from: breakfast, lunch, dinner, snack — based on what this recipe is commonly served as),
  "suggestedDietaryTags": ["high-protein", "gluten-free"] (array from: vegan, vegetarian, keto, paleo, gluten-free, dairy-free, high-protein, low-carb — only tags that genuinely apply)
}

Examples:

For a grilled salmon recipe:
{
  "recipeSteps": [
    "Preheat grill to medium-high heat (400°F)",
    "Season salmon fillet with salt and pepper",
    "Grill salmon for 4-5 minutes per side until cooked through",
    "Cook brown rice according to package directions",
    "Assemble bowl with rice, grilled salmon, edamame, and carrots",
    "Drizzle with soy-ginger dressing and serve"
  ],
  "cookingTips": [
    "Don't overcook salmon - it should be slightly pink in the center",
    "Let salmon rest for 2 minutes before placing on rice"
  ],
  "requiresCooking": true
}

For a protein shake:
{
  "recipeSteps": [
    "Add protein powder and almond milk to blender",
    "Add banana (fresh or frozen)",
    "Blend on high for 30-60 seconds until smooth",
    "Pour into glass and serve immediately"
  ],
  "cookingTips": [
    "Use frozen banana for a thicker, colder shake",
    "Add ice cubes if using fresh banana"
  ],
  "requiresCooking": false
}

Now generate the recipe instructions:`

  try {
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Remove markdown code blocks and extract JSON
    let cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Try to extract JSON object if surrounded by other text
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
    if (jsonMatch) cleanText = jsonMatch[0]

    const generated = JSON.parse(cleanText) as GenerateRecipeStepsResult

    // Validate the response
    if (!generated.recipeSteps || !Array.isArray(generated.recipeSteps)) {
      throw new Error('Invalid response: missing recipeSteps array')
    }

    // Default requiresCooking to true if not provided
    if (typeof generated.requiresCooking !== 'boolean') {
      generated.requiresCooking = true
    }

    return {
      recipeSteps: generated.recipeSteps,
      cookingTips: generated.cookingTips || [],
      requiresCooking: generated.requiresCooking,
      suggestedMealTypes: generated.suggestedMealTypes,
      suggestedIngredients: generated.suggestedIngredients,
      description: generated.description,
      suggestedDietaryTags: generated.suggestedDietaryTags,
      nutrition: generated.nutrition,
    }
  } catch (error) {
    logger.error('Error generating recipe steps', error as Error, {
      recipeName: recipe.name,
      hasApiKey: !!(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY),
      errorMessage: error instanceof Error ? error.message : String(error)
    })

    // Re-throw so the API route returns the actual error instead of hiding it
    throw error
  }
}

/**
 * Enhance a recipe with AI-generated instructions if missing
 */
export async function enhanceRecipeWithAI(
  recipe: MealSuggestion
): Promise<MealSuggestion> {
  // If recipe already has steps, return as-is
  if (recipe.recipeSteps && recipe.recipeSteps.length > 0) {
    return recipe
  }

  // Generate steps using AI
  const generated = await generateRecipeSteps({ recipe })

  return {
    ...recipe,
    recipeSteps: generated.recipeSteps,
    cookingTips: generated.cookingTips && generated.cookingTips.length > 0
      ? generated.cookingTips
      : recipe.cookingTips,
    requiresCooking: generated.requiresCooking
  }
}
