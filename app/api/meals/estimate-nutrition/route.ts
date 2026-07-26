import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { estimateMealNutrition } from '@/lib/nutrition-estimator'
import { errorResponse } from '@/lib/api-response'

/**
 * POST /api/meals/estimate-nutrition
 * Estimate a meal's total calories + macros from its ingredient list (Gemini).
 * User-triggered / opt-in; auth-gated to keep quota bounded.
 *
 * Body: { ingredients: string[], mealType?: string, mealName?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await adminAuth.verifyIdToken(authHeader.substring(7))

    const body = await request.json()
    const ingredients: string[] = Array.isArray(body.ingredients)
      ? body.ingredients.filter((s: unknown) => typeof s === 'string' && s.trim())
      : []

    if (ingredients.length === 0) {
      return NextResponse.json({ error: 'Add at least one ingredient first' }, { status: 400 })
    }
    if (ingredients.length > 40) {
      return NextResponse.json({ error: 'Too many ingredients to estimate' }, { status: 400 })
    }

    const data = await estimateMealNutrition({
      ingredients,
      mealType: typeof body.mealType === 'string' ? body.mealType : undefined,
      mealName: typeof body.mealName === 'string' ? body.mealName : undefined,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/meals/estimate-nutrition',
      operation: 'estimate',
    })
  }
}
