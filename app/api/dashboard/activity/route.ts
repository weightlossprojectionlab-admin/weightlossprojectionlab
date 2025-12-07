import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

// Force dynamic rendering - cannot be static due to Firebase Admin SDK
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ActivityItem {
  id: string
  type: 'medication' | 'vital' | 'meal' | 'weight' | 'document' | 'appointment' | 'family'
  title: string
  description: string
  timestamp: string
  patientId?: string
  patientName?: string
  actionBy?: string
  actionByName?: string
  icon: string
  priority?: 'low' | 'normal' | 'high'
}

/**
 * GET /api/dashboard/activity
 * Recent activity feed for family admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : 20
    const daysBack = 7 // Last 7 days
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

    // Get all patients for this user to map names
    const patientsSnapshot = await adminDb.collection('patients')
      .where('userId', '==', userId)
      .get()

    const patientMap = new Map(
      patientsSnapshot.docs.map(doc => [doc.id, doc.data().name])
    )

    // Get all family members to map action performer names
    const familyMembersSnapshot = await adminDb.collection('family_members')
      .where('userId', '==', userId)
      .get()

    const familyMemberMap = new Map(
      familyMembersSnapshot.docs.map(doc => [doc.data().accountUserId || doc.id, doc.data().name])
    )

    const activityItems: ActivityItem[] = []

    // Fetch recent medications
    const medicationsSnapshot = await adminDb.collection('medications')
      .where('userId', '==', userId)
      .where('lastModified', '>=', cutoffDate)
      .orderBy('lastModified', 'desc')
      .limit(10)
      .get()

    medicationsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      activityItems.push({
        id: doc.id,
        type: 'medication',
        title: `Medication ${data.createdAt === data.lastModified ? 'Added' : 'Updated'}`,
        description: `${data.medicationName} ${data.strength || ''} - ${data.frequency || 'as needed'}`,
        timestamp: data.lastModified,
        patientId: data.patientId,
        patientName: patientMap.get(data.patientId),
        actionBy: data.addedBy,
        actionByName: familyMemberMap.get(data.addedBy) || 'You',
        icon: '💊',
        priority: 'normal'
      })
    })

    // Fetch recent vitals
    const vitalsSnapshot = await adminDb.collection('vitals')
      .where('userId', '==', userId)
      .where('timestamp', '>=', cutoffDate)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get()

    vitalsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const vitalTypeLabel = data.type.replace('_', ' ')
      activityItems.push({
        id: doc.id,
        type: 'vital',
        title: `${vitalTypeLabel.charAt(0).toUpperCase() + vitalTypeLabel.slice(1)} Logged`,
        description: `${data.value} ${data.unit}`,
        timestamp: data.timestamp,
        patientId: data.patientId,
        patientName: patientMap.get(data.patientId),
        actionBy: data.loggedBy,
        actionByName: familyMemberMap.get(data.loggedBy) || 'You',
        icon: '🩺',
        priority: data.isAbnormal ? 'high' : 'normal'
      })
    })

    // Fetch recent weight logs
    const weightLogsSnapshot = await adminDb.collection('weight_logs')
      .where('userId', '==', userId)
      .where('loggedAt', '>=', cutoffDate)
      .orderBy('loggedAt', 'desc')
      .limit(10)
      .get()

    weightLogsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      activityItems.push({
        id: doc.id,
        type: 'weight',
        title: 'Weight Logged',
        description: `${data.weight} ${data.unit}`,
        timestamp: data.loggedAt,
        patientId: data.patientId,
        patientName: patientMap.get(data.patientId),
        actionBy: data.loggedBy,
        actionByName: familyMemberMap.get(data.loggedBy) || 'You',
        icon: '⚖️',
        priority: 'normal'
      })
    })

    // Fetch recent meal logs
    const mealLogsSnapshot = await adminDb.collection('meal_logs')
      .where('userId', '==', userId)
      .where('timestamp', '>=', cutoffDate)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get()

    mealLogsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      const calorieInfo = data.totalCalories ? ` (${data.totalCalories} cal)` : ''
      activityItems.push({
        id: doc.id,
        type: 'meal',
        title: `${data.mealType.charAt(0).toUpperCase() + data.mealType.slice(1)} Logged`,
        description: `${data.foodItems?.slice(0, 2).join(', ') || 'Meal'}${calorieInfo}`,
        timestamp: data.timestamp,
        patientId: data.patientId,
        patientName: patientMap.get(data.patientId),
        actionBy: data.loggedBy,
        actionByName: familyMemberMap.get(data.loggedBy) || 'You',
        icon: '🍽️',
        priority: 'low'
      })
    })

    // Fetch recent documents
    const documentsSnapshot = await adminDb.collection('documents')
      .where('userId', '==', userId)
      .where('uploadedAt', '>=', cutoffDate)
      .orderBy('uploadedAt', 'desc')
      .limit(10)
      .get()

    documentsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      activityItems.push({
        id: doc.id,
        type: 'document',
        title: 'Document Uploaded',
        description: `${data.name} (${data.category})`,
        timestamp: data.uploadedAt,
        patientId: data.patientId,
        patientName: patientMap.get(data.patientId),
        actionBy: data.uploadedBy,
        actionByName: familyMemberMap.get(data.uploadedBy) || 'You',
        icon: '📄',
        priority: 'normal'
      })
    })

    // Fetch recent appointments
    const appointmentsSnapshot = await adminDb.collection('appointments')
      .where('userId', '==', userId)
      .where('createdAt', '>=', cutoffDate)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get()

    appointmentsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      activityItems.push({
        id: doc.id,
        type: 'appointment',
        title: 'Appointment Scheduled',
        description: `${data.providerName} - ${data.appointmentType}`,
        timestamp: data.createdAt,
        patientId: data.patientId,
        patientName: patientMap.get(data.patientId),
        actionBy: data.createdBy,
        actionByName: familyMemberMap.get(data.createdBy) || 'You',
        icon: '📅',
        priority: 'normal'
      })
    })

    // Fetch recent family member activity
    const recentFamilySnapshot = await adminDb.collection('family_members')
      .where('userId', '==', userId)
      .where('acceptedAt', '>=', cutoffDate)
      .orderBy('acceptedAt', 'desc')
      .limit(5)
      .get()

    recentFamilySnapshot.docs.forEach(doc => {
      const data = doc.data()
      if (data.status === 'accepted') {
        activityItems.push({
          id: doc.id,
          type: 'family',
          title: 'Family Member Joined',
          description: `${data.name} (${data.familyRole})`,
          timestamp: data.acceptedAt,
          actionByName: data.name,
          icon: '👥',
          priority: 'normal'
        })
      }
    })

    // Sort all activity by timestamp (most recent first)
    activityItems.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Apply limit
    const limitedActivity = activityItems.slice(0, limit)

    logger.info('[GET /api/dashboard/activity] Activity fetched', {
      userId,
      count: limitedActivity.length
    })

    return NextResponse.json({
      success: true,
      activity: limitedActivity,
      count: limitedActivity.length,
      daysBack
    })

  } catch (error: any) {
    logger.error('[GET /api/dashboard/activity] Error fetching activity', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch activity feed',
        details: error.message
      },
      { status: 500 }
    )
  }
}
