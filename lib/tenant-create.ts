/**
 * Tenant (Franchise) Creation — single source of truth.
 *
 * Used by:
 *  - app/api/admin/tenants/route.ts POST   (admin manual create form)
 *  - app/api/admin/franchise-requests/[id]/approve/route.ts (approve a public application)
 *
 * Validates inputs, enforces slug uniqueness, builds the canonical tenant doc
 * shape, writes to Firestore, and returns the new tenant ID + data. Does NOT
 * audit-log — callers do that with their own action labels.
 */

import { adminDb } from '@/lib/firebase-admin'

export interface CreateTenantInput {
  // Required
  name: string
  slug: string
  adminEmail: string

  // Optional — all fields the public application form / admin form may supply
  status?: 'pending' | 'pending_payment' | 'paid' | 'active' | 'suspended' | 'canceled'
  legalName?: string
  entityType?: string
  ein?: string
  stateOfIncorporation?: string

  branding?: {
    logoUrl?: string
    primaryColor?: string
    secondaryColor?: string
    accentColor?: string
    tagline?: string
    supportPhone?: string
    websiteUrl?: string
  }
  website?: string

  billing?: {
    plan?: 'starter' | 'professional' | 'enterprise'
    maxSeats?: number
    monthlyBaseRate?: number
    perSeatRate?: number
    billingEmail?: string
    setupFeeAmount?: number
  }
  billingTerm?: 'monthly' | 'annual'

  adminName?: string
  contactTitle?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string

  billingSameAsAddress?: boolean
  billingAddress?: string
  billingCity?: string
  billingState?: string
  billingZip?: string
  billingContact?: string
  billingEmail?: string

  practiceType?: string
  licenseNumber?: string
  npiNumber?: string
  staffCount?: string
  familyCount?: number
  emergencyContact?: { name?: string; email?: string; phone?: string }

  expectedLaunchDate?: string
  leadSource?: string
  notes?: string

  features?: Record<string, any>
}

export interface CreateTenantResult {
  id: string
  data: Record<string, any>
}

export interface CreateTenantError {
  error: string
  status: number
}

const SLUG_PATTERN = /^[a-z0-9-]+$/

/**
 * Validate input and create a tenant doc. Caller is responsible for
 * authentication and audit logging.
 *
 * Returns either { id, data } on success or { error, status } on validation
 * failure / conflict. Throws on unexpected errors (caller should catch).
 */
export async function createTenant(
  body: CreateTenantInput
): Promise<CreateTenantResult | CreateTenantError> {
  const { name, slug, adminEmail } = body

  if (!name || !slug || !adminEmail) {
    return { error: 'name, slug, and adminEmail are required', status: 400 }
  }
  if (!SLUG_PATTERN.test(slug)) {
    return { error: 'Slug must be lowercase letters, numbers, and hyphens only', status: 400 }
  }

  const existing = await adminDb.collection('tenants').where('slug', '==', slug).limit(1).get()
  if (!existing.empty) {
    return { error: `Slug "${slug}" is already taken`, status: 409 }
  }

  const now = new Date().toISOString()

  const tenantData = {
    slug,
    name,
    status: body.status || 'pending_payment',
    // Legal
    legalName: body.legalName || name,
    entityType: body.entityType || '',
    ein: body.ein || '',
    stateOfIncorporation: body.stateOfIncorporation || '',
    // Branding
    branding: {
      logoUrl: body.branding?.logoUrl || '',
      primaryColor: body.branding?.primaryColor || '262 83% 58%',
      secondaryColor: body.branding?.secondaryColor || '217 91% 60%',
      accentColor: body.branding?.accentColor || '239 84% 67%',
      companyName: name,
      tagline: body.branding?.tagline || '',
      supportEmail: adminEmail,
      supportPhone: body.branding?.supportPhone || '',
      websiteUrl: body.website || body.branding?.websiteUrl || '',
    },
    // Billing
    billing: {
      plan: body.billing?.plan || 'starter',
      maxSeats: body.billing?.maxSeats || 5,
      currentSeats: 0,
      monthlyBaseRate: body.billing?.monthlyBaseRate || 75000,
      perSeatRate: body.billing?.perSeatRate || 3500,
      billingEmail: body.billing?.billingEmail || adminEmail,
      invoiceDay: 1,
      setupFeePaid: false,
      setupFeeAmount: body.billing?.setupFeeAmount || 300000,
      billingTerm: body.billingTerm || 'monthly',
    },
    // Contact
    contact: {
      adminName: body.adminName || '',
      adminEmail,
      contactTitle: body.contactTitle || '',
      phone: body.phone || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      zip: body.zip || '',
    },
    // Billing address
    billingAddress: {
      sameAsAddress: body.billingSameAsAddress !== false,
      address: body.billingAddress || body.address || '',
      city: body.billingCity || body.city || '',
      state: body.billingState || body.state || '',
      zip: body.billingZip || body.zip || '',
      contact: body.billingContact || body.adminName || '',
      email: body.billingEmail || adminEmail,
    },
    // Practice
    practiceType: body.practiceType || '',
    licenseNumber: body.licenseNumber || '',
    npiNumber: body.npiNumber || '',
    staffCount: body.staffCount || '',
    familyCount: body.familyCount || 0,
    emergencyContact: body.emergencyContact || { name: '', email: '', phone: '' },
    // Additional
    expectedLaunchDate: body.expectedLaunchDate || '',
    leadSource: body.leadSource || '',
    notes: body.notes || '',
    // Features
    features: body.features || {
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

  return { id: docRef.id, data: tenantData }
}

/** Type guard so callers can switch on the result. */
export function isCreateTenantError(
  result: CreateTenantResult | CreateTenantError
): result is CreateTenantError {
  return (result as CreateTenantError).error !== undefined
}
