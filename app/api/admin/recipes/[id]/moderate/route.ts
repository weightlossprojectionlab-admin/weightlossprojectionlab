import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { Timestamp } from 'firebase-admin/firestore'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const decodedToken = await verifyIdToken(idToken)
    const adminUid = decodedToken.uid

    // Check if user is admin or moderator
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const role = adminData?.role

    if (!['admin', 'moderator'].includes(role)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin or moderator access required' },
        { status: 403 }
      )
    }

    const recipeId = params.id
    const body = await request.json()
    const { action, feature, reason, notes } = body

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Get recipe document
    const recipeRef = adminDb.collection('publicRecipes').doc(recipeId)
    const recipeDoc = await recipeRef.get()

    if (!recipeDoc.exists) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    const recipeData = recipeDoc.data()

    // Update recipe status
    if (action === 'approve') {
      await recipeRef.update({
        status: 'approved',
        moderatedBy: adminUid,
        moderatedAt: Timestamp.now(),
        moderationNotes: notes || null,
        isFeatured: feature === true,
      })

      // Log admin action
      await logAdminAction({
        adminUid,
        adminEmail: decodedToken.email || 'unknown',
        action: feature ? 'recipe_feature' : 'recipe_approve',
        targetType: 'recipe',
        targetId: recipeId,
        metadata: {
          recipeName: recipeData?.title,
          createdBy: recipeData?.createdBy,
          featured: feature === true,
        },
        notes,
      })

      // TODO: Send notification to recipe creator
      // await sendNotification(recipeData.createdBy, {
      //   type: 'recipe_approved',
      //   recipeId,
      //   recipeName: recipeData.title,
      // })

      return NextResponse.json({
        success: true,
        message: feature ? 'Recipe approved and featured' : 'Recipe approved',
        data: {
          recipeId,
          status: 'approved',
          featured: feature === true,
        },
      })
    } else if (action === 'reject') {
      if (!reason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        )
      }

      await recipeRef.update({
        status: 'rejected',
        moderatedBy: adminUid,
        moderatedAt: Timestamp.now(),
        rejectionReason: reason,
        moderationNotes: notes || null,
      })

      // Log admin action
      await logAdminAction({
        adminUid,
        adminEmail: decodedToken.email || 'unknown',
        action: 'recipe_reject',
        targetType: 'recipe',
        targetId: recipeId,
        metadata: {
          recipeName: recipeData?.title,
          createdBy: recipeData?.createdBy,
          rejectionReason: reason,
        },
        reason,
        notes,
      })

      // TODO: Send notification to recipe creator
      // await sendNotification(recipeData.createdBy, {
      //   type: 'recipe_rejected',
      //   recipeId,
      //   recipeName: recipeData.title,
      //   reason,
      //   notes,
      // })

      return NextResponse.json({
        success: true,
        message: 'Recipe rejected',
        data: {
          recipeId,
          status: 'rejected',
          reason,
        },
      })
    }
  } catch (error) {
    console.error('Error moderating recipe:', error)
    return NextResponse.json(
      {
        error: 'Failed to moderate recipe',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
