/**
 * Admin: Remove Caregiver from User
 * DELETE /api/admin/users/[uid]/remove-caregiver
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'

export async function DELETE(
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
    const { familyMemberId, caregiverUserId } = body

    if (!familyMemberId) {
      return NextResponse.json({ error: 'familyMemberId required' }, { status: 400 })
    }

    // Get family member data before deletion
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
    const patientsAccess = familyMemberData?.patientsAccess || []
    const actualCaregiverUserId = caregiverUserId || familyMemberData?.userId

    // Delete family member record
    await familyMemberRef.delete()

    // Delete patient-level records
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

        batch.delete(patientFamilyMemberRef)
      }

      await batch.commit()
    }

    // Remove from caregiver's caregiverOf array
    if (actualCaregiverUserId) {
      const caregiverRef = adminDb.collection('users').doc(actualCaregiverUserId)
      const caregiverDoc = await caregiverRef.get()

      if (caregiverDoc.exists) {
        const caregiverData = caregiverDoc.data()
        const caregiverOf = caregiverData?.caregiverOf || []

        // Filter out this account owner context
        const updatedCaregiverOf = caregiverOf.filter((ctx: any) => ctx.accountOwnerId !== accountOwnerId)

        await caregiverRef.update({
          caregiverOf: updatedCaregiverOf
        })
      }
    }

    // Log admin action
    await logAdminAction({
      adminUid,
      adminEmail,
      action: 'remove_caregiver',
      targetType: 'user',
      targetId: accountOwnerId,
      reason: 'Removed caregiver via admin panel',
      metadata: {
        familyMemberId,
        caregiverUserId: actualCaregiverUserId,
        caregiverEmail: familyMemberData?.email,
        caregiverName: familyMemberData?.name,
        patientsAffected: patientsAccess.length
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Caregiver removed successfully'
    })

  } catch (error: any) {
    console.error('Error removing caregiver:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove caregiver' },
      { status: 500 }
    )
  }
}
