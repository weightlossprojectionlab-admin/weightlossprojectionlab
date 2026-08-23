/**
 * Agency rate card + visit estimate derivation (agency-side / tenant config).
 *
 * A tenant's rate card prices each duty category NOT covered by the family's
 * CarePackage. Defaults ship here (DEFAULT_RATE_CARD, seeded from market
 * research — TaskRabbit / Angi / Merry Maids brackets), so a new agency has a
 * working baseline out of the gate; a tenant may override per market.
 *
 * The estimate is a PURE, deterministic function of (tasks, rate card, package
 * coverage) — a data invariant, unit-tested here rather than in the browser.
 *
 * Money is in the smallest currency unit (cents), matching
 * CarePackage.monthlyPrice — one representation, no float drift.
 */

import type { DutyCategory } from '@/types/household-duties'
import type { PricingUnit, RateCardItem } from '@/types/tenant'

/**
 * Market-benchmark defaults, per DutyCategory. Rates in cents.
 * `requiresCareTier` marks the liability/clinical categories a "care-certified"
 * tier may mark up (personal care, meds, transport).
 */
export const DEFAULT_RATE_CARD: RateCardItem[] = [
  { category: 'cleaning_bedroom',       unit: 'hourly',   defaultRate: 4200, rateRange: [3500, 5000], requiresCareTier: false },
  { category: 'cleaning_living_areas',  unit: 'hourly',   defaultRate: 4200, rateRange: [3500, 5000], requiresCareTier: false },
  { category: 'cleaning_bathroom',      unit: 'hourly',   defaultRate: 5000, rateRange: [4000, 6000], requiresCareTier: false },
  { category: 'cleaning_kitchen',       unit: 'hourly',   defaultRate: 5000, rateRange: [4000, 6000], requiresCareTier: false },
  { category: 'laundry',                unit: 'per_unit', defaultRate: 1800, rateRange: [1000, 2500], requiresCareTier: false },
  { category: 'yard_work',              unit: 'hourly',   defaultRate: 4200, rateRange: [3500, 5000], requiresCareTier: false },
  { category: 'shopping',               unit: 'hourly',   defaultRate: 3500, rateRange: [3000, 4000], requiresCareTier: false },
  { category: 'grocery_shopping',       unit: 'hourly',   defaultRate: 3500, rateRange: [3000, 4000], requiresCareTier: false },
  { category: 'medication_pickup',      unit: 'flat',     defaultRate: 3500, rateRange: [3000, 4000], requiresCareTier: true  },
  { category: 'transportation',         unit: 'hourly',   defaultRate: 4200, rateRange: [3500, 5000], requiresCareTier: true  },
  { category: 'personal_care',          unit: 'hourly',   defaultRate: 3800, rateRange: [3000, 4500], requiresCareTier: true  },
  { category: 'meal_preparation',       unit: 'hourly',   defaultRate: 3800, rateRange: [3000, 4500], requiresCareTier: false },
  { category: 'pet_care',               unit: 'flat',     defaultRate: 2800, rateRange: [2000, 3500], requiresCareTier: false },
  { category: 'custom',                 unit: 'hourly',   defaultRate: 0,    rateRange: [0, 20000],   requiresCareTier: false },
]

/** The tenant's rate card, or the shipped defaults when they haven't customized. */
export function getRateCard(tenantRateCard?: RateCardItem[] | null): RateCardItem[] {
  return tenantRateCard && tenantRateCard.length > 0 ? tenantRateCard : DEFAULT_RATE_CARD
}

// ─── Estimate derivation ───────────────────────────────────────────────────

export interface EstimateTask {
  category: DutyCategory
  /** Hours (hourly) or count (flat / per_unit / mileage). Defaults to 1. */
  quantity?: number
  /** Goods (grocery) or mileage cost, in cents — pass-through, ALWAYS billed
   *  (the family pays for their own groceries regardless of plan). */
  passThroughCents?: number
}

export interface EstimateOptions {
  /** Categories the family's active package covers — labor billed at $0. */
  includedCategories?: DutyCategory[]
  /** Multiplier (>1) applied to requiresCareTier categories when the agency's
   *  care-certified tier is active. Defaults to 1 (no premium). */
  careTierMultiplier?: number
}

export interface EstimateLine {
  category: DutyCategory
  unit: PricingUnit
  covered: boolean
  /** Effective per-unit rate in cents after any care-tier premium. */
  rateCents: number
  /** Hours or units billed (1 for flat). */
  quantity: number
  /** Labor billed to the family (0 when covered by the plan). */
  laborCents: number
  /** Goods / mileage — always billed. */
  passThroughCents: number
  /** laborCents + passThroughCents. */
  totalCents: number
}

export interface VisitEstimate {
  lines: EstimateLine[]
  /** Labor the plan absorbed this visit (informational — the "included" value). */
  coveredValueCents: number
  /** Labor billed on top of the plan (à-la-carte / overage). */
  billableLaborCents: number
  /** Pass-through (groceries, mileage) — always billed. */
  passThroughCents: number
  /** What the family pays this visit = billableLabor + passThrough. */
  totalBillableCents: number
}

/**
 * Deterministically estimate a visit from its task list, the rate card, and the
 * family's package coverage. Covered categories bill $0 labor (included in the
 * retainer); everything else is priced off the rate card by its unit.
 */
export function estimateVisit(
  tasks: EstimateTask[],
  rateCard: RateCardItem[],
  opts: EstimateOptions = {}
): VisitEstimate {
  const included = new Set(opts.includedCategories ?? [])
  const careMult =
    opts.careTierMultiplier && opts.careTierMultiplier > 0 ? opts.careTierMultiplier : 1
  const byCat = new Map(rateCard.map(r => [r.category, r]))

  const lines: EstimateLine[] = tasks.map(t => {
    const item = byCat.get(t.category)
    const unit: PricingUnit = item?.unit ?? 'flat'
    const baseRate = item?.defaultRate ?? 0
    const rateCents = item?.requiresCareTier ? Math.round(baseRate * careMult) : baseRate
    const quantity = t.quantity != null && t.quantity >= 0 ? t.quantity : 1
    const covered = included.has(t.category)
    const laborCents = covered ? 0 : Math.round(rateCents * quantity)
    const passThroughCents =
      t.passThroughCents && t.passThroughCents > 0 ? Math.round(t.passThroughCents) : 0
    return {
      category: t.category,
      unit,
      covered,
      rateCents,
      quantity,
      laborCents,
      passThroughCents,
      totalCents: laborCents + passThroughCents,
    }
  })

  const coveredValueCents = lines.reduce(
    (s, l) => s + (l.covered ? Math.round(l.rateCents * l.quantity) : 0),
    0
  )
  const billableLaborCents = lines.reduce((s, l) => s + l.laborCents, 0)
  const passThroughCents = lines.reduce((s, l) => s + l.passThroughCents, 0)

  return {
    lines,
    coveredValueCents,
    billableLaborCents,
    passThroughCents,
    totalBillableCents: billableLaborCents + passThroughCents,
  }
}
