import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

/**
 * GET /api/admin/analytics?range=<range>
 * Get platform analytics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail)

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const range = searchParams.get('range') || '30d'

    // Calculate date thresholds
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayTimestamp = Timestamp.fromDate(today)

    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysTimestamp = Timestamp.fromDate(sevenDaysAgo)

    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysTimestamp = Timestamp.fromDate(thirtyDaysAgo)

    // Fetch data in parallel
    const [
      totalUsersSnapshot,
      dauSnapshot,
      wauSnapshot,
      mauSnapshot,
      newUsersTodaySnapshot,
      newUsersWeekSnapshot,
      newUsersMonthSnapshot,
      recipesSnapshot,
      cookingSessionsSnapshot,
      recipeQueueSnapshot,
    ] = await Promise.all([
      // User metrics
      adminDb.collection('users').count().get(),
      adminDb.collection('users').where('lastActiveAt', '>=', todayTimestamp).count().get(),
      adminDb.collection('users').where('lastActiveAt', '>=', sevenDaysTimestamp).count().get(),
      adminDb.collection('users').where('lastActiveAt', '>=', thirtyDaysTimestamp).count().get(),
      adminDb.collection('users').where('createdAt', '>=', todayTimestamp).count().get(),
      adminDb.collection('users').where('createdAt', '>=', sevenDaysTimestamp).count().get(),
      adminDb.collection('users').where('createdAt', '>=', thirtyDaysTimestamp).count().get(),

      // Recipe metrics
      adminDb.collection('recipes').count().get(),
      adminDb.collectionGroup('cooking-sessions').count().get().catch(() => ({ data: () => ({ count: 0 }) })),
      adminDb.collectionGroup('recipe-queue').count().get().catch(() => ({ data: () => ({ count: 0 }) })),
    ])

    const totalUsers = totalUsersSnapshot.data().count
    const dau = dauSnapshot.data().count
    const wau = wauSnapshot.data().count
    const mau = mauSnapshot.data().count

    // Activity metrics - we need to aggregate across all users
    // For performance, we'll sample or use approximations
    let totalMealLogs = 0
    let mealLogsToday = 0
    let mealLogsThisWeek = 0
    let totalWeightLogs = 0
    let weightLogsToday = 0
    let weightLogsThisWeek = 0
    let totalStepLogs = 0
    let stepLogsToday = 0
    let stepLogsThisWeek = 0

    // Sample first 100 users for activity metrics (for performance)
    const sampleSize = Math.min(totalUsers, 100)
    if (sampleSize > 0) {
      const usersSnapshot = await adminDb.collection('users').limit(sampleSize).get()

      for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id

        // Get counts for this user
        const [
          userMealLogs,
          userMealLogsToday,
          userMealLogsWeek,
          userWeightLogs,
          userWeightLogsToday,
          userWeightLogsWeek,
          userStepLogs,
          userStepLogsToday,
          userStepLogsWeek,
        ] = await Promise.all([
          adminDb.collection(`users/${uid}/mealLogs`).count().get().catch(() => ({ data: () => ({ count: 0 }) })),
          adminDb.collection(`users/${uid}/mealLogs`).where('loggedAt', '>=', todayTimestamp).count().get().catch(() => ({ data: () => ({ count: 0 }) })),
          adminDb.collection(`users/${uid}/mealLogs`).where('loggedAt', '>=', sevenDaysTimestamp).count().get().catch(() => ({ data: () => ({ count: 0 }) })),
          adminDb.collection(`users/${uid}/weightLogs`).count().get().catch(() => ({ data: () => ({ count: 0 }) })),
          adminDb.collection(`users/${uid}/weightLogs`).where('loggedAt', '>=', todayTimestamp).count().get().catch(() => ({ data: () => ({ count: 0 }) })),
          adminDb.collection(`users/${uid}/weightLogs`).where('loggedAt', '>=', sevenDaysTimestamp).count().get().catch(() => ({ data: () => ({ count: 0 }) })),
          adminDb.collection(`users/${uid}/stepLogs`).count().get().catch(() => ({ data: () => ({ count: 0 }) })),
          adminDb.collection(`users/${uid}/stepLogs`).where('loggedAt', '>=', todayTimestamp).count().get().catch(() => ({ data: () => ({ count: 0 }) })),
          adminDb.collection(`users/${uid}/stepLogs`).where('loggedAt', '>=', sevenDaysTimestamp).count().get().catch(() => ({ data: () => ({ count: 0 }) })),
        ])

        totalMealLogs += userMealLogs.data().count
        mealLogsToday += userMealLogsToday.data().count
        mealLogsThisWeek += userMealLogsWeek.data().count
        totalWeightLogs += userWeightLogs.data().count
        weightLogsToday += userWeightLogsToday.data().count
        weightLogsThisWeek += userWeightLogsWeek.data().count
        totalStepLogs += userStepLogs.data().count
        stepLogsToday += userStepLogsToday.data().count
        stepLogsThisWeek += userStepLogsWeek.data().count
      }

      // Extrapolate to total users if we sampled
      if (sampleSize < totalUsers) {
        const multiplier = totalUsers / sampleSize
        totalMealLogs = Math.round(totalMealLogs * multiplier)
        mealLogsToday = Math.round(mealLogsToday * multiplier)
        mealLogsThisWeek = Math.round(mealLogsThisWeek * multiplier)
        totalWeightLogs = Math.round(totalWeightLogs * multiplier)
        weightLogsToday = Math.round(weightLogsToday * multiplier)
        weightLogsThisWeek = Math.round(weightLogsThisWeek * multiplier)
        totalStepLogs = Math.round(totalStepLogs * multiplier)
        stepLogsToday = Math.round(stepLogsToday * multiplier)
        stepLogsThisWeek = Math.round(stepLogsThisWeek * multiplier)
      }
    }

    // Calculate engagement metrics
    const avgMealsPerUser = totalUsers > 0 ? totalMealLogs / totalUsers : 0
    const avgWeightLogsPerUser = totalUsers > 0 ? totalWeightLogs / totalUsers : 0

    // Retention: users who signed up 7/30 days ago and are still active
    const retentionRate7Day = totalUsers > 0 ? wau / totalUsers : 0
    const retentionRate30Day = totalUsers > 0 ? mau / totalUsers : 0

    const data = {
      userMetrics: {
        totalUsers,
        dau,
        wau,
        mau,
        newUsersToday: newUsersTodaySnapshot.data().count,
        newUsersThisWeek: newUsersWeekSnapshot.data().count,
        newUsersThisMonth: newUsersMonthSnapshot.data().count,
      },
      activityMetrics: {
        totalMealLogs,
        mealLogsToday,
        mealLogsThisWeek,
        totalWeightLogs,
        weightLogsToday,
        weightLogsThisWeek,
        totalStepLogs,
        stepLogsToday,
        stepLogsThisWeek,
      },
      recipeMetrics: {
        totalRecipes: recipesSnapshot.data().count,
        totalCookingSessions: cookingSessionsSnapshot.data().count,
        recipeQueueSize: recipeQueueSnapshot.data().count,
        avgSessionsPerRecipe: recipesSnapshot.data().count > 0
          ? cookingSessionsSnapshot.data().count / recipesSnapshot.data().count
          : 0,
      },
      engagementMetrics: {
        avgMealsPerUser,
        avgWeightLogsPerUser,
        retentionRate7Day,
        retentionRate30Day,
      },
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
