/**
 * Account Ownership Transfer API
 *
 * POST /api/family/roles/transfer-ownership - Transfer Account Owner status to another family member
 *
 * Authorization: Current Account Owner only
 * Rate Limit: 10 requests per minute (strict)
 *
 * This is a critical operation that:
 * 1. Removes Account Owner status from current owner
 * 2. Grants Account Owner status to new owner
 * 3. Updates family member roles accordingly
 * 4. Creates audit logs
 * 5. Sends notification to new owner
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { strictRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import { isAccountOwner, getDefaultPermissionsForRole } from '@/lib/family-roles'
import type { FamilyMember } from '@/types/medical'
import { errorResponse } from '@/lib/api-response'

interface TransferOwnershipRequest {
  newOwnerFamilyMemberId: string
  confirmed: boolean // Must be true
  confirmationMessage?: string // Optional confirmation text
}

export async function POST(request: NextRequest) {
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
    return errorResponse(error, {
      route: '/api/family/roles/transfer-ownership',
      operation: 'create'
    })
  }
}
