/**
 * Individual Family Member API
 *
 * PUT /api/patients/[patientId]/family/[memberId] - Update member permissions
 * DELETE /api/patients/[patientId]/family/[memberId] - Remove member access to patient
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { familyMemberPermissionsSchema } from '@/lib/validations/medical'
import type { FamilyMember } from '@/types/medical'

export async function PUT(
  request: NextRequest,
  { params }: { params: { patientId: string; memberId: string } }
) {
  try {
    const { patientId, memberId } = params

    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Verify patient exists and user owns it
    const patientRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Patient not found or access denied' },
        { status: 404 }
      )
    }

    // Parse and validate permissions
    const body = await request.json()
    const validatedPermissions = familyMemberPermissionsSchema.parse(body.permissions)

    // Get family member
    const memberRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('familyMembers')
      .doc(memberId)

    const memberDoc = await memberRef.get()

    if (!memberDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Family member not found' },
        { status: 404 }
      )
    }

    const member = { id: memberDoc.id, ...memberDoc.data() } as FamilyMember

    // Verify member has access to this patient
    if (!member.patientsAccess.includes(patientId)) {
      return NextResponse.json(
        { success: false, error: 'Family member does not have access to this patient' },
        { status: 403 }
      )
    }

    // Update permissions
    await memberRef.update({
      permissions: validatedPermissions
    })

    const updatedMember: FamilyMember = {
      ...member,
      permissions: validatedPermissions
    }

    console.log(`Updated permissions for family member ${memberId} on patient ${patientId}`)

    return NextResponse.json({
      success: true,
      data: updatedMember,
      message: 'Permissions updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating family member permissions:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid permissions data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update permissions' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { patientId: string; memberId: string } }
) {
  try {
    const { patientId, memberId } = params

    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Verify patient exists and user owns it
    const patientRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Patient not found or access denied' },
        { status: 404 }
      )
    }

    // Get family member
    const memberRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('familyMembers')
      .doc(memberId)

    const memberDoc = await memberRef.get()

    if (!memberDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Family member not found' },
        { status: 404 }
      )
    }

    const member = { id: memberDoc.id, ...memberDoc.data() } as FamilyMember

    // Remove patient from member's access list
    const updatedPatientsAccess = member.patientsAccess.filter(id => id !== patientId)

    if (updatedPatientsAccess.length === 0) {
      // No more patients - remove family member entirely
      await memberRef.delete()
      console.log(`Removed family member ${memberId} (no remaining patient access)`)
    } else {
      // Update with remaining patients
      await memberRef.update({
        patientsAccess: updatedPatientsAccess
      })
      console.log(`Removed patient ${patientId} from family member ${memberId} access`)
    }

    return NextResponse.json({
      success: true,
      message: 'Family member access removed'
    })
  } catch (error: any) {
    console.error('Error removing family member access:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove family member' },
      { status: 500 }
    )
  }
}
