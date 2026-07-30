/**
 * Multi-Tenant Franchise Types
 *
 * Defines the data model for the franchise/white-label system.
 * Each tenant is a boutique care provider (nurse, wellness coach, agency)
 * who licenses the WPL platform under their own brand.
 */

export interface TenantBranding {
  logoUrl: string
  faviconUrl?: string
  primaryColor: string      // HSL value e.g. "262 83% 58%"
  secondaryColor: string
  accentColor: string
  companyName: string
  tagline?: string
  supportEmail: string
  supportPhone?: string
  websiteUrl?: string
}

export interface TenantBilling {
  plan: 'starter' | 'professional' | 'enterprise'
  maxSeats: number           // max staff accounts (per plan)
  currentSeats: number       // active + pending staff accounts (Phase B slice 5)
  // Phase B slice 5: family-side seat counters. Count managed families
  // (consumer end users in user.managedBy) against the per-plan family cap.
  // Both optional for backward compat with tenants created before slice 5;
  // missing values are read as 0 (used) and looked up from FRANCHISE_PLANS
  // by tenant.billing.plan (max).
  currentFamilies?: number
  maxFamilies?: number
  monthlyBaseRate: number    // in cents (e.g. 75000 = $750)
  perSeatRate: number        // in cents (e.g. 3500 = $35)
  billingEmail: string
  invoiceDay: number         // day of month (1-28)
  nextInvoiceDate?: string   // ISO date
  setupFeePaid: boolean
  setupFeeAmount: number     // in cents
}

export interface TenantContact {
  adminName: string
  adminEmail: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
}

export interface TenantFeatures {
  aiCoaching: boolean
  medicalRecords: boolean
  mealTracking: boolean
  vitalTracking: boolean
  medicationManagement: boolean
  appointmentScheduling: boolean
  familySharing: boolean
  recipeSystem: boolean
  shoppingList: boolean
  healthReports: boolean
  maxPatientsPerUser: number
  maxFamiliesTotal: number
}

export interface Tenant {
  id: string
  slug: string               // subdomain: "gentletouch" (unique, indexed)
  name: string               // "Gentle Touch Care"
  status: 'active' | 'suspended' | 'canceled' | 'pending_payment' | 'paid'
  branding: TenantBranding
  billing: TenantBilling
  contact: TenantContact
  features: TenantFeatures
  createdAt: string          // ISO date
  updatedAt: string          // ISO date
  onboardingCompleted: boolean
  // Fields written by lib/tenant-create.ts but not strictly part of the
  // type yet — added as optional so consumers can read them safely.
  // TODO(types): the Firestore tenant doc still has fields not yet on this
  // interface — ein, stateOfIncorporation, staffCount, familyCount,
  // expectedLaunchDate, leadSource, notes, emergencyContact, billingAddress,
  // ownerUid, ownerProvisionedAt. Added incrementally as consumers need
  // them; the cancel page v3 (commit pending) consumes the credential
  // fields below.
  practiceType?: string
  legalName?: string
  entityType?: string
  licenseNumber?: string
  npiNumber?: string
}

/**
 * Care-package pricing (white-label). A tenant (agency) builds its own tiered
 * retainer packages to price ITS OWN clients — this is the agency's pricing of
 * its families, NOT WPL's pricing of the agency. Stored under
 * tenants/{tenantId}/carePackages/{packageId}.
 */
export type CarePackageTier = 'anchor' | 'core' | 'growth'

export interface CarePackageCaps {
  /** Scope revisions included per period (playbook: cap deliverables). */
  revisions?: number
  /** In-home / virtual visits included per month. */
  visitsPerMonth?: number
  /** Committed response time in hours. */
  responseTimeHours?: number
}

export interface CarePackage {
  id: string
  name: string
  tier?: CarePackageTier
  /** Monthly retainer price in the smallest currency unit (cents). */
  monthlyPrice: number
  currency: string           // ISO 4217 lower-case, e.g. 'usd'
  /** What the family gets (playbook: concrete, capped deliverables). */
  included: string[]
  /** Explicitly out of scope (playbook: write "Not included" first). */
  excluded: string[]
  caps: CarePackageCaps
  active: boolean
  /** Display order (anchor → core → growth). */
  order: number
  createdAt: string          // ISO date
  updatedAt: string          // ISO date
}

/**
 * A generated, client-facing proposal. Freezes the tiers at generation time
 * (packagesSnapshot) so later edits to a package never mutate an already-sent
 * proposal. `tenantId` is stored so the collection-group share-token lookup can
 * resolve the tenant's branding server-side. Stored in the TOP-LEVEL
 * `proposals` collection, keyed by shareToken (the doc id) so the public page
 * resolves it with an O(1) direct get — no collection-group index needed.
 */
export interface ProposalRecord {
  id: string
  tenantId: string
  /** Optional link to the agency's family/client this was built for. */
  familyId?: string
  /** Free-text client name shown on the proposal header. */
  clientName?: string
  packagesSnapshot: CarePackage[]
  /** Unguessable token in the public share URL. */
  shareToken: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted'
  createdAt: string          // ISO date
  createdBy: string          // uid
}

/** Role within a franchise tenant */
export type TenantRole = 'franchise_admin' | 'staff' | 'user'

/** Invitation to join a franchise */
export interface TenantInvitation {
  id: string
  tenantId: string
  email: string
  role: TenantRole
  invitedBy: string          // uid of inviter
  inviterName?: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  createdAt: string
  expiresAt: string
  acceptedAt?: string
}

/** Default features for new tenants */
export const DEFAULT_TENANT_FEATURES: TenantFeatures = {
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
}

/** Default branding (WPL colors) for new tenants before customization */
export const DEFAULT_TENANT_BRANDING: TenantBranding = {
  logoUrl: '',
  primaryColor: '262 83% 58%',
  secondaryColor: '217 91% 60%',
  accentColor: '239 84% 67%',
  companyName: '',
  supportEmail: '',
}
