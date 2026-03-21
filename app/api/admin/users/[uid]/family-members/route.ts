/**
 * Admin: Get User's Family Members
 * GET /api/admin/users/[uid]/family-members
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: accountOwnerId } = await params

    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '')

    if (!idToken) {
      return unauthorizedResponse()
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminEmail = decodedToken.email || ''

    const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    const adminData = adminDoc.data()
    const isSuper = isSuperAdmin(adminEmail)

    if (!isSuper && adminData?.role !== 'admin') {
      return forbiddenResponse('Admin access required')
    }

    // Get all family members for this user
    const familyMembersSnapshot = await adminDb
      .collection('users')
      .doc(accountOwnerId)
      .collection('familyMembers')
      .get()

    const familyMembers = familyMembersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json({ success: true, familyMembers })

  } catch (error) {
    return errorResponse(error, { route: '/api/admin/users/[uid]/family-members', operation: 'fetch' })
  }
}
