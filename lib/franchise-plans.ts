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

/** One-time setup fee charged at franchise activation, in USD. */
export const SETUP_FEE_USD = 3000

/** Setup fee in cents — for Stripe Price creation. */
export const SETUP_FEE_CENTS = SETUP_FEE_USD * 100

/** Annual billing discount, as a percentage. */
export const ANNUAL_DISCOUNT_PCT = 15
