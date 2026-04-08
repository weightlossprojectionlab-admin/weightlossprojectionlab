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
  maxSeats: number           // max staff accounts
  currentSeats: number       // active staff accounts
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
