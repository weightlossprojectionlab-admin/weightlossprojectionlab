import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'
import { analyzeTrendingIngredients, analyzeRecipeViability } from '@/lib/cross-user-recipe-analyzer'

/**
 * GET /api/recipes/recommendations
 * Get personalized recipe recommendations based on community data
 *
 * Query params:
 * - userId: User ID (optional, for personalized recommendations)
 * - type: 'trending' | 'popular' | 'personalized'
 * - limit: number of results
 *
 * This endpoint uses aggregated cross-user data to provide
 * privacy-safe recipe recommendations without exposing individual
 * user shopping habits.
 */
export async function GET(request: NextRequest) {
  try {
    // Note: Rate limiting can be added via middleware if needed

    // Verify authentication (optional for this endpoint)
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    let userId: string | null = null
    if (idToken) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken)
        userId = decodedToken.uid
      } catch (error) {
        // Ignore auth errors - this endpoint can work without auth
        logger.debug('Failed to verify token for recommendations, continuing without auth')
      }
    }

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'trending'
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50) // Max 50

    logger.info(`[recommendations] Request: type=${type}, limit=${limit}, authenticated=${!!userId}`)

    switch (type) {
      case 'trending': {
        // Get recipes using trending ingredients from community
        const trending = await analyzeTrendingIngredients({ minHouseholds: 2, limit: 20 })
        const trendingBarcodes = new Set(trending.map(t => t.barcode))

        // Find published recipes that use these trending ingredients
        const recipesSnapshot = await adminDb
          .collection('recipes')
          .where('status', '==', 'published')
          .limit(100)
          .get()

        interface RecipeWithScore {
          recipe: any
          trendingScore: number
          trendingIngredients: string[]
        }

        const recipesWithScores: RecipeWithScore[] = []

        for (const doc of recipesSnapshot.docs) {
          const recipeData = doc.data()
          const recipe = { id: doc.id, ...recipeData }
          const ingredients = recipeData.ingredientsV2 || recipeData.ingredients || []

          // Count how many trending ingredients this recipe uses
          const trendingIngredientsInRecipe = ingredients.filter((ing: any) =>
            ing.productBarcode && trendingBarcodes.has(ing.productBarcode)
          )

          if (trendingIngredientsInRecipe.length > 0) {
            recipesWithScores.push({
              recipe,
              trendingScore: trendingIngredientsInRecipe.length,
              trendingIngredients: trendingIngredientsInRecipe.map((ing: any) => ing.productName)
            })
          }
        }

        // Sort by trending score
        recipesWithScores.sort((a, b) => b.trendingScore - a.trendingScore)

        const results = recipesWithScores.slice(0, limit).map(r => ({
          ...r.recipe,
          recommendationReason: `Uses ${r.trendingScore} trending ingredient${r.trendingScore > 1 ? 's' : ''} popular in our community`,
          trendingIngredients: r.trendingIngredients,
          communityScore: r.trendingScore
        }))

        return NextResponse.json({
          recommendations: results,
          type: 'trending',
          count: results.length,
          basedOn: 'community-wide ingredient trends'
        })
      }

      case 'popular': {
        // Get recipes that most households can make
        const recipesSnapshot = await adminDb
          .collection('recipes')
          .where('status', '==', 'published')
          .orderBy('popularity', 'desc')
          .limit(50)
          .get()

        // Analyze viability for top recipes
        const viabilityPromises = recipesSnapshot.docs
          .slice(0, 30)
          .map(doc => analyzeRecipeViability(doc.id))

        const viabilityResults = await Promise.all(viabilityPromises)

        // Filter and sort by how many households can make it
        const viable = viabilityResults
          .filter((v): v is NonNullable<typeof v> => v !== null && v.percentageCanMake > 0)
          .sort((a, b) => b.householdCanMake - a.householdCanMake)
          .slice(0, limit)

        // Fetch full recipe data
        const results = await Promise.all(
          viable.map(async (v) => {
            const recipeDoc = await adminDb.collection('recipes').doc(v.recipeId).get()
            const recipe = { id: recipeDoc.id, ...recipeDoc.data() }

            return {
              ...recipe,
              recommendationReason: `${Math.round(v.percentageCanMake)}% of households can make this recipe`,
              availabilityScore: v.availabilityScore,
              householdsCanMake: v.householdCanMake,
              communityScore: v.percentageCanMake
            }
          })
        )

        return NextResponse.json({
          recommendations: results,
          type: 'popular',
          count: results.length,
          basedOn: 'community inventory availability'
        })
      }

      case 'personalized': {
        if (!userId) {
          return NextResponse.json(
            { error: 'Authentication required for personalized recommendations' },
            { status: 401 }
          )
        }

        // Get user's inventory
        const userInventorySnapshot = await adminDb
          .collection('shopping_items')
          .where('userId', '==', userId)
          .where('inStock', '==', true)
          .get()

        const userBarcodes = new Set(
          userInventorySnapshot.docs
            .map(doc => doc.data().barcode)
            .filter(Boolean)
        )

        if (userBarcodes.size === 0) {
          return NextResponse.json({
            recommendations: [],
            type: 'personalized',
            count: 0,
            message: 'No inventory found. Add items to get personalized recommendations.'
          })
        }

        // Get trending ingredients
        const trending = await analyzeTrendingIngredients({ minHouseholds: 2, limit: 30 })
        const trendingBarcodes = new Set(trending.map(t => t.barcode))

        // Find recipes user can make or partially make
        const recipesSnapshot = await adminDb
          .collection('recipes')
          .where('status', '==', 'published')
          .limit(100)
          .get()

        interface PersonalizedRecipe {
          recipe: any
          matchScore: number
          missingIngredients: number
          hasTrendingIngredients: boolean
          canMake: boolean
        }

        const scoredRecipes: PersonalizedRecipe[] = []

        for (const doc of recipesSnapshot.docs) {
          const recipeData = doc.data()
          const recipe = { id: doc.id, ...recipeData }
          const ingredients = recipeData.ingredientsV2 || recipeData.ingredients || []

          let matchingIngredients = 0
          let missingIngredients = 0
          let hasTrendingIngredients = false

          ingredients.forEach((ing: any) => {
            if (ing.productBarcode) {
              if (userBarcodes.has(ing.productBarcode)) {
                matchingIngredients++
              } else {
                missingIngredients++
              }

              if (trendingBarcodes.has(ing.productBarcode)) {
                hasTrendingIngredients = true
              }
            }
          })

          const totalIngredients = ingredients.length
          const matchPercentage = totalIngredients > 0
            ? (matchingIngredients / totalIngredients) * 100
            : 0

          // Score: prioritize recipes user can make or nearly make
          let score = matchPercentage
          if (hasTrendingIngredients) score += 10 // Bonus for trending
          if (missingIngredients === 0) score += 20 // Bonus for complete match

          if (matchingIngredients > 0) {
            scoredRecipes.push({
              recipe,
              matchScore: score,
              missingIngredients,
              hasTrendingIngredients,
              canMake: missingIngredients === 0
            })
          }
        }

        // Sort by score
        scoredRecipes.sort((a, b) => b.matchScore - a.matchScore)

        const results = scoredRecipes.slice(0, limit).map(r => ({
          ...r.recipe,
          recommendationReason: r.canMake
            ? 'You have all ingredients to make this!'
            : `You have most ingredients (${r.missingIngredients} missing)`,
          matchPercentage: Math.round((r.recipe.ingredientsV2?.length - r.missingIngredients) / r.recipe.ingredientsV2?.length * 100),
          missingIngredients: r.missingIngredients,
          canMake: r.canMake,
          hasTrendingIngredients: r.hasTrendingIngredients,
          communityScore: r.matchScore
        }))

        return NextResponse.json({
          recommendations: results,
          type: 'personalized',
          count: results.length,
          basedOn: 'your inventory + community trends'
        })
      }

      default:
        return NextResponse.json(
          { error: `Unknown type: ${type}. Use 'trending', 'popular', or 'personalized'` },
          { status: 400 }
        )
    }
  } catch (error) {
    return errorResponse(error, {
      route: '/api/recipes/recommendations',
      operation: 'fetch'
    })
  }
}
