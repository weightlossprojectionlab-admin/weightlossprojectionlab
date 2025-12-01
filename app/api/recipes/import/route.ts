import { NextRequest, NextResponse } from 'next/server'
import { importRecipeFromUrl, calculateRecipeNutrition } from '@/lib/recipe-import'
import { verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

export const maxDuration = 60 // Recipe imports can take time

/**
 * POST /api/recipes/import
 * Import a recipe from a URL
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]
    await verifyIdToken(idToken)

    // Get URL from request
    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid URL' },
        { status: 400 }
      )
    }

    // Import recipe from URL
    const recipe = await importRecipeFromUrl(url)

    // Calculate nutrition if missing
    if (!recipe.calories || !recipe.protein || !recipe.carbs || !recipe.fat) {
      const nutrition = await calculateRecipeNutrition(recipe)
      recipe.calories = nutrition.calories
      recipe.protein = nutrition.protein
      recipe.carbs = nutrition.carbs
      recipe.fat = nutrition.fat
      recipe.fiber = nutrition.fiber
    }

    return NextResponse.json(recipe)
  } catch (error) {
    return errorResponse(error, {
      route: '/api/recipes/import',
      operation: 'create'
    })
  }
}
