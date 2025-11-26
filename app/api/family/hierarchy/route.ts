/**
 * Family Role Hierarchy API
 *
 * GET /api/family/hierarchy - Retrieve family role hierarchy and management structure
 *
 * Returns:
 * - Account Owner information
 * - All family members with their roles and permissions
 * - Management relationships (who manages whom)
 * - Role capabilities for each member
 *
 * Authorization: Any authenticated user (family members only see their own family)
 * Rate Limit: 60 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import {
  ROLE_CAPABILITIES,
  getMemberCapabilities,
  getRoleLabel,
  getRoleDescription,
  ROLE_HIERARCHY
} from '@/lib/family-roles'
import type { FamilyMember, FamilyRole } from '@/types/medical'

interface FamilyMemberWithCapabilities extends FamilyMember {
  roleLabel: string
  roleDescription: string
  capabilities: typeof ROLE_CAPABILITIES[FamilyRole]
  managedByName?: string
  managedByEmail?: string
  patientsAccessDetails?: Array<{
    patientId: string
    patientName: string
    relationship: string
  }>
}

interface HierarchyResponse {
  accountOwner: {
    userId: string
    name: string
    email: string
    accountOwnerSince?: string
  }
  familyMembers: FamilyMemberWithCapabilities[]
  roleHierarchy: {
    role: FamilyRole
    label: string
    description: string
    level: number
  }[]
  summary: {
    totalMembers: number
    accountOwners: number
    coAdmins: number
    caregivers: number
    viewers: number
  }
}

export async function GET(request: NextRequest) {
  try {
    // Step 1: Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      logger.error('[API /family/hierarchy GET] Token verification failed', error as Error)
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid

    // Step 2: Rate limiting
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /family/hierarchy GET] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    logger.debug('[API /family/hierarchy GET] Fetching family hierarchy', { userId })

    // Step 3: Determine user's role and find their family
    const userDoc = await adminDb.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const isUserAccountOwner = userData?.preferences?.isAccountOwner === true

    let ownerUserId: string
    let accountOwnerInfo: HierarchyResponse['accountOwner']

    if (isUserAccountOwner) {
      // User is the Account Owner
      ownerUserId = userId
      accountOwnerInfo = {
        userId,
        name: userData?.name || 'Unknown',
        email: userData?.email || 'Unknown',
        accountOwnerSince: userData?.preferences?.accountOwnerSince
      }
    } else {
      // User is a family member - find their Account Owner
      const familyMemberSnapshot = await adminDb
        .collectionGroup('familyMembers')
        .where('userId', '==', userId)
        .where('status', '==', 'accepted')
        .limit(1)
        .get()

      if (familyMemberSnapshot.empty) {
        return NextResponse.json(
          {
            success: false,
            error: 'Not found',
            message: 'You are not part of any family account'
          },
          { status: 404 }
        )
      }

      const familyMemberDoc = familyMemberSnapshot.docs[0]
      ownerUserId = familyMemberDoc.ref.parent.parent?.id || ''

      if (!ownerUserId) {
        logger.error('[API /family/hierarchy GET] Unable to extract owner from path: ' + familyMemberDoc.ref.path)
        return NextResponse.json(
          { success: false, error: 'Invalid family member document structure' },
          { status: 500 }
        )
      }

      // Get Account Owner info
      const ownerDoc = await adminDb.collection('users').doc(ownerUserId).get()
      if (!ownerDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Account owner not found' },
          { status: 404 }
        )
      }

      const ownerData = ownerDoc.data()
      accountOwnerInfo = {
        userId: ownerUserId,
        name: ownerData?.name || 'Unknown',
        email: ownerData?.email || 'Unknown',
        accountOwnerSince: ownerData?.preferences?.accountOwnerSince
      }
    }

    // Step 4: Fetch all family members
    const familyMembersSnapshot = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('familyMembers')
      .where('status', '==', 'accepted')
      .get()

    const familyMembers: FamilyMemberWithCapabilities[] = []

    // Create a map of userId to family member for quick lookup
    const familyMemberMap = new Map<string, FamilyMember>()
    familyMembersSnapshot.docs.forEach(doc => {
      const data = doc.data() as FamilyMember
      familyMemberMap.set(data.userId, data)
    })

    // Step 5: Get all patient information for patientsAccess details
    const patientsSnapshot = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .get()

    const patientMap = new Map<string, { name: string; relationship: string }>()
    patientsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      patientMap.set(doc.id, {
        name: data.name || 'Unknown',
        relationship: data.relationship || 'unknown'
      })
    })

    // Step 6: Build family members with capabilities
    for (const doc of familyMembersSnapshot.docs) {
      const memberData = {
        id: doc.id,
        ...doc.data()
      } as FamilyMember

      const role = memberData.familyRole || 'caregiver'
      const capabilities = getMemberCapabilities(memberData)

      // Get managed by information
      let managedByName: string | undefined
      let managedByEmail: string | undefined
      if (memberData.managedBy && memberData.managedBy !== ownerUserId) {
        const managedByMember = familyMemberMap.get(memberData.managedBy)
        if (managedByMember) {
          managedByName = managedByMember.name
          managedByEmail = managedByMember.email
        }
      } else if (memberData.managedBy === ownerUserId) {
        managedByName = accountOwnerInfo.name
        managedByEmail = accountOwnerInfo.email
      }

      // Get patients access details
      const patientsAccessDetails = (memberData.patientsAccess || []).map(patientId => {
        const patient = patientMap.get(patientId)
        return {
          patientId,
          patientName: patient?.name || 'Unknown',
          relationship: patient?.relationship || 'unknown'
        }
      })

      familyMembers.push({
        ...memberData,
        roleLabel: getRoleLabel(role),
        roleDescription: getRoleDescription(role),
        capabilities,
        managedByName,
        managedByEmail,
        patientsAccessDetails
      })
    }

    // Step 7: Sort family members by role hierarchy (highest to lowest)
    familyMembers.sort((a, b) => {
      const aRole = a.familyRole || 'caregiver'
      const bRole = b.familyRole || 'caregiver'
      const aIndex = ROLE_HIERARCHY.indexOf(aRole)
      const bIndex = ROLE_HIERARCHY.indexOf(bRole)
      return aIndex - bIndex
    })

    // Step 8: Calculate summary statistics
    const summary = {
      totalMembers: familyMembers.length,
      accountOwners: familyMembers.filter(m => m.familyRole === 'account_owner').length,
      coAdmins: familyMembers.filter(m => m.familyRole === 'co_admin').length,
      caregivers: familyMembers.filter(m => m.familyRole === 'caregiver').length,
      viewers: familyMembers.filter(m => m.familyRole === 'viewer').length
    }

    // Step 9: Build role hierarchy reference
    const roleHierarchy = ROLE_HIERARCHY.map((role, index) => ({
      role,
      label: getRoleLabel(role),
      description: getRoleDescription(role),
      level: ROLE_HIERARCHY.length - index // Higher number = higher authority
    }))

    logger.info('[API /family/hierarchy GET] Family hierarchy fetched successfully', {
      userId,
      ownerUserId,
      totalMembers: summary.totalMembers
    })

    // Step 10: Return hierarchy data
    const response: HierarchyResponse = {
      accountOwner: accountOwnerInfo,
      familyMembers,
      roleHierarchy,
      summary
    }

    return NextResponse.json({
      success: true,
      data: response
    })
  } catch (error: any) {
    logger.error('[API /family/hierarchy GET] Error fetching family hierarchy', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch family hierarchy' },
      { status: 500 }
    )
  }
}
