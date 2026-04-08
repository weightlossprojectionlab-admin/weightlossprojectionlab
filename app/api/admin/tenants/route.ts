/**
 * Admin Tenant Management API
 * GET  /api/admin/tenants — list all tenants
 * POST /api/admin/tenants — create a new tenant/franchise
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'
import { errorResponse, forbiddenResponse, unauthorizedResponse } from '@/lib/api-response'
import { createTenant, isCreateTenantError } from '@/lib/tenant-create'

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

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyAdmin(request)
    if (!decoded) return forbiddenResponse('Admin access required')

    const snapshot = await adminDb.collection('tenants').orderBy('createdAt', 'desc').get()

    const tenants = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ success: true, tenants })
  } catch (error) {
    return errorResponse(error, { route: '/api/admin/tenants', operation: 'list' })
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = await verifyAdmin(request)
    if (!decoded) return forbiddenResponse('Admin access required')

    const body = await request.json()
    const result = await createTenant(body)

    if (isCreateTenantError(result)) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    await logAdminAction({
      adminUid: decoded.uid,
      adminEmail: decoded.email || 'unknown',
      action: 'tenant_create',
      targetType: 'tenant',
      targetId: result.id,
      tenantId: result.id,
      reason: `Created franchise "${result.data.name}" (${result.data.slug})`,
    })

    logger.info('[Tenants] Franchise created', { tenantId: result.id, slug: result.data.slug, name: result.data.name })

    return NextResponse.json({
      success: true,
      tenant: { id: result.id, ...result.data },
    }, { status: 201 })
  } catch (error) {
    return errorResponse(error, { route: '/api/admin/tenants', operation: 'create' })
  }
}
