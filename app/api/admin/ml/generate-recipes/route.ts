import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'
import { generateRecipesFromAssociations, saveGeneratedRecipes } from '@/lib/ml-recipe-generator'
import { errorResponse } from '@/lib/api-response'

/**
 * POST /api/admin/ml/generate-recipes
 * Generate recipes from product associations
 *
 * This endpoint uses ML analysis to create recipes from products
 * that users frequently buy together.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(
      adminEmail.toLowerCase()
    )

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get request parameters
    const body = await request.json().catch(() => ({}))
    const limit = body.limit || 50

    // Check if generation is already running
    const statusDoc = await adminDb.collection('system').doc('ml_recipe_generation_status').get()
    const statusData = statusDoc.data()

    if (statusData?.running) {
      return NextResponse.json(
        {
          error: 'Recipe generation already in progress',
          startedAt: statusData.startedAt,
          startedBy: statusData.startedBy
        },
        { status: 409 }
      )
    }

    // Check if product associations exist
    const associationsSnapshot = await adminDb.collection('product_associations').limit(1).get()
    if (associationsSnapshot.empty) {
      return NextResponse.json(
        {
          error: 'No product associations found. Please run association analysis first.',
          hint: 'Go to ML Analytics and click "Run Analysis"'
        },
        { status: 400 }
      )
    }

    // Mark generation as running
    await adminDb.collection('system').doc('ml_recipe_generation_status').set({
      running: true,
      startedAt: new Date(),
      startedBy: adminEmail,
      progress: 'Starting recipe generation...',
      limit
    })

    logger.info(`ML recipe generation triggered by ${adminEmail}`)

    // Run generation (this is async and may take time)
    generateRecipesFromAssociations(limit)
      .then(async (result) => {
        // Save generated recipes
        if (result.recipes.length > 0) {
          await saveGeneratedRecipes(result.recipes)
        }

        // Mark generation as complete
        await adminDb.collection('system').doc('ml_recipe_generation_status').set({
          running: false,
          completedAt: new Date(),
          lastRunBy: adminEmail,
          status: 'completed',
          progress: 'Recipe generation completed successfully',
          recipesGenerated: result.generated,
          recipesSkipped: result.skipped
        })

        // Update metadata
        await adminDb.collection('system').doc('ml_metadata').set(
          {
            lastRecipeGeneration: new Date(),
            lastRecipeGenerationBy: adminEmail,
            totalMLRecipesGenerated: FieldValue.increment(result.generated)
          },
          { merge: true }
        )

        logger.info(`ML recipe generation completed: ${result.generated} recipes generated, ${result.skipped} skipped`)
      })
      .catch(async (error) => {
        logger.error('ML recipe generation failed', error as Error)

        // Mark generation as failed
        await adminDb.collection('system').doc('ml_recipe_generation_status').set({
          running: false,
          failedAt: new Date(),
          lastRunBy: adminEmail,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          progress: 'Recipe generation failed'
        })
      })

    return NextResponse.json({
      success: true,
      message: 'Recipe generation started',
      note: 'This is a background process. Check generation status for progress.',
      limit
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/ml/generate-recipes',
      operation: 'create'
    })
  }
}

/**
 * GET /api/admin/ml/generate-recipes
 * Get the status of the current/last recipe generation run
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await adminAuth.verifyIdToken(idToken)

    // Get generation status
    const statusDoc = await adminDb.collection('system').doc('ml_recipe_generation_status').get()
    const metadataDoc = await adminDb.collection('system').doc('ml_metadata').get()

    const status = statusDoc.exists ? statusDoc.data() : { running: false }
    const metadata = metadataDoc.exists ? metadataDoc.data() : {}

    // Get count of ML-generated recipes
    const mlRecipesSnapshot = await adminDb
      .collection('recipes')
      .where('mlGenerated', '==', true)
      .count()
      .get()
    const mlRecipeCount = mlRecipesSnapshot.data().count

    return NextResponse.json({
      status,
      metadata: {
        ...metadata,
        lastRecipeGeneration: metadata?.lastRecipeGeneration?.toDate?.()?.toISOString() || null,
        totalMLRecipes: mlRecipeCount
      }
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/ml/generate-recipes',
      operation: 'fetch'
    })
  }
}
