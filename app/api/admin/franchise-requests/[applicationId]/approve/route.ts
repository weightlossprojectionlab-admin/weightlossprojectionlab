/**
 * Admin Franchise Application Approval — converts to a tenant.
 *
 * POST /api/admin/franchise-requests/[applicationId]/approve
 *
 * Reads the application doc, calls the shared createTenant() helper to
 * create the tenant in Firestore (with status='pending_payment' so the
 * admin can review and click "Send Payment Link" separately), then flips
 * the application status to 'approved' and stores the new tenantId on it
 * for traceability.
 *
 * Idempotent: if the application is already approved with a tenantId,
 * return the existing tenant rather than creating a duplicate.
 *
 * Auth: super admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'
import { errorResponse, forbiddenResponse } from '@/lib/api-response'
import { createTenant, isCreateTenantError, type CreateTenantInput } from '@/lib/tenant-create'

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params
    const decoded = await verifyAdmin(request)
    if (!decoded) return forbiddenResponse('Admin access required')

    const appRef = adminDb.collection('franchise_applications').doc(applicationId)
    const appDoc = await appRef.get()
    if (!appDoc.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }
    const app = appDoc.data()!

    // Idempotency: already approved
    if (app.status === 'approved' && app.tenantId) {
      const existingTenant = await adminDb.collection('tenants').doc(app.tenantId).get()
      if (existingTenant.exists) {
        return NextResponse.json({
          success: true,
          alreadyApproved: true,
          tenantId: app.tenantId,
          tenant: { id: existingTenant.id, ...existingTenant.data() },
        })
      }
    }

    // Map application fields → createTenant input shape.
    // The application form (app/api/franchise/apply/route.ts) collects a
    // subset of the full tenant doc — we use sensible defaults for the rest.
    const input: CreateTenantInput = {
      name: app.businessName,
      slug: app.subdomain,
      adminEmail: app.email,
      adminName: app.contactName,
      legalName: app.legalName || app.businessName,
      entityType: app.entityType,
      ein: app.ein,
      stateOfIncorporation: app.stateOfIncorporation,
      website: app.website,
      phone: app.phone,
      address: app.address,
      city: app.city,
      state: app.state,
      zip: app.zip,
      contactTitle: app.contactTitle,
      billingSameAsAddress: app.billingSameAsAddress,
      billingAddress: app.billingAddress,
      billingCity: app.billingCity,
      billingState: app.billingState,
      billingZip: app.billingZip,
      billingContact: app.billingContact,
      billingEmail: app.billingEmail,
      practiceType: app.practiceType,
      licenseNumber: app.licenseNumber,
      npiNumber: app.npiNumber,
      staffCount: app.staffCount,
      familyCount: app.familyCount,
      emergencyContact: app.emergencyContact,
      expectedLaunchDate: app.expectedLaunchDate,
      leadSource: app.leadSource,
      notes: app.notes,
      billingTerm: app.billingTerm || 'monthly',
      billing: {
        plan: app.plan,
      },
      // Tenant lands in pending_payment so admin can review + click Send Payment Link
      status: 'pending_payment',
    }

    const result = await createTenant(input)
    if (isCreateTenantError(result)) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const now = new Date().toISOString()
    await appRef.update({
      status: 'approved',
      tenantId: result.id,
      reviewedBy: decoded.email,
      reviewedAt: now,
      updatedAt: now,
    })

    await logAdminAction({
      adminUid: decoded.uid,
      adminEmail: decoded.email || 'unknown',
      action: 'franchise_application_approved',
      targetType: 'tenant',
      targetId: result.id,
      tenantId: result.id,
      reason: `Approved application "${app.businessName}" → tenant ${result.data.slug}`,
      metadata: { applicationId },
    })

    logger.info('[Franchise Requests] Approved → tenant created', {
      applicationId,
      tenantId: result.id,
      slug: result.data.slug,
    })

    return NextResponse.json({
      success: true,
      tenantId: result.id,
      tenant: { id: result.id, ...result.data },
    }, { status: 201 })
  } catch (error) {
    return errorResponse(error, { route: '/api/admin/franchise-requests/[id]/approve', operation: 'approve' })
  }
}
