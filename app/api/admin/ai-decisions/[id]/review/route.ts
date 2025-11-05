/**
 * API Route: Review AI Decision (Admin Only)
 *
 * Allows admins to approve, reject, or modify AI decisions including
 * health profiles and meal safety assessments.
 *
 * POST /api/admin/ai-decisions/[id]/review
 * Auth: Required (Admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, db } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import type { AIHealthProfile } from '@/types'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params

    // 1. Verify authentication and admin status
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]

    let adminUid: string
    try {
      const decodedToken = await adminAuth.verifyIdToken(token)
      adminUid = decodedToken.uid

      // Check if user is admin
      const adminDoc = await db.collection('users').doc(adminUid).get()
      const isAdmin = adminDoc.data()?.profile?.isAdmin === true

      if (!isAdmin) {
        logger.warn('[AI Decision Review] Non-admin attempted access', { uid: adminUid })
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        )
      }

      logger.debug('[AI Decision Review] Admin authenticated', { adminUid })
    } catch (authError) {
      logger.error('[AI Decision Review] Auth failed', authError as Error)
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication token' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const body = await request.json()
    const { action, notes, modifiedData } = body

    if (!action || !['approve', 'reject', 'modify'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action - must be approve, reject, or modify' },
        { status: 400 }
      )
    }

    // 3. Fetch AI decision document
    const decisionRef = db.collection('ai-decisions').doc(id)
    const decisionDoc = await decisionRef.get()

    if (!decisionDoc.exists) {
      return NextResponse.json(
        { error: 'AI decision not found' },
        { status: 404 }
      )
    }

    const decision = decisionDoc.data()

    logger.info('[AI Decision Review] Processing review', {
      decisionId: id,
      type: decision?.type,
      action,
      adminUid
    })

    // 4. Handle review action based on decision type
    if (decision?.type === 'health-profile') {
      await handleHealthProfileReview({
        decisionId: id,
        decisionRef,
        decision,
        action,
        notes,
        modifiedData,
        adminUid
      })
    } else if (decision?.type === 'meal-safety') {
      await handleMealSafetyReview({
        decisionId: id,
        decisionRef,
        decision,
        action,
        notes,
        adminUid
      })
    } else {
      // Generic review for other decision types
      await decisionRef.update({
        reviewStatus: action === 'approve' ? 'approved' : 'rejected',
        adminNotes: notes || '',
        reviewedAt: new Date(),
        reviewedBy: adminUid
      })
    }

    logger.info('[AI Decision Review] Review completed', {
      decisionId: id,
      action,
      adminUid
    })

    return NextResponse.json({
      ok: true,
      message: `Decision ${action}d successfully`
    })

  } catch (error) {
    logger.error('[AI Decision Review] Review failed', error as Error)

    return NextResponse.json(
      {
        error: 'Failed to review AI decision',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Handle health profile review
 */
async function handleHealthProfileReview(params: {
  decisionId: string
  decisionRef: FirebaseFirestore.DocumentReference
  decision: any
  action: string
  notes?: string
  modifiedData?: Partial<AIHealthProfile>
  adminUid: string
}) {
  const { decisionRef, decision, action, notes, modifiedData, adminUid } = params

  if (action === 'approve' || action === 'modify') {
    // Update user's health profile
    const userId = decision.userId
    const healthProfileRef = db
      .collection('users')
      .doc(userId)
      .collection('aiHealthProfile')
      .doc('current')

    if (action === 'modify' && modifiedData) {
      // Admin modified the AI recommendations
      await healthProfileRef.update({
        ...modifiedData,
        reviewStatus: 'modified',
        lastReviewedBy: adminUid,
        adminNotes: notes || ''
      })

      logger.info('[Health Profile Review] Modified by admin', {
        userId,
        adminUid,
        changes: Object.keys(modifiedData)
      })
    } else {
      // Approve as-is
      await healthProfileRef.update({
        reviewStatus: 'approved',
        lastReviewedBy: adminUid
      })

      logger.info('[Health Profile Review] Approved', { userId, adminUid })
    }
  }

  // Update decision document
  await decisionRef.update({
    reviewStatus: action === 'approve' ? 'approved' : action === 'modify' ? 'modified' : 'rejected',
    adminNotes: notes || '',
    reviewedAt: new Date(),
    reviewedBy: adminUid
  })
}

/**
 * Handle meal safety review
 */
async function handleMealSafetyReview(params: {
  decisionId: string
  decisionRef: FirebaseFirestore.DocumentReference
  decision: any
  action: string
  notes?: string
  adminUid: string
}) {
  const { decisionRef, action, notes, adminUid } = params

  // For meal safety, we just log the admin's decision
  // The meal was already flagged, this is for auditing
  await decisionRef.update({
    reviewStatus: action === 'approve' ? 'approved' : 'rejected',
    adminNotes: notes || '',
    reviewedAt: new Date(),
    reviewedBy: adminUid
  })

  logger.info('[Meal Safety Review] Admin reviewed critical meal', {
    action,
    adminUid
  })
}
