import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

// Force dynamic rendering - cannot be static due to Firebase Admin SDK
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/dashboard/stats
 * Aggregated dashboard statistics for family admin
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

    // Parallel data fetching for performance
    const [
      patientsSnapshot,
      familyMembersSnapshot,
      unreadNotificationsSnapshot,
      recommendationsSnapshot,
      upcomingAppointmentsSnapshot,
      recentMedicationsSnapshot,
      recentVitalsSnapshot,
      actionItemsSnapshot
    ] = await Promise.all([
      // Patients count
      adminDb.collection('patients').where('userId', '==', userId).get(),

      // Family members count (active)
      adminDb.collection('family_members')
        .where('userId', '==', userId)
        .where('status', '==', 'accepted')
        .get(),

      // Unread notifications count
      adminDb.collection('notifications')
        .where('userId', '==', userId)
        .where('read', '==', false)
        .get(),

      // Active recommendations count
      adminDb.collection('appointment_recommendations')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get(),

      // Upcoming appointments (next 30 days)
      adminDb.collection('appointments')
        .where('userId', '==', userId)
        .where('dateTime', '>=', new Date().toISOString())
        .where('dateTime', '<=', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .orderBy('dateTime', 'asc')
        .limit(5)
        .get(),

      // Recent medication changes (last 7 days)
      adminDb.collection('medications')
        .where('userId', '==', userId)
        .where('lastModified', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .orderBy('lastModified', 'desc')
        .limit(5)
        .get(),

      // Recent vitals (last 7 days)
      adminDb.collection('vitals')
        .where('userId', '==', userId)
        .where('timestamp', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get(),

      // Outstanding action items
      adminDb.collection('action_items')
        .where('userId', '==', userId)
        .where('completed', '==', false)
        .where('dueDate', '<=', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString())
        .orderBy('dueDate', 'asc')
        .get()
    ])

    // Get patient IDs for additional queries
    const patientIds = patientsSnapshot.docs.map(doc => doc.id)

    // Calculate stats
    const stats = {
      patients: {
        total: patientsSnapshot.size,
        humans: patientsSnapshot.docs.filter(doc => doc.data().type === 'human').length,
        pets: patientsSnapshot.docs.filter(doc => doc.data().type === 'pet').length
      },
      familyMembers: familyMembersSnapshot.size,
      notifications: {
        unread: unreadNotificationsSnapshot.size,
        urgent: unreadNotificationsSnapshot.docs.filter(doc => doc.data().priority === 'urgent').length
      },
      recommendations: {
        active: recommendationsSnapshot.size,
        urgent: recommendationsSnapshot.docs.filter(doc => doc.data().urgency === 'urgent').length
      },
      appointments: {
        upcoming: upcomingAppointmentsSnapshot.size
      },
      actionItems: {
        total: actionItemsSnapshot.size,
        overdue: actionItemsSnapshot.docs.filter(doc =>
          new Date(doc.data().dueDate) < new Date()
        ).length,
        dueToday: actionItemsSnapshot.docs.filter(doc => {
          const dueDate = new Date(doc.data().dueDate)
          const today = new Date()
          return dueDate.toDateString() === today.toDateString()
        }).length
      },
      recentActivity: {
        medications: recentMedicationsSnapshot.size,
        vitals: recentVitalsSnapshot.size
      }
    }

    // Get patient snapshots with recent data
    const patientSnapshots = await Promise.all(
      patientsSnapshot.docs.slice(0, 5).map(async (patientDoc) => {
        const patientData = patientDoc.data()
        const patientId = patientDoc.id

        // Get latest vitals for this patient
        const latestVitalsSnapshot = await adminDb.collection('vitals')
          .where('patientId', '==', patientId)
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get()

        // Get medication count
        const medicationsSnapshot = await adminDb.collection('medications')
          .where('patientId', '==', patientId)
          .where('status', '==', 'active')
          .get()

        // Get latest weight
        const latestWeightSnapshot = await adminDb.collection('weight_logs')
          .where('patientId', '==', patientId)
          .orderBy('loggedAt', 'desc')
          .limit(1)
          .get()

        return {
          id: patientId,
          name: patientData.name,
          photo: patientData.photo,
          type: patientData.type,
          relationship: patientData.relationship,
          activeMedications: medicationsSnapshot.size,
          lastVitalCheck: latestVitalsSnapshot.empty ? null : latestVitalsSnapshot.docs[0].data().timestamp,
          latestWeight: latestWeightSnapshot.empty ? null : {
            weight: latestWeightSnapshot.docs[0].data().weight,
            unit: latestWeightSnapshot.docs[0].data().unit,
            loggedAt: latestWeightSnapshot.docs[0].data().loggedAt
          }
        }
      })
    )

    logger.info('[GET /api/dashboard/stats] Dashboard stats fetched', { userId, stats })

    return NextResponse.json({
      success: true,
      stats,
      patientSnapshots,
      upcomingAppointments: upcomingAppointmentsSnapshot.docs.slice(0, 3).map(doc => ({
        id: doc.id,
        ...doc.data()
      })),
      actionItems: actionItemsSnapshot.docs.slice(0, 5).map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    })

  } catch (error: any) {
    logger.error('[GET /api/dashboard/stats] Error fetching dashboard stats', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard statistics',
        details: error.message
      },
      { status: 500 }
    )
  }
}
