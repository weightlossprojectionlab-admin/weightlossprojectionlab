/**
 * Family Member Management API
 *
 * PATCH /api/family/members/:memberId - Update member role and patient access
 * DELETE /api/family/members/:memberId - Remove member from family account
 *
 * Authorization: Account Owner or Co-Admin only
 * Rate Limit: 30 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import { canAssignRole, validateRoleAssignment } from '@/lib/family-roles'
import type { FamilyRole, FamilyMember, FamilyMemberPermissions } from '@/types/medical'
import { errorResponse } from '@/lib/api-response'

interface UpdateMemberRequest {
  role?: FamilyRole
  patientsAccess?: string[]
  patientPermissions?: {
    [patientId: string]: FamilyMemberPermissions
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params

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
    return errorResponse(error, {
      route: '/api/family/members/[memberId]',
      operation: 'patch'
    })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params

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
    return errorResponse(error, {
      route: '/api/family/members/[memberId]',
      operation: 'delete'
    })
  }
}
