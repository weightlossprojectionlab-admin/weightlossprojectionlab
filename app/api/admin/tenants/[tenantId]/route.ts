/**
 * Admin Tenant Detail API
 * GET    /api/admin/tenants/[tenantId] — get tenant details
 * PUT    /api/admin/tenants/[tenantId] — update tenant
 * DELETE /api/admin/tenants/[tenantId] — delete tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const decoded = await verifyAdmin(request)
    if (!decoded) return forbiddenResponse('Admin access required')

    const doc = await adminDb.collection('tenants').doc(tenantId).get()
    if (!doc.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get user count for this tenant
    const usersSnapshot = await adminDb.collection('users')
      .where('tenantId', '==', tenantId)
      .get()

    const users = usersSnapshot.docs.map(d => ({
      uid: d.id,
      email: d.data().email,
      name: d.data().name || d.data().displayName,
      tenantRole: d.data().tenantRole,
      createdAt: d.data().createdAt,
    }))

    return NextResponse.json({
      success: true,
      tenant: { id: doc.id, ...doc.data() },
      users,
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/admin/tenants/[tenantId]', operation: 'get' })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const decoded = await verifyAdmin(request)
    if (!decoded) return forbiddenResponse('Admin access required')

    const body = await request.json()
    const docRef = adminDb.collection('tenants').doc(tenantId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // If slug is being changed, check uniqueness
    if (body.slug && body.slug !== doc.data()?.slug) {
      const existing = await adminDb.collection('tenants').where('slug', '==', body.slug).limit(1).get()
      if (!existing.empty) {
        return NextResponse.json({ error: `Slug "${body.slug}" is already taken` }, { status: 409 })
      }
    }

    const updates = {
      ...body,
      updatedAt: new Date().toISOString(),
    }

    // Don't allow overwriting certain fields
    delete updates.id
    delete updates.createdAt

    await docRef.update(updates)

    await logAdminAction({
      adminUid: decoded.uid,
      adminEmail: decoded.email || 'unknown',
      action: 'tenant_update',
      targetType: 'tenant',
      targetId: tenantId,
      reason: `Updated franchise "${doc.data()?.name}"`,
    })

    const updated = await docRef.get()

    return NextResponse.json({
      success: true,
      tenant: { id: updated.id, ...updated.data() },
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/admin/tenants/[tenantId]', operation: 'update' })
  }
}
