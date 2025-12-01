import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Send a test notification to the authenticated user
 * POST /api/notifications/test
 */
export async function POST(request: NextRequest) {
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
      logger.error('[Test Notification] Failed to import Firebase Admin:', error as Error)
      return NextResponse.json(
        { error: 'Firebase Admin not initialized', details: (error as Error).message },
        { status: 500 }
      )
    }

    // Verify token
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken)
      logger.debug('[Test Notification] Token verified', { userId: decodedToken.uid })
    } catch (error) {
      logger.error('[Test Notification] Token verification failed:', error as Error)
      return NextResponse.json(
        { error: 'Invalid authentication token', details: (error as Error).message },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid

    // Get user's FCM token
    let userData
    try {
      const userDoc = await adminDb.collection('users').doc(userId).get()
      userData = userDoc.data()
      logger.debug('[Test Notification] User data retrieved', {
        hasToken: !!userData?.notificationToken,
        userId
      })
    } catch (error) {
      logger.error('[Test Notification] Failed to get user data:', error as Error)
      return NextResponse.json(
        { error: 'Failed to retrieve user data', details: (error as Error).message },
        { status: 500 }
      )
    }

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
      logger.error('[Test Notification] FCM send failed:', error as Error)
      return NextResponse.json(
        {
          error: 'Failed to send notification via FCM',
          details: (error as Error).message,
          hint: 'Make sure Firebase Cloud Messaging is properly configured in your Firebase project'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test notification sent successfully! Check your device.',
      messageId: response
    })

  } catch (error) {
    logger.error('[Test Notification] Unexpected error:', error as Error)

    return NextResponse.json(
      { error: 'Failed to send test notification', details: (error as Error).message },
      { status: 500 }
    )
  }
}
