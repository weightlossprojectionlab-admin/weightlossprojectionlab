import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * Send a test notification to the authenticated user
 * POST /api/notifications/test
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    logger.debug('[Test Notification] Starting...')

    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('[Test Notification] No auth header')
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]

    // Import Firebase Admin
    let adminAuth, adminDb, admin
    try {
      const firebaseAdmin = await import('@/lib/firebase-admin')
      adminAuth = firebaseAdmin.adminAuth
      adminDb = firebaseAdmin.adminDb
      admin = await import('firebase-admin')
      logger.debug('[Test Notification] Firebase Admin imported')
    } catch (error) {
    return errorResponse(error, {
      route: '/api/notifications/test',
      operation: 'create'
    })
  }

    // Verify token
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken)
      logger.debug('[Test Notification] Token verified', { userId: decodedToken.uid })
    } catch (error) {
    return errorResponse(error, {
      route: '/api/notifications/test',
      operation: 'create'
    })
  }

    const userId = decodedToken.uid

    // Fetch user data from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()

    if (!userData?.notificationToken) {
      logger.warn('[Test Notification] No notification token found', { userId })
      return NextResponse.json(
        {
          error: 'No notification token found. Please enable notifications on the dashboard first.',
          hint: 'Look for the notification prompt on your dashboard and click "Enable Notifications"'
        },
        { status: 400 }
      )
    }

    const fcmToken = userData.notificationToken

    // Send test notification using FCM Admin SDK
    const message = {
      notification: {
        title: '🎉 Test Notification',
        body: 'Your notifications are working! You\'ll receive helpful reminders to stay on track.',
      },
      token: fcmToken,
      webpush: {
        fcmOptions: {
          link: '/dashboard' // Where to navigate when clicked
        }
      }
    }

    logger.debug('[Test Notification] Sending message...', { fcmToken: fcmToken.substring(0, 20) + '...' })

    let response
    try {
      response = await admin.messaging().send(message)
      logger.info('[Test Notification] Successfully sent', {
        userId,
        messageId: response
      })
    } catch (error) {
    return errorResponse(error, {
      route: '/api/notifications/test',
      operation: 'create'
    })
  }

    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully! Check your device.',
      messageId: response
    })

  } catch (error) {
    return errorResponse(error, {
      route: '/api/notifications/test',
      operation: 'create'
    })
  }
}
