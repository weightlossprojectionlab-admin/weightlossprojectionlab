/**
 * Admin: Get / Soft-Delete User's Patients
 * GET    /api/admin/users/[uid]/patients
 * DELETE /api/admin/users/[uid]/patients  { patientId }
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const idToken = authHeader?.replace('Bearer ', '')
  if (!idToken) return null

  const decodedToken = await adminAuth.verifyIdToken(idToken)
  const adminEmail = decodedToken.email || ''
  const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
  const adminData = adminDoc.data()
  const isSuper = isSuperAdmin(adminEmail)

  if (!isSuper && adminData?.role !== 'admin') return null
  return decodedToken
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: userId } = await params
    const decoded = await verifyAdmin(request)
    if (!decoded) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const patientsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .get()

    const patients = patientsSnapshot.docs.map(doc => {
      const d = doc.data()
      return {
        id: doc.id,
        name: d.name,
        type: d.type || 'human',
        relationship: d.relationship,
        dateOfBirth: d.dateOfBirth,
        age: d.age,
        gender: d.gender,
        photo: d.photo,
        status: d.status || 'active',
      }
    })

    return NextResponse.json({ success: true, patients })

  } catch (error: any) {
    console.error('Error fetching patients:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: userId } = await params
    const decoded = await verifyAdmin(request)
    if (!decoded) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { patientId } = await request.json()
    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 })
    }

    await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .update({
        status: 'active',
        restoredAt: new Date().toISOString(),
        restoredBy: decoded.uid,
        deletedAt: null,
        deletedBy: null,
      })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error restoring patient:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to restore patient' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: userId } = await params
    const decoded = await verifyAdmin(request)
    if (!decoded) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { patientId } = await request.json()
    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 })
    }

    await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .update({
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        deletedBy: decoded.uid,
      })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error archiving patient:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to archive patient' },
      { status: 500 }
    )
  }
}
