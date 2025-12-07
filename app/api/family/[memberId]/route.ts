/**
 * API Route: /api/family/[memberId]
 *
 * Handles individual family member profile operations
 * GET - Fetch specific family member's profile (with shared patient verification)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse, successResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-response'
import { apiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { CaregiverProfile } from '@/types/caregiver'
import type { FamilyMember } from '@/types/medical'

// GET /api/family/[memberId] - Get specific family member profile
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params

    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[API /family/[memberId] GET] Missing or invalid Authorization header')
      return unauthorizedResponse('Missing or invalid authorization token')
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check rate limit
    const rateLimitResult = await apiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /family/[memberId] GET] Rate limit exceeded', { userId, memberId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    logger.debug('[API /family/[memberId] GET] Fetching family member profile', {
      userId,
      memberId
    })

    // Step 1: Get current user's patient access
    const currentUserPatientsAccess: string[] = []

    // Check if user is a patient owner
    const ownedPatientsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .get()

    ownedPatientsSnapshot.forEach(doc => {
      currentUserPatientsAccess.push(doc.id)
    })

    // Check if user is a family member with patient access
    const familyMemberSnapshot = await adminDb
      .collectionGroup('familyMembers')
      .where('userId', '==', userId)
      .where('status', '==', 'accepted')
      .get()

    familyMemberSnapshot.forEach(doc => {
      const member = doc.data() as FamilyMember
      if (member.patientsAccess && Array.isArray(member.patientsAccess)) {
        member.patientsAccess.forEach(patientId => {
          if (!currentUserPatientsAccess.includes(patientId)) {
            currentUserPatientsAccess.push(patientId)
          }
        })
      }
    })

    if (currentUserPatientsAccess.length === 0) {
      logger.warn('[API /family/[memberId] GET] User has no patient access', { userId, memberId })
      return forbiddenResponse('You do not have access to any patients')
    }

    // Step 2: Find the target member's family member record
    const targetMemberSnapshot = await adminDb
      .collectionGroup('familyMembers')
      .where('userId', '==', memberId)
      .where('status', '==', 'accepted')
      .get()

    if (targetMemberSnapshot.empty) {
      logger.warn('[API /family/[memberId] GET] Target member not found', { userId, memberId })
      return notFoundResponse('Family member')
    }

    const targetMemberDoc = targetMemberSnapshot.docs[0]
    const targetMember = targetMemberDoc.data() as FamilyMember

    // Step 3: Verify they share at least one patient
    const sharedPatients = targetMember.patientsAccess.filter(patientId =>
      currentUserPatientsAccess.includes(patientId)
    )

    if (sharedPatients.length === 0) {
      logger.warn('[API /family/[memberId] GET] No shared patients', {
        userId,
        memberId,
        requestorPatients: currentUserPatientsAccess,
        targetPatients: targetMember.patientsAccess
      })
      return forbiddenResponse('You do not share any patients with this family member')
    }

    logger.debug('[API /family/[memberId] GET] Shared patients verified', {
      userId,
      memberId,
      sharedPatients
    })

    // Step 4: Get member's caregiver profile
    const profileRef = adminDb
      .collection('users')
      .doc(memberId)
      .collection('caregiverProfile')
      .doc('profile')

    const profileDoc = await profileRef.get()

    let profile: CaregiverProfile | null = null

    if (profileDoc.exists) {
      profile = {
        id: profileDoc.id,
        ...profileDoc.data()
      } as CaregiverProfile

      // Apply privacy filtering
      const isPrivate = profile.profileVisibility === 'private'

      if (isPrivate) {
        logger.info('[API /family/[memberId] GET] Profile is private, returning limited data', {
          userId,
          memberId
        })

        // Return limited data for private profiles
        return successResponse({
          userId: memberId,
          name: profile.name,
          familyRole: profile.familyRole,
          relationship: targetMember.relationship,
          sharedPatients,
          profileVisibility: 'private',
          message: 'This profile is set to private. Limited information is available.'
        })
      }

      // Filter contact info based on preferences
      if (!profile.shareContactInfo) {
        profile.email = ''
        profile.phone = undefined
        if (profile.address) {
          profile.address = undefined
        }
        if (profile.emergencyContact) {
          profile.emergencyContact = undefined
        }
      }

      // Filter availability based on preferences
      if (!profile.shareAvailability) {
        profile.weeklySchedule = undefined
        profile.unavailableDates = undefined
      }
    }

    // Build response
    const response = {
      ...profile,
      userId: memberId,
      name: profile?.name || targetMember.name,
      email: profile?.shareContactInfo ? (profile?.email || targetMember.email) : '',
      familyRole: profile?.familyRole || targetMember.familyRole || 'caregiver',
      relationship: targetMember.relationship,
      sharedPatients,
      permissions: targetMember.permissions,
      invitedBy: targetMember.invitedBy,
      invitedAt: targetMember.invitedAt,
      acceptedAt: targetMember.acceptedAt,
      lastActive: profile?.lastActive || targetMember.lastActive
    }

    logger.info('[API /family/[memberId] GET] Family member profile fetched successfully', {
      userId,
      memberId,
      sharedPatientCount: sharedPatients.length
    })

    return successResponse(response)

  } catch (error: any) {
    logger.error('[API /family/[memberId] GET] Error fetching family member', error, {
      memberId: await params.then(p => p.memberId),
      errorMessage: error.message,
      errorStack: error.stack
    })
    return errorResponse(error, { route: '/api/family/[memberId]', method: 'GET' })
  }
}
