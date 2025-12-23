import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'
import type { NotificationPreferences } from '@/types/notifications'

/**
 * GET /api/notifications/preferences
 * Get notification preferences for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorizedResponse()
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Fetch preferences from Firestore
    const prefsDoc = await adminDb
      .collection('notification_preferences')
      .doc(userId)
      .get()

    if (!prefsDoc.exists) {
      // Return default preferences
      const defaultPreferences: NotificationPreferences = {
        medication_added: { email: true, push: true, inApp: true },
        medication_updated: { email: true, push: true, inApp: true },
        medication_deleted: { email: true, push: true, inApp: true },
        vital_logged: { email: true, push: false, inApp: true },
        meal_logged: { email: false, push: false, inApp: true },
        weight_logged: { email: true, push: false, inApp: true },
        document_uploaded: { email: true, push: true, inApp: true },
        appointment_scheduled: { email: true, push: true, inApp: true },
        appointment_updated: { email: false, push: false, inApp: true },
        appointment_cancelled: { email: true, push: true, inApp: true },
        appointment_reminder: { email: true, push: true, inApp: true },
        health_report_generated: { email: true, push: true, inApp: true },
        family_member_invited: { email: true, push: false, inApp: true },
        family_member_joined: { email: true, push: true, inApp: true },
        patient_added: { email: true, push: true, inApp: true },
        vital_alert: { email: true, push: true, inApp: true },
        medication_reminder: { email: true, push: true, inApp: true },
        duty_assigned: { email: true, push: true, inApp: true },
        duty_reassigned: { email: true, push: true, inApp: true },
        duty_updated: { email: true, push: false, inApp: true },
        duty_reminder: { email: true, push: true, inApp: true },
        duty_overdue: { email: true, push: true, inApp: true },
        duty_completed: { email: false, push: false, inApp: true },
        quietHours: {
          enabled: true,
          startHour: 22,
          endHour: 7
        },
        globallyEnabled: true
      }

      logger.debug('[Notification Preferences API] Returning default preferences', { userId })
      return NextResponse.json({ success: true, data: defaultPreferences })
    }

    const preferences = prefsDoc.data() as NotificationPreferences

    logger.debug('[Notification Preferences API] Preferences fetched', { userId })
    return NextResponse.json({ success: true, data: preferences })
  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/notifications/preferences',
      operation: 'get'
    })
  }
}

/**
 * PATCH /api/notifications/preferences
 * Update notification preferences for the authenticated user
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorizedResponse()
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Parse request body
    const updates = await request.json()

    // Validate that updates is an object
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid preferences data' },
        { status: 400 }
      )
    }

    // Update preferences in Firestore
    await adminDb
      .collection('notification_preferences')
      .doc(userId)
      .set(updates, { merge: true })

    logger.info('[Notification Preferences API] Preferences updated', { userId })

    // Fetch updated preferences
    const updatedDoc = await adminDb
      .collection('notification_preferences')
      .doc(userId)
      .get()

    const preferences = updatedDoc.data() as NotificationPreferences

    return NextResponse.json({ success: true, data: preferences })
  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/notifications/preferences',
      operation: 'update'
    })
  }
}
