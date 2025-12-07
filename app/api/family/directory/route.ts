/**
 * API Route: /api/family/directory
 *
 * Handles family member directory operations
 * GET - Fetch all family members who share patients with current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response'
import { apiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { CaregiverProfile } from '@/types/caregiver'
import type { FamilyMember } from '@/types/medical'

interface DirectoryEntry {
  userId: string
  name: string
  email: string
  photo?: string
  phone?: string
  familyRole: string
  relationship?: string
  sharedPatients: string[]
  patientNames?: string[]
  availabilityStatus?: string
  professionalInfo?: {
    title?: string
    credentials?: string[]
    specialties?: string[]
  }
  lastActive?: string
  profileVisibility?: string
  shareContactInfo: boolean
}

// GET /api/family/directory - Get family member directory
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[API /family/directory GET] Missing or invalid Authorization header')
      return unauthorizedResponse('Missing or invalid authorization token')
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check rate limit
    const rateLimitResult = await apiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /family/directory GET] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const patientIdFilter = searchParams.get('patientId')

    logger.debug('[API /family/directory GET] Fetching directory', {
      userId,
      patientIdFilter
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
      logger.info('[API /family/directory GET] User has no patient access', { userId })
      return successResponse([])
    }

    logger.debug('[API /family/directory GET] Current user patients access', {
      userId,
      patientsAccess: currentUserPatientsAccess
    })

    // Step 2: Find all family members who have access to these patients
    const directory: DirectoryEntry[] = []
    const processedUserIds = new Set<string>([userId]) // Don't include self

    // For each patient the user has access to, find family members
    for (const patientId of currentUserPatientsAccess) {
      // Skip if filtering by specific patient and this isn't it
      if (patientIdFilter && patientId !== patientIdFilter) {
        continue
      }

      // Find all family members with access to this patient
      const membersSnapshot = await adminDb
        .collectionGroup('familyMembers')
        .where('patientsAccess', 'array-contains', patientId)
        .where('status', '==', 'accepted')
        .get()

      for (const memberDoc of membersSnapshot.docs) {
        const member = memberDoc.data() as FamilyMember
        const memberUserId = member.userId

        // Skip if already processed or is current user
        if (processedUserIds.has(memberUserId)) {
          continue
        }

        processedUserIds.add(memberUserId)

        // Get member's caregiver profile
        const profileRef = adminDb
          .collection('users')
          .doc(memberUserId)
          .collection('caregiverProfile')
          .doc('profile')

        const profileDoc = await profileRef.get()

        // Determine shared patients
        const sharedPatients = member.patientsAccess.filter(pid =>
          currentUserPatientsAccess.includes(pid)
        )

        // Build directory entry
        let entry: DirectoryEntry

        if (profileDoc.exists) {
          const profile = profileDoc.data() as CaregiverProfile

          // Apply privacy filtering
          const isPrivate = profile.profileVisibility === 'private'
          const shareContact = profile.shareContactInfo

          entry = {
            userId: memberUserId,
            name: profile.name,
            email: shareContact && !isPrivate ? profile.email : '',
            photo: !isPrivate ? profile.photo : undefined,
            phone: shareContact && !isPrivate ? profile.phone : undefined,
            familyRole: profile.familyRole,
            relationship: member.relationship,
            sharedPatients,
            availabilityStatus: profile.shareAvailability && !isPrivate ? profile.availabilityStatus : undefined,
            professionalInfo: !isPrivate ? profile.professionalInfo : undefined,
            lastActive: profile.lastActive,
            profileVisibility: profile.profileVisibility,
            shareContactInfo: profile.shareContactInfo
          }
        } else {
          // Fallback to FamilyMember data if no caregiver profile
          entry = {
            userId: memberUserId,
            name: member.name,
            email: member.email,
            photo: member.photo,
            familyRole: member.familyRole || 'caregiver',
            relationship: member.relationship,
            sharedPatients,
            shareContactInfo: true
          }
        }

        directory.push(entry)
      }
    }

    // Step 3: Get patient names for context (optional enhancement)
    const patientNames: Record<string, string> = {}
    for (const patientId of currentUserPatientsAccess) {
      // Try to find patient in user's collection
      const patientRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('patients')
        .doc(patientId)

      const patientDoc = await patientRef.get()
      if (patientDoc.exists) {
        patientNames[patientId] = patientDoc.data()?.name || 'Unknown'
      }
    }

    // Attach patient names to directory entries
    directory.forEach(entry => {
      entry.patientNames = entry.sharedPatients
        .map(pid => patientNames[pid])
        .filter(Boolean)
    })

    logger.info('[API /family/directory GET] Directory fetched successfully', {
      userId,
      totalMembers: directory.length,
      patientIdFilter
    })

    return successResponse(directory)

  } catch (error: any) {
    logger.error('[API /family/directory GET] Error fetching directory', error, {
      errorMessage: error.message,
      errorStack: error.stack
    })
    return errorResponse(error, { route: '/api/family/directory', method: 'GET' })
  }
}
