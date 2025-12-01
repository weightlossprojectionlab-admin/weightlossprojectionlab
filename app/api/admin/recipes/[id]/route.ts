import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * GET /api/admin/recipes/[id]
 * Get a specific recipe
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let params: { id: string } | undefined
  try {
    // Resolve params first (Next.js 15 requirement)
    params = await context.params

    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)

    const recipeDoc = await adminDb.collection('recipes').doc(params.id).get()

    if (!recipeDoc.exists) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    const recipe = {
      id: recipeDoc.id,
      ...recipeDoc.data(),
      createdAt: recipeDoc.data()?.createdAt?.toDate?.()?.toISOString() || recipeDoc.data()?.createdAt,
      updatedAt: recipeDoc.data()?.updatedAt?.toDate?.()?.toISOString() || recipeDoc.data()?.updatedAt
    }

    return NextResponse.json({ recipe })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/recipes/[id]',
      operation: 'fetch'
    })
  }
}

/**
 * PUT /api/admin/recipes/[id]
 * Update a recipe
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let params: { id: string } | undefined
  try {
    // Resolve params first (Next.js 15 requirement)
    params = await context.params
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
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail.toLowerCase())

    if (!isSuperAdmin && adminData?.role !== 'admin' && adminData?.role !== 'moderator') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const recipeRef = adminDb.collection('recipes').doc(params.id)
    const recipeDoc = await recipeRef.get()

    if (!recipeDoc.exists) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Update recipe
    const updateData = {
      ...body,
      updatedAt: new Date()
    }

    await recipeRef.update(updateData)

    logger.info(`Recipe updated: ${params.id} by ${adminEmail}`)

    return NextResponse.json({
      success: true,
      message: 'Recipe updated successfully'
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/recipes/[id]',
      operation: 'update'
    })
  }
}

/**
 * DELETE /api/admin/recipes/[id]
 * Delete a recipe
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let params: { id: string } | undefined
  try {
    // Resolve params first (Next.js 15 requirement)
    params = await context.params

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
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail.toLowerCase())

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const recipeRef = adminDb.collection('recipes').doc(params.id)
    const recipeDoc = await recipeRef.get()

    if (!recipeDoc.exists) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Delete recipe
    await recipeRef.delete()

    logger.info(`Recipe deleted: ${params.id} by ${adminEmail}`)

    return NextResponse.json({
      success: true,
      message: 'Recipe deleted successfully'
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/recipes/[id]',
      operation: 'delete'
    })
  }
}
