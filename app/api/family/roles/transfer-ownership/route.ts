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
      logger.error('[API /family/roles/transfer-ownership POST] Token verification failed', error as Error)
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const currentOwnerUserId = decodedToken.uid

    // Step 2: Strict rate limiting (this is a critical operation)
    const rateLimitResult = await strictRateLimit.limit(currentOwnerUserId)
    if (!rateLimitResult.success) {
      logger.warn('[API /family/roles/transfer-ownership POST] Rate limit exceeded', { currentOwnerUserId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Step 3: Verify requester is Account Owner
    const currentOwnerDoc = await adminDb.collection('users').doc(currentOwnerUserId).get()
    if (!currentOwnerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    const currentOwnerData = currentOwnerDoc.data()
    const isCurrentOwner = currentOwnerData?.preferences?.isAccountOwner === true

    if (!isCurrentOwner) {
      logger.warn('[API /family/roles/transfer-ownership POST] User is not Account Owner', {
        currentOwnerUserId
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'Only the current Account Owner can transfer ownership'
        },
        { status: 403 }
      )
    }

    // Step 4: Parse request body
    const body: TransferOwnershipRequest = await request.json()
    const { newOwnerFamilyMemberId, confirmed, confirmationMessage } = body

    if (!newOwnerFamilyMemberId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: newOwnerFamilyMemberId' },
        { status: 400 }
      )
    }

    // Step 5: Require explicit confirmation
    if (!confirmed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Confirmation required',
          message: 'Transferring Account Owner status is a permanent action that cannot be undone without the new owner\'s cooperation. You will lose all administrative privileges. The new owner will have full control over the family account and can remove you. Please confirm you understand these consequences.',
          requiresConfirmation: true
        },
        { status: 400 }
      )
    }

    logger.debug('[API /family/roles/transfer-ownership POST] Processing ownership transfer', {
      currentOwnerUserId,
      newOwnerFamilyMemberId,
      confirmationMessage
    })

    // Step 6: Find the new owner's family member document
    const newOwnerFamilyMemberDoc = await adminDb
      .collection('users')
      .doc(currentOwnerUserId)
      .collection('familyMembers')
      .doc(newOwnerFamilyMemberId)
      .get()

    if (!newOwnerFamilyMemberDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Family member not found' },
        { status: 404 }
      )
    }

    const newOwnerFamilyMemberData = newOwnerFamilyMemberDoc.data() as FamilyMember

    // Step 7: Validate new owner
    if (newOwnerFamilyMemberData.status !== 'accepted') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid new owner',
          message: 'The new owner must be an accepted family member'
        },
        { status: 400 }
      )
    }

    const newOwnerUserId = newOwnerFamilyMemberData.userId
    if (!newOwnerUserId) {
      return NextResponse.json(
        { success: false, error: 'Family member has no associated user account' },
        { status: 400 }
      )
    }

    // Step 8: Check if new owner has a user profile
    const newOwnerUserDoc = await adminDb.collection('users').doc(newOwnerUserId).get()
    if (!newOwnerUserDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'New owner has no user profile',
          message: 'The new owner must have an active user account'
        },
        { status: 400 }
      )
    }

    // Step 9: Begin transaction-like updates (using batch)
    const batch = adminDb.batch()

    // 9a. Update old owner's user document (remove Account Owner status)
    const oldOwnerUpdateData = {
      'preferences.isAccountOwner': false,
      'preferences.accountOwnerSince': null
    }
    batch.update(currentOwnerDoc.ref, oldOwnerUpdateData)

    // 9b. Update new owner's user document (set Account Owner status)
    const newOwnerUpdateData = {
      'preferences.isAccountOwner': true,
      'preferences.accountOwnerSince': new Date().toISOString()
    }
    batch.update(newOwnerUserDoc.ref, newOwnerUpdateData)

    // 9c. Update new owner's family member role to account_owner
    const newOwnerFamilyMemberUpdateData = {
      familyRole: 'account_owner' as const,
      roleAssignedAt: new Date().toISOString(),
      roleAssignedBy: currentOwnerUserId,
      permissions: getDefaultPermissionsForRole('account_owner'),
      canBeEditedBy: [] // Account Owners cannot be edited
    }
    batch.update(newOwnerFamilyMemberDoc.ref, newOwnerFamilyMemberUpdateData)

    // 9d. Create audit log
    const auditLogRef = adminDb.collection('auditLogs').doc()
    batch.set(auditLogRef, {
      type: 'account_ownership_transfer',
      previousOwnerId: currentOwnerUserId,
      newOwnerId: newOwnerUserId,
      familyMemberId: newOwnerFamilyMemberId,
      transferredBy: currentOwnerUserId,
      confirmed: true,
      confirmationMessage: confirmationMessage || null,
      timestamp: new Date().toISOString(),
      metadata: {
        previousOwnerEmail: currentOwnerData?.email,
        newOwnerName: newOwnerFamilyMemberData.name,
        newOwnerEmail: newOwnerFamilyMemberData.email
      }
    })

    // 9e. Create notification for new owner
    const notificationRef = adminDb.collection('users').doc(newOwnerUserId).collection('notifications').doc()
    batch.set(notificationRef, {
      type: 'ownership_transferred',
      title: 'You are now the Account Owner',
      message: `${currentOwnerData?.name || 'A family member'} has transferred Account Owner status to you. You now have full control over the family account.`,
      fromUserId: currentOwnerUserId,
      fromUserName: currentOwnerData?.name || 'Unknown',
      read: false,
      createdAt: new Date().toISOString(),
      actionRequired: false,
      priority: 'high'
    })

    // Commit all changes
    await batch.commit()

    logger.info('[API /family/roles/transfer-ownership POST] Ownership transferred successfully', {
      previousOwnerId: currentOwnerUserId,
      newOwnerId: newOwnerUserId,
      familyMemberId: newOwnerFamilyMemberId
    })

    // Step 10: Return success response
    return NextResponse.json({
      success: true,
      message: 'Account ownership transferred successfully',
      data: {
        previousOwnerId: currentOwnerUserId,
        newOwnerId: newOwnerUserId,
        newOwnerName: newOwnerFamilyMemberData.name,
        newOwnerEmail: newOwnerFamilyMemberData.email,
        transferredAt: new Date().toISOString()
      }
    })
  } catch (error: any) {
    logger.error('[API /family/roles/transfer-ownership POST] Error transferring ownership', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to transfer ownership' },
      { status: 500 }
    )
  }
}
