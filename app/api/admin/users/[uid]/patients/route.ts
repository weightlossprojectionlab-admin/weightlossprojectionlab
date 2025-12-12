/**
 * Admin: Get User's Patients
 * GET /api/admin/users/[uid]/patients
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: userId } = await params

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

    // Get all patients for this user
    const patientsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .get()

    const patients = patientsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      relationship: doc.data().relationship,
      age: doc.data().age,
      gender: doc.data().gender,
      photo: doc.data().photo
    }))

    return NextResponse.json({ success: true, patients })

  } catch (error: any) {
    console.error('Error fetching patients:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}
