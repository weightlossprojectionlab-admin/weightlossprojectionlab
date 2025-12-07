/**
 * API Route: /api/family/profile
 *
 * Handles caregiver profile operations
 * GET - Fetch authenticated user's caregiver profile (create default if doesn't exist)
 * PATCH - Update caregiver profile with partial updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api-response'
import { apiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { CaregiverProfile, DEFAULT_CAREGIVER_PREFERENCES, DEFAULT_WEEKLY_AVAILABILITY } from '@/types/caregiver'
import type { AvailabilityStatus } from '@/types/caregiver'

/**
 * Create default caregiver profile
 */
function createDefaultProfile(userId: string, email: string, name?: string): Omit<CaregiverProfile, 'id'> {
  const now = new Date().toISOString()

  return {
    userId,
    name: name || email.split('@')[0], // Use part of email if no name
    email,
    familyRole: 'caregiver', // Default role
    patientsAccess: [],
    patientRelationships: {},
    permissions: {
      viewPatientProfile: true,
      viewMedicalRecords: true,
      editMedications: false,
      scheduleAppointments: false,
      editAppointments: false,
      deleteAppointments: false,
      uploadDocuments: false,
      deleteDocuments: false,
      logVitals: true,
      viewVitals: true,
      chatAccess: true,
      inviteOthers: false,
      viewSensitiveInfo: false,
      editPatientProfile: false,
      deletePatient: false
    },
    availabilityStatus: 'offline' as AvailabilityStatus,
    weeklySchedule: DEFAULT_WEEKLY_AVAILABILITY,
    preferences: DEFAULT_CAREGIVER_PREFERENCES,
    joinedAt: now,
    managedBy: userId, // Self-managed by default
    profileVisibility: 'family_only',
    shareContactInfo: true,
    shareAvailability: true
  }
}

// GET /api/family/profile - Get current user's caregiver profile
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[API /family/profile GET] Missing or invalid Authorization header')
      return unauthorizedResponse('Missing or invalid authorization token')
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check rate limit
    const rateLimitResult = await apiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /family/profile GET] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    logger.debug('[API /family/profile GET] Fetching caregiver profile', { userId })

    // Get caregiver profile
    const profileRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('caregiverProfile')
      .doc('profile')

    const profileDoc = await profileRef.get()

    let profile: CaregiverProfile

    if (!profileDoc.exists) {
      // Create default profile
      logger.info('[API /family/profile GET] Profile not found, creating default', { userId })

      const defaultProfile = createDefaultProfile(
        userId,
        decodedToken.email || '',
        decodedToken.name
      )

      await profileRef.set(defaultProfile)

      profile = {
        id: userId,
        ...defaultProfile
      }

      logger.info('[API /family/profile GET] Default profile created', { userId })
    } else {
      profile = {
        id: profileDoc.id,
        ...profileDoc.data()
      } as CaregiverProfile
    }

    return successResponse(profile)

  } catch (error: any) {
    logger.error('[API /family/profile GET] Error fetching profile', error, {
      errorMessage: error.message,
      errorStack: error.stack
    })
    return errorResponse(error, { route: '/api/family/profile', method: 'GET' })
  }
}

// PATCH /api/family/profile - Update caregiver profile
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[API /family/profile PATCH] Missing or invalid Authorization header')
      return unauthorizedResponse('Missing or invalid authorization token')
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check rate limit
    const rateLimitResult = await apiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /family/profile PATCH] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Parse request body
    const body = await request.json()
    logger.debug('[API /family/profile PATCH] Update request', { userId, updateFields: Object.keys(body) })

    // Prevent updating protected fields
    const protectedFields = ['userId', 'id', 'joinedAt', 'createdAt']
    protectedFields.forEach(field => {
      if (field in body) {
        delete body[field]
        logger.warn('[API /family/profile PATCH] Attempted to update protected field', { userId, field })
      }
    })

    // Add updatedAt timestamp
    const updates = {
      ...body,
      lastActive: new Date().toISOString()
    }

    // Get profile reference
    const profileRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('caregiverProfile')
      .doc('profile')

    // Check if profile exists
    const profileDoc = await profileRef.get()

    if (!profileDoc.exists) {
      // Create profile with updates
      const defaultProfile = createDefaultProfile(
        userId,
        decodedToken.email || '',
        decodedToken.name
      )

      const newProfile = {
        ...defaultProfile,
        ...updates
      }

      await profileRef.set(newProfile)

      logger.info('[API /family/profile PATCH] Profile created with updates', { userId })

      return successResponse({
        id: userId,
        ...newProfile
      })
    }

    // Update existing profile
    await profileRef.update(updates)

    // Fetch updated profile
    const updatedDoc = await profileRef.get()
    const updatedProfile = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as CaregiverProfile

    logger.info('[API /family/profile PATCH] Profile updated successfully', {
      userId,
      fieldsUpdated: Object.keys(body)
    })

    return successResponse(updatedProfile)

  } catch (error: any) {
    logger.error('[API /family/profile PATCH] Error updating profile', error, {
      errorMessage: error.message,
      errorStack: error.stack
    })
    return errorResponse(error, { route: '/api/family/profile', method: 'PATCH' })
  }
}
