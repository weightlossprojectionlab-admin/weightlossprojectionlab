/**
 * Family Caregivers API Route
 *
 * GET /api/family/caregivers - List all caregivers from familyMembers collection
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult) {
      return unauthorizedResponse()
    }

    const { userId } = authResult
    const searchParams = request.nextUrl.searchParams
    const patientId = searchParams.get('patientId')
    const role = searchParams.get('role')
    const search = searchParams.get('search')

    // Fetch real family members from Firestore
    const familyMembersRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('familyMembers')

    const snapshot = await familyMembersRef.get()

    let caregivers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    // Apply filters
    if (patientId) {
      caregivers = caregivers.filter((c: any) =>
        c.patientsAccess?.includes(patientId)
      )
    }

    if (role) {
      caregivers = caregivers.filter((c: any) => c.familyRole === role)
    }

    if (search) {
      const q = search.toLowerCase()
      caregivers = caregivers.filter((c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      )
    }

    logger.debug('[API /family/caregivers] Fetched caregivers', {
      userId,
      count: caregivers.length
    })

    return NextResponse.json({
      caregivers,
      total: caregivers.length,
      filtered: caregivers.length
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/family/caregivers', operation: 'list' })
  }
}
