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
import type { Tenant, DEFAULT_TENANT_FEATURES } from '@/types/tenant'

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
    const { name, slug, adminEmail, adminName, branding, billing, features } = body

    if (!name || !slug || !adminEmail) {
      return NextResponse.json({ error: 'name, slug, and adminEmail are required' }, { status: 400 })
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' }, { status: 400 })
    }

    // Check slug uniqueness
    const existing = await adminDb.collection('tenants').where('slug', '==', slug).limit(1).get()
    if (!existing.empty) {
      return NextResponse.json({ error: `Slug "${slug}" is already taken` }, { status: 409 })
    }

    const now = new Date().toISOString()

    const tenantData: Omit<Tenant, 'id'> = {
      slug,
      name,
      status: 'active',
      branding: {
        logoUrl: branding?.logoUrl || '',
        primaryColor: branding?.primaryColor || '262 83% 58%',
        secondaryColor: branding?.secondaryColor || '217 91% 60%',
        accentColor: branding?.accentColor || '239 84% 67%',
        companyName: name,
        tagline: branding?.tagline || '',
        supportEmail: adminEmail,
        supportPhone: branding?.supportPhone || '',
        websiteUrl: branding?.websiteUrl || '',
      },
      billing: {
        plan: billing?.plan || 'starter',
        maxSeats: billing?.maxSeats || 5,
        currentSeats: 0,
        monthlyBaseRate: billing?.monthlyBaseRate || 75000,
        perSeatRate: billing?.perSeatRate || 3500,
        billingEmail: adminEmail,
        invoiceDay: 1,
        setupFeePaid: false,
        setupFeeAmount: billing?.setupFeeAmount || 300000,
      },
      contact: {
        adminName: adminName || '',
        adminEmail,
        phone: body.phone || '',
        address: body.address || '',
      },
      features: features || {
        aiCoaching: true,
        medicalRecords: true,
        mealTracking: true,
        vitalTracking: true,
        medicationManagement: true,
        appointmentScheduling: true,
        familySharing: true,
        recipeSystem: true,
        shoppingList: true,
        healthReports: true,
        maxPatientsPerUser: 10,
        maxFamiliesTotal: 100,
      },
      createdAt: now,
      updatedAt: now,
      onboardingCompleted: false,
    }

    const docRef = await adminDb.collection('tenants').add(tenantData)

    await logAdminAction({
      adminUid: decoded.uid,
      adminEmail: decoded.email || 'unknown',
      action: 'tenant_create',
      targetType: 'tenant',
      targetId: docRef.id,
      reason: `Created franchise "${name}" (${slug})`,
    })

    logger.info('[Tenants] Franchise created', { tenantId: docRef.id, slug, name })

    return NextResponse.json({
      success: true,
      tenant: { id: docRef.id, ...tenantData },
    }, { status: 201 })
  } catch (error) {
    return errorResponse(error, { route: '/api/admin/tenants', operation: 'create' })
  }
}
