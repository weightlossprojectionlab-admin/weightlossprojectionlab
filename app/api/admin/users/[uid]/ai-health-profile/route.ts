/**
 * API Route: Admin - Get User's AI Health Profile
 *
 * Retrieves AI health profile and related AI decisions for a specific user.
 * Admin-only endpoint.
 *
 * GET /api/admin/users/[uid]/ai-health-profile
 * Auth: Required (Admin Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb as db } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { requireAdmin } from '@/lib/admin-auth'
import type { AIHealthProfile, AIDecision } from '@/types'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    // 1. Verify admin authentication using unified auth
    const authHeader = request.headers.get('Authorization')
    const cookieToken = request.cookies.get('idToken')?.value

    const authResult = await requireAdmin(authHeader, cookieToken)

    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: authResult.status })
    }

    const { uid: adminUser, email: adminEmail } = authResult

    // 2. Get target user ID from params
    const params = await context.params
    const targetUserId = params.uid

    logger.debug('[AI Health Profile Admin] Fetching profile', {
      admin: adminUser,
      adminEmail,
      targetUser: targetUserId
    })

    // 3. Fetch user's AI health profile
    const profileDoc = await db
      .collection('users')
      .doc(targetUserId)
      .collection('aiHealthProfile')
      .doc('current')
      .get()

    let healthProfile: AIHealthProfile | null = null
    if (profileDoc.exists) {
      healthProfile = profileDoc.data() as AIHealthProfile
    }

    // 4. Fetch recent AI decisions for this user (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const decisionsQuery = await db
      .collection('ai-decisions')
      .where('userId', '==', targetUserId)
      .where('createdAt', '>=', thirtyDaysAgo)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    const recentDecisions: AIDecision[] = []
    decisionsQuery.forEach(doc => {
      const data = doc.data()
      recentDecisions.push({
        id: doc.id,
        type: data.type,
        userId: data.userId,
        payload: data.payload,
        confidence: data.confidence,
        reviewStatus: data.reviewStatus,
        adminNotes: data.adminNotes,
        reviewedAt: data.reviewedAt?.toDate(),
        reviewedBy: data.reviewedBy,
        createdAt: data.createdAt?.toDate() || new Date()
      })
    })

    // 5. Calculate summary statistics
    const unreviewedCount = recentDecisions.filter(
      d => d.reviewStatus === 'unreviewed'
    ).length

    const healthProfileDecisions = recentDecisions.filter(
      d => d.type === 'health-profile'
    )

    const mealSafetyChecks = recentDecisions.filter(
      d => d.type === 'meal-safety'
    )

    const criticalMealSafetyCount = mealSafetyChecks.filter(
      d => d.payload?.safetyCheck?.severity === 'critical'
    ).length

    // 6. Extract active restrictions count
    let restrictionsCount = 0
    let criticalWarnings: string[] = []
    if (healthProfile) {
      restrictionsCount = Object.keys(healthProfile.restrictions).filter(
        key => healthProfile.restrictions[key]?.limit
      ).length
      criticalWarnings = healthProfile.criticalWarnings || []
    }

    // 7. Return comprehensive summary
    return NextResponse.json({
      ok: true,
      summary: {
        hasProfile: !!healthProfile,
        profileStatus: healthProfile?.reviewStatus || null,
        profileConfidence: healthProfile?.confidence || null,
        profileGeneratedAt: healthProfile?.generatedAt || null,
        restrictionsCount,
        criticalWarnings,
        recentDecisions: {
          total: recentDecisions.length,
          unreviewed: unreviewedCount,
          healthProfileDecisions: healthProfileDecisions.length,
          mealSafetyChecks: mealSafetyChecks.length,
          criticalMealSafety: criticalMealSafetyCount
        }
      },
      healthProfile,
      recentDecisions: recentDecisions.slice(0, 5) // Return top 5 most recent
    })

  } catch (error) {
    logger.error('[AI Health Profile Admin] Failed to fetch data', error as Error)

    return NextResponse.json(
      {
        error: 'Failed to fetch AI health profile data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
