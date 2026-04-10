/**
 * Franchise Plan Data — single source of truth.
 *
 * Used by:
 *  - app/franchise/page.tsx (marketing pricing section)
 *  - app/franchise/apply/page.tsx (application form plan picker)
 *  - app/api/admin/tenants/[tenantId]/payment-link/route.ts (setup fee amount)
 */

export interface FranchisePlan {
  id: 'starter' | 'professional' | 'enterprise'
  name: string
  monthlyBase: number      // USD
  perSeat: number          // USD
  maxSeats: number         // -1 = unlimited
  maxClients: number       // -1 = unlimited
  ai: string
  support: string
  popular: boolean
}

export const FRANCHISE_PLANS: FranchisePlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyBase: 750,
    perSeat: 35,
    maxSeats: 5,
    maxClients: 50,
    ai: 'Basic AI',
    support: 'Email support',
    popular: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyBase: 1250,
    perSeat: 35,
    maxSeats: 15,
    maxClients: 200,
    ai: 'Full AI Suite',
    support: 'Priority support',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyBase: 2000,
    perSeat: 25,
    maxSeats: -1,
    maxClients: -1,
    ai: 'Full AI Suite',
    support: 'Dedicated account manager',
    popular: false,
  },
]

/**
 * Look up the seat limits for a plan id. Used by Phase B slice 5 seat
 * counters when the tenant doc doesn't have a snapshotted limit yet
 * (older tenants created before currentFamilies/maxFamilies were added).
 *
 * Returns staff seat limit and family seat limit. -1 means unlimited
 * (matches the FRANCHISE_PLANS convention).
 */
export function getPlanLimits(
  planId: string | undefined
): { maxSeats: number; maxFamilies: number } {
  const plan = FRANCHISE_PLANS.find(p => p.id === planId) || FRANCHISE_PLANS[0]
  return { maxSeats: plan.maxSeats, maxFamilies: plan.maxClients }
}

/** One-time setup fee charged at franchise activation, in USD. */
export const SETUP_FEE_USD = 3000

/** Setup fee in cents — for Stripe Price creation. */
export const SETUP_FEE_CENTS = SETUP_FEE_USD * 100

/** Annual billing discount, as a percentage. */
export const ANNUAL_DISCOUNT_PCT = 15

/**
 * Canonical list of practice types prospects can select on the franchise
 * application form. Single source of truth — referenced by:
 *  - app/franchise/apply/page.tsx (radio buttons in the application form)
 *  - app/franchise/payment-cancelled/page.tsx (personalized re-engagement
 *    value-prop block keyed by this list)
 *  - the FranchisePracticeType type union below for compile-time safety
 *
 * "Other" is intentionally NOT in this array because it's a special form
 * branch that lets the prospect type a free-text description. Anywhere
 * that needs to handle "Other" should treat any value not in this array
 * as the fallback case.
 */
export const FRANCHISE_PRACTICE_TYPES = [
  'Solo Nurse / Caregiver',
  'Wellness Coach',
  'Concierge Doctor',
  'Home Care Agency',
  'Patient Advocate',
] as const

export type FranchisePracticeType = (typeof FRANCHISE_PRACTICE_TYPES)[number]
