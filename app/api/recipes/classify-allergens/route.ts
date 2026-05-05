/**
 * POST /api/recipes/classify-allergens
 *
 * Server-only Gemini-powered per-ingredient allergen classifier.
 * Used by the client-side recipe save path
 * (lib/firestore-recipes.ts: saveRecipeToFirestore) to enrich a
 * recipe with `ingredientAllergens` before persisting.
 *
 * Server-side write paths (admin POST/PUT, AI generator, import)
 * call classifyIngredientAllergens() directly without going through
 * this endpoint to skip an unnecessary HTTP hop.
 */
import { NextRequest, NextResponse } from 'next/server'
import { classifyIngredientAllergens } from '@/lib/ingredient-allergen-classifier'
import type { AllergyTag } from '@/lib/meal-suggestions'
import { rateLimit } from '@/lib/rate-limit'
import { errorResponse } from '@/lib/api-response'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimit(request, 'ai:gemini')
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const { ingredients, recipeAllergens } = body as {
      ingredients?: string[]
      recipeAllergens?: AllergyTag[]
    }

    if (!Array.isArray(ingredients)) {
      return NextResponse.json(
        { error: 'ingredients must be an array' },
        { status: 400 },
      )
    }

    if (ingredients.length > 80) {
      return NextResponse.json(
        { error: 'ingredients array exceeds 80-item cap' },
        { status: 400 },
      )
    }

    try {
      const ingredientAllergens = await classifyIngredientAllergens(
        ingredients,
        Array.isArray(recipeAllergens) ? recipeAllergens : [],
      )
      return NextResponse.json({ ingredientAllergens })
    } catch (classifierErr) {
      // Classifier failures (Gemini 503, parse error) are returned
      // as 502 so the client knows to fall back gracefully without
      // caching a stale empty result.
      return NextResponse.json(
        { error: 'Classifier temporarily unavailable' },
        { status: 502 },
      )
    }
  } catch (error) {
    return errorResponse(error, {
      route: '/api/recipes/classify-allergens',
      operation: 'classify',
    })
  }
}
