/**
 * API Route: /api/notifications/[id]/read
 *
 * Handles marking a single notification as read
 * PATCH - Mark notification as read
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse, unauthorizedResponse, notFoundResponse, forbiddenResponse } from '@/lib/api-response'

// PATCH /api/notifications/[id]/read - Mark single notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params

    // Validate notificationId
    if (!notificationId || typeof notificationId !== 'string' || notificationId.trim() === '') {
      logger.warn('[API /notifications/[id]/read PATCH] Invalid notification ID')
      return NextResponse.json(
        { success: false, error: 'Invalid notification ID' },
        { status: 400 }
      )
    }

    // Extract and verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('[API /notifications/[id]/read PATCH] Missing or invalid Authorization header')
      return unauthorizedResponse()
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    logger.debug('[API /notifications/[id]/read PATCH] Marking notification as read', {
      userId,
      notificationId
    })

    // Get notification reference from root collection
    const notificationRef = adminDb
      .collection('notifications')
      .doc(notificationId)

    const notificationDoc = await notificationRef.get()

    // Check if notification exists
    if (!notificationDoc.exists) {
      logger.warn('[API /notifications/[id]/read PATCH] Notification not found', {
        userId,
        notificationId
      })
      return notFoundResponse('Notification')
    }

    const notificationData = notificationDoc.data()

    // Verify user owns the notification (critical security check)
    if (!notificationData?.userId || notificationData.userId !== userId) {
      logger.warn('[API /notifications/[id]/read PATCH] User does not own notification', {
        userId,
        notificationId,
        notificationUserId: notificationData?.userId
      })
      return forbiddenResponse('You do not have permission to modify this notification')
    }

    // Check if already read
    if (notificationData?.read === true) {
      logger.debug('[API /notifications/[id]/read PATCH] Notification already marked as read', {
        userId,
        notificationId
      })
      return NextResponse.json({
        success: true,
        message: 'Notification already marked as read',
        data: {
          id: notificationId,
          ...notificationData
        }
      })
    }

    // Update notification
    const now = new Date().toISOString()
    await notificationRef.update({
      read: true,
      readAt: now
    })

    logger.info('[API /notifications/[id]/read PATCH] Notification marked as read', {
      userId,
      notificationId
    })

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
      data: {
        id: notificationId,
        ...notificationData,
        read: true,
        readAt: now
      }
    })

  } catch (error) {
    return errorResponse(error, {
      route: '/api/notifications/[id]/read',
      operation: 'update',
      notificationId: await params.then(p => p.id)
    })
  }
}
