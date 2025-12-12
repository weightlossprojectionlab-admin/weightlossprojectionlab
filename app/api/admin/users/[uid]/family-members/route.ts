/**
 * Admin: Get User's Family Members
 * GET /api/admin/users/[uid]/family-members
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: accountOwnerId } = await params

    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '')

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminEmail = decodedToken.email || ''

    const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weightlossprojectionlab@gmail.com'].includes(adminEmail.toLowerCase())

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

  } catch (error: any) {
    console.error('Error fetching family members:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch family members' },
      { status: 500 }
    )
  }
}
