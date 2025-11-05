/**
 * API Route: Admin - Get User Health Vitals
 *
 * Returns comprehensive health vitals summary for a specific user.
 * Includes latest readings, weekly trends, and abnormal value detection.
 *
 * GET /api/admin/users/[uid]/health-vitals
 * Auth: Required (Admin only)
 *
 * HIPAA NOTICE:
 * This endpoint returns Protected Health Information (PHI).
 * TODO: Implement audit logging before production deployment.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, db } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import type { HealthVitalsSummary } from '@/types'

interface RouteParams {
  params: Promise<{
    uid: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { uid } = await params

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
        logger.warn('[Health Vitals API] Non-admin attempted access', { adminUid, targetUid: uid })
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        )
      }

      // TODO: Log PHI access for HIPAA audit trail
      // await logPHIAccess({ adminUid, operation: 'READ', collection: 'health-vitals', targetUserId: uid })

      logger.debug('[Health Vitals API] Admin authenticated', { adminUid, targetUid: uid })
    } catch (authError) {
      logger.error('[Health Vitals API] Auth failed', authError as Error)
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication token' },
        { status: 401 }
      )
    }

    // 2. Fetch user's health vitals from Firestore
    const summary = await generateHealthVitalsSummary(uid)

    logger.info('[Health Vitals API] Summary generated', { adminUid, targetUid: uid })

    return NextResponse.json({
      ok: true,
      summary
    })

  } catch (error) {
    logger.error('[Health Vitals API] Failed to fetch vitals', error as Error)

    return NextResponse.json(
      {
        error: 'Failed to fetch health vitals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Generate health vitals summary for a user
 */
async function generateHealthVitalsSummary(userId: string): Promise<HealthVitalsSummary> {
  // Fetch latest blood sugar
  const bsQuery = await db
    .collection('blood-sugar-logs')
    .where('userId', '==', userId)
    .orderBy('loggedAt', 'desc')
    .limit(1)
    .get()

  let latestBloodSugar: HealthVitalsSummary['latestBloodSugar']
  if (!bsQuery.empty) {
    const bsData = bsQuery.docs[0].data()
    latestBloodSugar = {
      value: bsData.glucoseLevel,
      type: bsData.measurementType,
      date: bsData.loggedAt.toDate(),
      isAbnormal: bsData.glucoseLevel < 70 || bsData.glucoseLevel > 180
    }
  }

  // Fetch latest blood pressure
  const bpQuery = await db
    .collection('blood-pressure-logs')
    .where('userId', '==', userId)
    .orderBy('loggedAt', 'desc')
    .limit(1)
    .get()

  let latestBloodPressure: HealthVitalsSummary['latestBloodPressure']
  if (!bpQuery.empty) {
    const bpData = bpQuery.docs[0].data()
    latestBloodPressure = {
      systolic: bpData.systolic,
      diastolic: bpData.diastolic,
      date: bpData.loggedAt.toDate(),
      isAbnormal:
        bpData.systolic > 140 ||
        bpData.systolic < 90 ||
        bpData.diastolic > 90 ||
        bpData.diastolic < 60
    }
  }

  // Fetch weekly exercise logs
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const exQuery = await db
    .collection('exercise-logs')
    .where('userId', '==', userId)
    .where('loggedAt', '>=', oneWeekAgo)
    .get()

  let totalMinutes = 0
  let sessionsCount = 0
  const intensityScores = { low: 1, moderate: 2, high: 3 }
  let totalIntensityScore = 0

  exQuery.forEach(doc => {
    const exData = doc.data()
    totalMinutes += exData.duration
    sessionsCount++
    totalIntensityScore += intensityScores[exData.intensity as keyof typeof intensityScores] || 0
  })

  let avgIntensity = 'none'
  if (sessionsCount > 0) {
    const avgScore = totalIntensityScore / sessionsCount
    if (avgScore <= 1.5) avgIntensity = 'low'
    else if (avgScore <= 2.5) avgIntensity = 'moderate'
    else avgIntensity = 'high'
  }

  // Calculate trends (30-day comparison)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const fifteenDaysAgo = new Date()
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

  // Blood sugar trend
  const bsTrendQuery = await db
    .collection('blood-sugar-logs')
    .where('userId', '==', userId)
    .where('loggedAt', '>=', thirtyDaysAgo)
    .orderBy('loggedAt', 'asc')
    .get()

  let bloodSugarTrend: HealthVitalsSummary['trends']['bloodSugarTrend'] = 'insufficient-data'
  if (bsTrendQuery.size >= 4) {
    const logs = bsTrendQuery.docs.map(d => d.data())
    const midpoint = Math.floor(logs.length / 2)
    const firstHalfAvg = logs.slice(0, midpoint).reduce((sum, l) => sum + l.glucoseLevel, 0) / midpoint
    const secondHalfAvg = logs.slice(midpoint).reduce((sum, l) => sum + l.glucoseLevel, 0) / (logs.length - midpoint)
    const change = secondHalfAvg - firstHalfAvg

    if (Math.abs(change) < 10) bloodSugarTrend = 'stable'
    else if (change < 0) bloodSugarTrend = 'improving' // Lower is better (closer to normal range)
    else bloodSugarTrend = 'worsening'
  }

  // Blood pressure trend
  const bpTrendQuery = await db
    .collection('blood-pressure-logs')
    .where('userId', '==', userId)
    .where('loggedAt', '>=', thirtyDaysAgo)
    .orderBy('loggedAt', 'asc')
    .get()

  let bloodPressureTrend: HealthVitalsSummary['trends']['bloodPressureTrend'] = 'insufficient-data'
  if (bpTrendQuery.size >= 4) {
    const logs = bpTrendQuery.docs.map(d => d.data())
    const midpoint = Math.floor(logs.length / 2)
    const firstHalfAvg = logs.slice(0, midpoint).reduce((sum, l) => sum + (l.systolic + l.diastolic) / 2, 0) / midpoint
    const secondHalfAvg = logs.slice(midpoint).reduce((sum, l) => sum + (l.systolic + l.diastolic) / 2, 0) / (logs.length - midpoint)
    const change = secondHalfAvg - firstHalfAvg

    if (Math.abs(change) < 5) bloodPressureTrend = 'stable'
    else if (change < 0) bloodPressureTrend = 'improving' // Lower is generally better
    else bloodPressureTrend = 'worsening'
  }

  // Exercise trend (compare last 2 weeks vs previous 2 weeks)
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

  const recentExQuery = await db
    .collection('exercise-logs')
    .where('userId', '==', userId)
    .where('loggedAt', '>=', twoWeeksAgo)
    .get()

  const olderExQuery = await db
    .collection('exercise-logs')
    .where('userId', '==', userId)
    .where('loggedAt', '>=', fourWeeksAgo)
    .where('loggedAt', '<', twoWeeksAgo)
    .get()

  let exerciseTrend: HealthVitalsSummary['trends']['exerciseTrend'] = 'insufficient-data'
  if (recentExQuery.size >= 2 && olderExQuery.size >= 2) {
    const recentMinutes = recentExQuery.docs.reduce((sum, d) => sum + d.data().duration, 0)
    const olderMinutes = olderExQuery.docs.reduce((sum, d) => sum + d.data().duration, 0)
    const change = recentMinutes - olderMinutes

    if (Math.abs(change) < 30) exerciseTrend = 'stable'
    else if (change > 0) exerciseTrend = 'improving' // More exercise is better
    else exerciseTrend = 'worsening'
  }

  return {
    latestBloodSugar,
    latestBloodPressure,
    weeklyExercise: {
      totalMinutes,
      sessionsCount,
      avgIntensity
    },
    trends: {
      bloodSugarTrend,
      bloodPressureTrend,
      exerciseTrend
    }
  }
}
