/**
 * AI Recipe Generator
 *
 * Generates missing recipe instructions using Gemini AI
 * Ensures cook/prepare detection works by including appropriate keywords
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { MealSuggestion } from './meal-suggestions'

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')

export interface GenerateRecipeStepsOptions {
  recipe: MealSuggestion
  servingSize?: number
}

export interface GenerateRecipeStepsResult {
  recipeSteps: string[]
  cookingTips?: string[]
  requiresCooking: boolean
}

/**
 * Generate recipe instructions using Gemini AI
 */
export async function generateRecipeSteps(
  options: GenerateRecipeStepsOptions
): Promise<GenerateRecipeStepsResult> {
  const { recipe, servingSize = recipe.servingSize } = options

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    }
  })

  const prompt = `You are a professional chef assistant. Generate clear, step-by-step cooking instructions for this recipe.

Recipe Details:
- Name: ${recipe.name}
- Description: ${recipe.description}
- Meal Type: ${recipe.mealType}
- Servings: ${servingSize}
- Prep Time: ${recipe.prepTime} minutes
- Ingredients: ${recipe.ingredients.join(', ')}
- Dietary Tags: ${recipe.dietaryTags.join(', ')}

IMPORTANT INSTRUCTIONS:
1. If this recipe requires COOKING (heat, stove, oven, grill, etc.), include specific cooking verbs like: cook, bake, fry, boil, grill, simmer, roast, sauté, toast, poach, heat, broil, sear, steam
2. If this is just PREPARATION (mixing, assembling, no cooking), use verbs like: mix, blend, combine, assemble, layer, top, arrange, stir
3. Keep instructions clear, concise, and easy to follow
4. Number each step
5. Include timing when relevant
6. Return ONLY the JSON, no markdown formatting

Return a JSON object with this exact structure:
{
  "recipeSteps": ["step 1", "step 2", ...],
  "cookingTips": ["tip 1", "tip 2", ...] (optional, 2-3 helpful tips),
  "requiresCooking": true/false (true if recipe needs heat/cooking equipment)
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

    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    const generated = JSON.parse(cleanText) as GenerateRecipeStepsResult

    // Validate the response
    if (!generated.recipeSteps || !Array.isArray(generated.recipeSteps)) {
      throw new Error('Invalid response: missing recipeSteps array')
    }

    if (typeof generated.requiresCooking !== 'boolean') {
      throw new Error('Invalid response: missing requiresCooking boolean')
    }

    return {
      recipeSteps: generated.recipeSteps,
      cookingTips: generated.cookingTips || [],
      requiresCooking: generated.requiresCooking
    }
  } catch (error) {
    console.error('Error generating recipe steps:', error)

    // Fallback: Return basic steps
    return {
      recipeSteps: [
        'Gather all ingredients',
        `Prepare ${recipe.name} according to your preference`,
        'Serve and enjoy'
      ],
      cookingTips: [],
      requiresCooking: false // Default to false to be safe
    }
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
