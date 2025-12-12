/**
 * Admin: Update Caregiver Permissions
 * PATCH /api/admin/users/[uid]/update-caregiver
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'

export async function PATCH(
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
    const { familyMemberId, permissions } = body

    if (!familyMemberId || !permissions) {
      return NextResponse.json({ error: 'familyMemberId and permissions required' }, { status: 400 })
    }

    const updatedAt = new Date().toISOString()

    // Update family member record
    const familyMemberRef = adminDb
      .collection('users')
      .doc(accountOwnerId)
      .collection('familyMembers')
      .doc(familyMemberId)

    const familyMemberDoc = await familyMemberRef.get()
    if (!familyMemberDoc.exists) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
    }

    const familyMemberData = familyMemberDoc.data()
    const caregiverUserId = familyMemberData?.userId
    const patientsAccess = familyMemberData?.patientsAccess || []

    await familyMemberRef.update({
      permissions,
      lastModified: updatedAt,
      lastModifiedBy: adminUid,
      lastModifiedByAdmin: true
    })

    // Update patient-level records if they exist
    if (patientsAccess.length > 0) {
      const batch = adminDb.batch()

      for (const patientId of patientsAccess) {
        const patientFamilyMemberRef = adminDb
          .collection('users')
          .doc(accountOwnerId)
          .collection('patients')
          .doc(patientId)
          .collection('familyMembers')
          .doc(familyMemberId)

        batch.update(patientFamilyMemberRef, {
          permissions,
          lastModified: updatedAt
        })
      }

      await batch.commit()
    }

    // Update caregiver's caregiverOf context
    if (caregiverUserId) {
      const caregiverRef = adminDb.collection('users').doc(caregiverUserId)
      const caregiverDoc = await caregiverRef.get()
      const caregiverData = caregiverDoc.data()
      const caregiverOf = caregiverData?.caregiverOf || []

      // Find and update the matching context
      const updatedCaregiverOf = caregiverOf.map((ctx: any) => {
        if (ctx.accountOwnerId === accountOwnerId) {
          return { ...ctx, permissions }
        }
        return ctx
      })

      await caregiverRef.update({
        caregiverOf: updatedCaregiverOf
      })
    }

    // Log admin action
    await logAdminAction({
      adminUid,
      adminEmail,
      action: 'update_caregiver_permissions',
      targetType: 'user',
      targetId: accountOwnerId,
      reason: 'Updated caregiver permissions via admin panel',
      metadata: {
        familyMemberId,
        caregiverUserId,
        updatedPermissions: Object.keys(permissions).filter(k => permissions[k])
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Caregiver permissions updated successfully'
    })

  } catch (error: any) {
    console.error('Error updating caregiver:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update caregiver' },
      { status: 500 }
    )
  }
}
