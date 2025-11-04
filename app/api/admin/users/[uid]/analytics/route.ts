import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/users/[uid]/analytics?range=7d|30d|90d|all
 * Get detailed analytics data for a specific user
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  let params: { uid: string } | undefined
  try {
    // Resolve params first (Next.js 15 requirement)
    params = await context.params

    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token with Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail.toLowerCase())

    if (!isSuperAdmin && adminData?.role !== 'admin' && adminData?.role !== 'moderator' && adminData?.role !== 'support') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { uid } = params
    const searchParams = request.nextUrl.searchParams
    const range = searchParams.get('range') || '30d'

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'all':
      default:
        startDate = new Date(0) // Beginning of time
        break
    }

    // Fetch user profile and all settings
    const userDoc = await adminDb.collection('users').doc(uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const userData = userDoc.data()

    // Extract comprehensive user data
    const userPreferences = userData?.preferences || {}
    const userProfile = userData?.profile || {}
    const userGoals = userData?.goals || {}

    // Fetch user's auth data
    let userAuth
    try {
      userAuth = await adminAuth.getUser(uid)
    } catch (err) {
      logger.error('Error fetching user auth data', err as Error, { uid })
      userAuth = null
    }

    // Fetch weight logs with all fields
    const weightLogsSnapshot = await adminDb
      .collection(`users/${uid}/weightLogs`)
      .where('loggedAt', '>=', startDate)
      .orderBy('loggedAt', 'desc')
      .get()

    const weightLogs = weightLogsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        date: data.loggedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        weight: data.weight || 0,
        unit: data.unit || 'kg',
        notes: data.notes,
        dataSource: data.dataSource || 'manual',
        photoUrl: data.photoUrl,
        loggedAt: data.loggedAt?.toDate?.()?.toISOString()
      }
    })

    // Fetch meal logs with all fields
    const mealLogsSnapshot = await adminDb
      .collection(`users/${uid}/mealLogs`)
      .where('loggedAt', '>=', startDate)
      .orderBy('loggedAt', 'desc')
      .get()

    const mealLogs = mealLogsSnapshot.docs.map(doc => {
      const data = doc.data()
      const calories = data.aiAnalysis?.nutritionEstimate?.calories ||
                      data.manualEntries?.reduce((sum: number, entry: any) => sum + (entry.calories || 0), 0) ||
                      0
      const protein = data.aiAnalysis?.nutritionEstimate?.macros?.protein || 0
      const carbs = data.aiAnalysis?.nutritionEstimate?.macros?.carbs || 0
      const fat = data.aiAnalysis?.nutritionEstimate?.macros?.fat || 0

      return {
        id: doc.id,
        date: data.loggedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        calories,
        mealType: data.mealType || 'unknown',
        title: data.title,
        photoUrl: data.photoUrl,
        notes: data.notes,
        macros: { protein, carbs, fat },
        foodItems: data.aiAnalysis?.foodItems || [],
        manualEntries: data.manualEntries || [],
        loggedAt: data.loggedAt?.toDate?.()?.toISOString()
      }
    })

    // Fetch step logs with all fields
    const stepLogsSnapshot = await adminDb
      .collection(`users/${uid}/stepLogs`)
      .where('loggedAt', '>=', startDate)
      .orderBy('loggedAt', 'desc')
      .get()

    const stepLogs = stepLogsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        date: data.date || data.loggedAt?.toDate?.()?.toISOString()?.split('T')[0],
        steps: data.steps || 0,
        goal: data.goal,
        source: data.source || 'manual',
        notes: data.notes,
        loggedAt: data.loggedAt?.toDate?.()?.toISOString()
      }
    })

    // Calculate summary statistics
    const totalMeals = mealLogs.length
    const totalCalories = mealLogs.reduce((sum, log) => sum + log.calories, 0)
    const avgCaloriesPerDay = mealLogs.length > 0 ? Math.round(totalCalories / Math.max(1, new Set(mealLogs.map(m => m.date.split('T')[0])).size)) : 0

    const totalSteps = stepLogs.reduce((sum, log) => sum + log.steps, 0)
    const avgStepsPerDay = stepLogs.length > 0 ? Math.round(totalSteps / stepLogs.length) : 0

    // Weight logs are sorted desc, so first is most recent
    const weightChange = weightLogs.length >= 2
      ? weightLogs[0].weight - weightLogs[weightLogs.length - 1].weight
      : 0

    const currentWeight = weightLogs.length > 0 ? {
      date: weightLogs[0].date,
      weight: weightLogs[0].weight,
      unit: weightLogs[0].unit
    } : null

    // Calculate streak (consecutive days with at least one meal log)
    const mealDates = [...new Set(mealLogs.map(m => m.date.split('T')[0]))].sort().reverse()
    let streak = 0
    const today = new Date().toISOString().split('T')[0]
    for (let i = 0; i < mealDates.length; i++) {
      const expectedDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      if (mealDates[i] === expectedDate) {
        streak++
      } else {
        break
      }
    }

    // Group meal logs by date for daily calories chart
    const dailyCaloriesMap = new Map<string, number>()
    mealLogs.forEach(log => {
      const date = log.date.split('T')[0]
      dailyCaloriesMap.set(date, (dailyCaloriesMap.get(date) || 0) + log.calories)
    })
    const dailyCalories = Array.from(dailyCaloriesMap.entries())
      .map(([date, calories]) => ({ date, calories }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Prepare chart data (reverse chronological for display)
    const weightLogsForChart = [...weightLogs].reverse().map(({ id, notes, dataSource, photoUrl, ...rest }) => rest)
    const stepLogsForChart = [...stepLogs].reverse().map(({ id, source, notes, loggedAt, ...rest }) => rest)

    return NextResponse.json({
      user: {
        uid,
        email: userAuth?.email || userData?.email,
        displayName: userAuth?.displayName || userData?.displayName || 'Unknown',
        createdAt: userAuth?.metadata?.creationTime || userData?.createdAt?.toDate?.()?.toISOString(),
        lastActiveAt: userData?.lastActiveAt?.toDate?.()?.toISOString() || null,
        role: userData?.role || 'user',
        disabled: userAuth?.disabled || false
      },
      preferences: userPreferences,
      profile: userProfile,
      goals: userGoals,
      summary: {
        totalMeals,
        totalCalories,
        avgCaloriesPerDay,
        totalSteps,
        avgStepsPerDay,
        weightChange,
        currentWeight,
        streak
      },
      charts: {
        weightLogs: weightLogsForChart,
        dailyCalories,
        stepLogs: stepLogsForChart
      },
      logs: {
        weightLogs, // Full detailed logs for table
        stepLogs,   // Full detailed logs for table
        mealLogs    // Full detailed logs for table
      },
      range
    })
  } catch (error) {
    logger.error('Error fetching user analytics', error as Error, { uid: params?.uid })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch user analytics' },
      { status: 500 }
    )
  }
}
