/**
 * API Route: /api/notifications
 *
 * Handles notification operations
 * GET - Fetch user's notifications with filters and pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'

/**
 * Notification structure based on existing pattern:
 * - type: string (e.g., 'ownership_transferred', 'appointment_reminder', etc.)
 * - title: string
 * - message: string
 * - read: boolean
 * - createdAt: string (ISO 8601)
 * - readAt?: string (ISO 8601)
 * - patientId?: string (optional filter)
 * - priority?: 'low' | 'medium' | 'high'
 * - actionRequired?: boolean
 * - fromUserId?: string
 * - fromUserName?: string
 */

// GET /api/notifications - Fetch user's notifications
export async function GET(request: NextRequest) {
  try {
    // Extract and verify auth token
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('[API /notifications GET] Missing or invalid Authorization header')
      return unauthorizedResponse()
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const type = searchParams.get('type')
    const readStatus = searchParams.get('read') // 'true', 'false', or null (all)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    logger.debug('[API /notifications GET] Fetching notifications', {
      userId,
      patientId,
      type,
      readStatus,
      limit,
      offset
    })

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid limit. Must be between 1 and 100.'
        },
        { status: 400 }
      )
    }

    if (offset < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid offset. Must be 0 or greater.'
        },
        { status: 400 }
      )
    }

    // Build query - using root notifications collection with userId filter
    let query = adminDb
      .collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')

    // Apply filters
    if (patientId) {
      query = query.where('patientId', '==', patientId) as any
    }

    if (type) {
      query = query.where('type', '==', type) as any
    }

    if (readStatus !== null) {
      const isRead = readStatus === 'true'
      query = query.where('read', '==', isRead) as any
    }

    // Execute query with pagination
    const snapshot = await query.limit(limit).offset(offset).get()

    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Get total count (for pagination metadata)
    let totalQuery = adminDb
      .collection('notifications')
      .where('userId', '==', userId)

    if (patientId) {
      totalQuery = totalQuery.where('patientId', '==', patientId) as any
    }
    if (type) {
      totalQuery = totalQuery.where('type', '==', type) as any
    }
    if (readStatus !== null) {
      const isRead = readStatus === 'true'
      totalQuery = totalQuery.where('read', '==', isRead) as any
    }

    const totalSnapshot = await totalQuery.count().get()
    const totalCount = totalSnapshot.data().count

    // Get unread count
    const unreadSnapshot = await adminDb
      .collection('notifications')
      .where('userId', '==', userId)
      .where('read', '==', false)
      .count()
      .get()
    const unreadCount = unreadSnapshot.data().count

    logger.info('[API /notifications GET] Notifications fetched successfully', {
      userId,
      count: notifications.length,
      totalCount,
      unreadCount,
      filters: { patientId, type, readStatus }
    })

    return NextResponse.json({
      success: true,
      data: notifications,
      meta: {
        total: totalCount,
        unread: unreadCount,
        limit,
        offset,
        hasMore: offset + notifications.length < totalCount
      }
    })

  } catch (error) {
    return errorResponse(error, {
      route: '/api/notifications',
      operation: 'list'
    })
  }
}
