/**
 * API Route: /api/notifications/mark-all-read
 *
 * Handles marking all user notifications as read
 * PATCH - Mark all notifications as read (with optional filters)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'

// PATCH /api/notifications/mark-all-read - Mark all user's notifications as read
export async function PATCH(request: NextRequest) {
  try {
    // Extract and verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('[API /notifications/mark-all-read PATCH] Missing or invalid Authorization header')
      return unauthorizedResponse()
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse optional filters from query parameters
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const type = searchParams.get('type')

    logger.debug('[API /notifications/mark-all-read PATCH] Marking all notifications as read', {
      userId,
      filters: { patientId, type }
    })

    // Build query to find unread notifications from root collection
    let query = adminDb
      .collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)

    // Apply optional filters
    if (patientId) {
      query = query.where('patientId', '==', patientId) as any
    }

    if (type) {
      query = query.where('type', '==', type) as any
    }

    // Fetch unread notifications
    const snapshot = await query.get()

    if (snapshot.empty) {
      logger.debug('[API /notifications/mark-all-read PATCH] No unread notifications found', {
        userId,
        filters: { patientId, type }
      })
      return NextResponse.json({
        success: true,
        message: 'No unread notifications to mark as read',
        data: {
          updatedCount: 0
        }
      })
    }

    // Batch update for efficiency
    const batch = adminDb.batch()
    const now = new Date().toISOString()
    const notificationIds: string[] = []

    snapshot.docs.forEach(doc => {
      notificationIds.push(doc.id)
      batch.update(doc.ref, {
        read: true,
        readAt: now
      })
    })

    // Commit batch update
    await batch.commit()

    logger.info('[API /notifications/mark-all-read PATCH] All notifications marked as read', {
      userId,
      updatedCount: notificationIds.length,
      filters: { patientId, type }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully marked ${notificationIds.length} notification(s) as read`,
      data: {
        updatedCount: notificationIds.length,
        notificationIds
      }
    })

  } catch (error) {
    return errorResponse(error, {
      route: '/api/notifications/mark-all-read',
      operation: 'batch-update'
    })
  }
}
