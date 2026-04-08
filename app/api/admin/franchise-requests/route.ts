/**
 * Admin Franchise Application Review API
 *
 * GET /api/admin/franchise-requests
 *   Returns all docs from the franchise_applications collection sorted by
 *   createdAt desc. Optional ?status= filter.
 *
 * Auth: super admin (mirrors /api/admin/tenants pattern).
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { errorResponse, forbiddenResponse } from '@/lib/api-response'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const idToken = authHeader?.replace('Bearer ', '')
  if (!idToken) return null
  const decodedToken = await adminAuth.verifyIdToken(idToken)
  const adminEmail = decodedToken.email || ''
  const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
  const adminData = adminDoc.data()
  if (!isSuperAdmin(adminEmail) && adminData?.role !== 'admin') return null
  return decodedToken
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyAdmin(request)
    if (!decoded) return forbiddenResponse('Admin access required')

    const status = request.nextUrl.searchParams.get('status')

    let query: FirebaseFirestore.Query = adminDb
      .collection('franchise_applications')
      .orderBy('createdAt', 'desc')

    if (status) {
      query = query.where('status', '==', status)
    }

    const snapshot = await query.get()
    const applications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ success: true, applications })
  } catch (error) {
    return errorResponse(error, { route: '/api/admin/franchise-requests', operation: 'list' })
  }
}
