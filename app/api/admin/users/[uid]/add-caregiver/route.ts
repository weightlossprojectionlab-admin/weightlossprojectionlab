/**
 * Admin: Add Caregiver to User
 * POST /api/admin/users/[uid]/add-caregiver
 *
 * Manually add a caregiver relationship (edge case handler)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response'
import { PERMISSION_PRESETS } from '@/lib/family-permissions'
import {
  upsertCaregiverOf,
  upsertFamilyMember,
  upsertPatientFamilyMember,
} from '@/lib/caregiver-relationship'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: accountOwnerId } = await params

    // Verify admin access
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '')

    if (!idToken) {
      return unauthorizedResponse()
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check admin permissions
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuper = isSuperAdmin(adminEmail)

    if (!isSuper && adminData?.role !== 'admin') {
      return forbiddenResponse('Admin access required')
    }

    // Parse request body
    const body = await request.json()
    let {
      caregiverUserId,
      caregiverEmail,
      caregiverName,
      patientIds = [],
      permissions = {}, // Can be partial or full
      role = 'caregiver'
    } = body

    if (!caregiverEmail) {
      return NextResponse.json({ error: 'Caregiver email required' }, { status: 400 })
    }

    // Look up caregiver by email if userId not provided
    if (!caregiverUserId) {
      try {
        const caregiverRecord = await adminAuth.getUserByEmail(caregiverEmail)
        caregiverUserId = caregiverRecord.uid
      } catch (error: any) {
        return NextResponse.json({ error: `Caregiver not found: ${caregiverEmail}` }, { status: 404 })
      }
    }

    // Default full permissions if none provided.
    // Canonical schema lives in lib/family-permissions.ts so admin-add
    // writes the SAME shape as invite-accept. Previously this file
    // hardcoded an old vocabulary (viewRecords / editRecords / viewVitals
    // pairs) that the API permission checks no longer recognize — those
    // entries silently failed authorization because the API looks for
    // viewMedicalRecords / etc. Caller-supplied `permissions` still
    // overrides the preset; partial overrides merge on top.
    const fullPermissions = {
      ...PERMISSION_PRESETS.FULL_ACCESS,
      ...permissions,
    }

    const acceptedAt = new Date().toISOString()

    // 1. Create family member record
    const familyMemberData = {
      userId: caregiverUserId,
      email: caregiverEmail,
      name: caregiverName || caregiverEmail.split('@')[0],
      relationship: 'family',
      invitedBy: accountOwnerId,
      invitedAt: acceptedAt,
      acceptedAt,
      status: 'accepted',
      permissions: fullPermissions,
      notificationPreferences: {
        appointmentReminders: true,
        appointmentUpdates: true,
        vitalAlerts: true,
        medicationReminders: true,
        documentUploads: true,
        aiRecommendations: true,
        chatMessages: true,
        urgentAlerts: true,
        driverAssignmentNotifications: true,
        driverReminderDaysBefore: [7, 3, 1]
      },
      patientsAccess: patientIds,
      lastActive: acceptedAt,
      familyRole: role,
      managedBy: accountOwnerId,
      canBeEditedBy: [accountOwnerId],
      roleAssignedAt: acceptedAt,
      roleAssignedBy: adminUid,
      addedByAdmin: true,
      addedByAdminEmail: adminEmail
    }

    // 1. Idempotent upsert of the family-member record on the owner's doc.
    // Re-running admin-add for the same caregiver email no longer creates
    // duplicates — it extends the existing relationship instead.
    const familyMemberId = await upsertFamilyMember(
      accountOwnerId,
      {
        userId: caregiverUserId,
        email: caregiverEmail,
        name: caregiverName || caregiverEmail.split('@')[0],
        permissions: fullPermissions,
        patientsAccess: patientIds,
      },
      familyMemberData,
    )

    // 2. Per-patient family-member docs — keyed off the (now stable)
    // familyMemberId so subsequent calls merge into the same doc.
    for (const patientId of patientIds) {
      await upsertPatientFamilyMember(accountOwnerId, patientId, familyMemberId, {
        userId: caregiverUserId,
        email: caregiverEmail,
        name: caregiverName || caregiverEmail.split('@')[0],
        relationship: 'family',
        permissions: fullPermissions,
        status: 'accepted',
        addedAt: acceptedAt,
        addedBy: accountOwnerId,
        lastModified: acceptedAt,
        addedByAdmin: true,
      })
    }

    // 3. Add or extend caregiverOf entry on caregiver's profile.
    const ownerDoc = await adminDb.collection('users').doc(accountOwnerId).get()
    const ownerData = ownerDoc.data()
    const ownerName = ownerData?.name || ownerData?.displayName || ownerData?.email || 'Principal Owner'

    await upsertCaregiverOf(caregiverUserId, {
      accountOwnerId,
      accountOwnerName: ownerName,
      accountOwnerEmail: ownerData?.email || null,
      role,
      patientsAccess: patientIds,
      permissions: fullPermissions,
      addedAt: acceptedAt,
      familyPlan: true,
      addedByAdmin: true,
    })

    // Log admin action
    await logAdminAction({
      adminUid,
      adminEmail,
      action: 'add_caregiver_manual',
      targetType: 'user',
      targetId: accountOwnerId,
      reason: 'Manually added caregiver via admin panel',
      metadata: {
        caregiverUserId,
        caregiverEmail,
        patientIds,
        permissions: Object.keys(fullPermissions).filter(k => fullPermissions[k as keyof typeof fullPermissions])
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Caregiver added successfully',
      data: {
        familyMemberId,
        caregiverUserId,
        accountOwnerId,
        patientsCount: patientIds.length
      }
    })

  } catch (error) {
    return errorResponse(error, { route: '/api/admin/users/[uid]/add-caregiver', operation: 'add' })
  }
}
