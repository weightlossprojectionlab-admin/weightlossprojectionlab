import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { removeUndefinedValues } from '@/lib/firestore-helpers'

/**
 * GET /api/admin/recipes?status=&limit=
 * Get all recipes (for admin management, not moderation)
 */
export async function GET(request: NextRequest) {
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
    const isSuper = isSuperAdmin(adminEmail)

    if (!isSuper && adminData?.role !== 'admin' && adminData?.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const statusFilter = searchParams.get('status') || 'all' // all, draft, published, archived
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    // Build query
    let query = adminDb.collection('recipes')

    // Filter by status (no orderBy to avoid composite index requirement)
    if (statusFilter !== 'all') {
      query = query.where('status', '==', statusFilter) as any
    }

    query = query.limit(limit) as any

    const snapshot = await query.get()

    const recipes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
    }))

    return NextResponse.json({ recipes, count: recipes.length })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/recipes',
      operation: 'fetch'
    })
  }
}

/**
 * POST /api/admin/recipes
 * Create a new recipe
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
    const isSuper = isSuperAdmin(adminEmail)

    if (!isSuper && adminData?.role !== 'admin' && adminData?.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.mealType || (!body.ingredientsV2 && !body.ingredients) || !body.recipeSteps) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create recipe document
    const now = new Date()
    const recipeId = `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const recipeData = {
      id: recipeId,
      name: body.name,
      description: body.description || '',
      mealType: body.mealType,
      prepTime: body.prepTime || 30,
      servingSize: body.servingSize || 1,
      dietaryTags: body.dietaryTags || [],
      allergens: body.allergens || [],

      // Nutrition
      calories: body.calories,
      macros: body.macros,
      autoCalculatedNutrition: body.autoCalculatedNutrition || false,

      // Ingredients (both formats)
      ingredientsV2: body.ingredientsV2,
      ingredients: body.ingredients,

      // Steps
      recipeSteps: body.recipeSteps,
      cookingTips: body.cookingTips || [],
      requiresCooking: body.requiresCooking !== false,

      // Media
      ...(body.imageUrls?.length ? { imageUrls: body.imageUrls } : {}),
      ...(body.videoUrl ? { videoUrl: body.videoUrl } : {}),

      // Status
      status: body.status || 'draft',
      generatedByAI: false,
      curatedBy: adminUid,

      // Timestamps
      createdAt: now,
      updatedAt: now,
      popularity: 0
    }

    await adminDb.collection('recipes').doc(recipeId).set(removeUndefinedValues(recipeData))

    logger.info(`Recipe created: ${recipeId} by ${adminEmail}`)

    return NextResponse.json({
      success: true,
      message: 'Recipe created successfully',
      recipe: recipeData
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/recipes',
      operation: 'create'
    })
  }
}
