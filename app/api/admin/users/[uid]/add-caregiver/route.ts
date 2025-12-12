/**
 * Admin: Add Caregiver to User
 * POST /api/admin/users/[uid]/add-caregiver
 *
 * Manually add a caregiver relationship (edge case handler)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check admin permissions
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weightlossprojectionlab@gmail.com'].includes(adminEmail.toLowerCase())

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

    // Default full permissions if none provided
    const fullPermissions = {
      viewRecords: true,
      editRecords: true,
      viewVitals: true,
      editVitals: true,
      viewMedications: true,
      editMedications: true,
      viewAppointments: true,
      editAppointments: true,
      viewDocuments: true,
      uploadDocuments: true,
      manageFamily: true,
      viewBilling: true,
      ...permissions // Override with provided permissions
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

    const memberRef = await adminDb
      .collection('users')
      .doc(accountOwnerId)
      .collection('familyMembers')
      .add(familyMemberData)

    // 2. Create patient-level records
    if (patientIds.length > 0) {
      const batch = adminDb.batch()

      for (const patientId of patientIds) {
        const patientFamilyMemberRef = adminDb
          .collection('users')
          .doc(accountOwnerId)
          .collection('patients')
          .doc(patientId)
          .collection('familyMembers')
          .doc(memberRef.id)

        batch.set(patientFamilyMemberRef, {
          userId: caregiverUserId,
          email: caregiverEmail,
          name: caregiverName || caregiverEmail.split('@')[0],
          relationship: 'family',
          permissions: fullPermissions,
          status: 'accepted',
          addedAt: acceptedAt,
          addedBy: accountOwnerId,
          lastModified: acceptedAt,
          addedByAdmin: true
        })
      }

      await batch.commit()
    }

    // 3. Add caregiverOf context to caregiver's profile
    const caregiverUserRef = adminDb.collection('users').doc(caregiverUserId)
    const caregiverDoc = await caregiverUserRef.get()
    const caregiverData = caregiverDoc.data()

    const ownerDoc = await adminDb.collection('users').doc(accountOwnerId).get()
    const ownerData = ownerDoc.data()
    const ownerName = ownerData?.name || ownerData?.displayName || ownerData?.email || 'Account Owner'

    const caregiverContext = {
      accountOwnerId,
      accountOwnerName: ownerName,
      accountOwnerEmail: ownerData?.email,
      role,
      patientsAccess: patientIds,
      permissions: fullPermissions,
      addedAt: acceptedAt,
      familyPlan: true,
      addedByAdmin: true
    }

    const existingCaregiverOf = caregiverData?.caregiverOf || []
    await caregiverUserRef.set({
      caregiverOf: [...existingCaregiverOf, caregiverContext]
    }, { merge: true })

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
        familyMemberId: memberRef.id,
        caregiverUserId,
        accountOwnerId,
        patientsCount: patientIds.length
      }
    })

  } catch (error: any) {
    console.error('Error adding caregiver:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add caregiver' },
      { status: 500 }
    )
  }
}
