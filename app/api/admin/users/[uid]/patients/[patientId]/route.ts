/**
 * Admin: Update a specific patient
 * PATCH /api/admin/users/[uid]/patients/[patientId]
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { logAdminAction } from '@/lib/admin/audit'
import { errorResponse, forbiddenResponse } from '@/lib/api-response'

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; patientId: string }> }
) {
  try {
    const { uid: userId, patientId } = await params
    const decoded = await verifyAdmin(request)
    if (!decoded) return forbiddenResponse('Admin access required')

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const trimmedName = name.trim()

    const patientRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()
    if (!patientDoc.exists) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    await patientRef.update({
      name: trimmedName,
      lastModified: new Date().toISOString(),
    })

    await logAdminAction({
      adminUid: decoded.uid,
      adminEmail: decoded.email || 'unknown',
      action: 'patient_update_name',
      targetType: 'patient',
      targetId: patientId,
      reason: `Patient name updated to "${trimmedName}" via admin panel (owner: ${userId})`,
    })

    return NextResponse.json({ success: true, name: trimmedName })
  } catch (error) {
    return errorResponse(error, { route: '/api/admin/users/[uid]/patients/[patientId]', operation: 'update' })
  }
}
