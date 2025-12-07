import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'
import { requireAdmin } from '@/lib/admin-auth'
import {
  getCommunityInsights,
  analyzeTrendingIngredients,
  findMostViableRecipes,
  analyzeRecipeViability
} from '@/lib/cross-user-recipe-analyzer'

/**
 * GET /api/admin/recipes/community-insights
 * Get community-wide recipe and inventory insights
 *
 * Query params:
 * - type: 'overview' | 'trending' | 'viable-recipes' | 'recipe-viability'
 * - recipeId: (required for type=recipe-viability)
 * - limit: number of results (for trending and viable-recipes)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication using unified auth
    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('idToken')?.value

    const authResult = await requireAdmin(authHeader, cookieToken)

    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }

    const { uid: adminUid, email: adminEmail } = authResult

    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'overview'
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const recipeId = searchParams.get('recipeId')

    logger.info(`[community-insights] Admin ${adminEmail} requested ${type} insights`)

    switch (type) {
      case 'overview': {
        const insights = await getCommunityInsights()
        return NextResponse.json(insights)
      }

      case 'trending': {
        const trending = await analyzeTrendingIngredients({ limit })
        return NextResponse.json({ trending })
      }

      case 'viable-recipes': {
        const viable = await findMostViableRecipes({ limit })
        return NextResponse.json({ recipes: viable })
      }

      case 'recipe-viability': {
        if (!recipeId) {
          return NextResponse.json(
            { error: 'recipeId is required for recipe-viability type' },
            { status: 400 }
          )
        }
        const viability = await analyzeRecipeViability(recipeId)
        if (!viability) {
          return NextResponse.json(
            { error: 'Recipe not found' },
            { status: 404 }
          )
        }
        return NextResponse.json(viability)
      }

      default:
        return NextResponse.json(
          { error: `Unknown type: ${type}. Use 'overview', 'trending', 'viable-recipes', or 'recipe-viability'` },
          { status: 400 }
        )
    }
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/recipes/community-insights',
      operation: 'fetch'
    })
  }
}

/**
 * POST /api/admin/recipes/community-insights
 * Trigger background analysis and cache results
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication using unified auth
    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('idToken')?.value

    const authResult = await requireAdmin(authHeader, cookieToken)

    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }

    const { uid: adminUid, email: adminEmail } = authResult

    // Check if analysis is already running
    const statusDoc = await adminDb.collection('system').doc('community_insights_status').get()
    const statusData = statusDoc.data()

    if (statusData?.running) {
      return NextResponse.json(
        {
          error: 'Community insights analysis already in progress',
          startedAt: statusData.startedAt,
          startedBy: statusData.startedBy
        },
        { status: 409 }
      )
    }

    // Mark analysis as running
    await adminDb.collection('system').doc('community_insights_status').set({
      running: true,
      startedAt: new Date(),
      startedBy: adminEmail,
      progress: 'Starting community insights analysis...'
    })

    logger.info(`[community-insights] Analysis triggered by ${adminEmail}`)

    // Run analysis in background
    runCommunityInsightsAnalysis(adminEmail)
      .then(async (results) => {
        // Cache results
        await adminDb.collection('system').doc('community_insights_cache').set({
          ...results,
          cachedAt: new Date(),
          cachedBy: adminEmail
        })

        // Mark as complete
        await adminDb.collection('system').doc('community_insights_status').set({
          running: false,
          completedAt: new Date(),
          lastRunBy: adminEmail,
          status: 'completed',
          progress: 'Analysis completed successfully'
        })

        logger.info('[community-insights] Analysis completed successfully')
      })
      .catch(async (error) => {
        logger.error('[community-insights] Analysis failed', error as Error)

        // Mark as failed
        await adminDb.collection('system').doc('community_insights_status').set({
          running: false,
          failedAt: new Date(),
          lastRunBy: adminEmail,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          progress: 'Analysis failed'
        })
      })

    return NextResponse.json({
      success: true,
      message: 'Community insights analysis started',
      note: 'This is a background process. Check status for progress.'
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/recipes/community-insights',
      operation: 'create'
    })
  }
}

/**
 * Background analysis function
 */
async function runCommunityInsightsAnalysis(triggeredBy: string) {
  logger.info(`[runCommunityInsightsAnalysis] Starting analysis (triggered by ${triggeredBy})`)

  const [overview, trending, viable] = await Promise.all([
    getCommunityInsights(),
    analyzeTrendingIngredients({ limit: 50 }),
    findMostViableRecipes({ limit: 30 })
  ])

  return {
    overview,
    trending,
    viable
  }
}
