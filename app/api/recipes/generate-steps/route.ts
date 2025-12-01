import { NextRequest, NextResponse } from 'next/server'
import { generateRecipeSteps } from '@/lib/ai-recipe-generator'
import { MealSuggestion } from '@/lib/meal-suggestions'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipe, servingSize } = body as {
      recipe: MealSuggestion
      servingSize?: number
    }

    if (!recipe || !recipe.name || !recipe.ingredients) {
      return NextResponse.json(
        { error: 'Invalid recipe data' },
        { status: 400 }
      )
    }

    // Generate recipe steps using Gemini AI
    const result = await generateRecipeSteps({
      recipe,
      servingSize: servingSize || recipe.servingSize
    })

    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error, {
      route: '/api/recipes/generate-steps',
      operation: 'create'
    })
  }
}
