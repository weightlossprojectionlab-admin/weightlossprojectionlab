/**
 * Care-package pricing helpers (white-label).
 *
 * Encodes the retainer-pricing playbook as smart DEFAULTS the agency can accept
 * or override — the agency always owns the final numbers. Two supported tier
 * framings (nothing else):
 *
 *   • Core-first — the agency knows its target (Core) retainer:
 *       anchor = core × 0.6   (LOW/entry tier — NOT a high decoy)
 *       core   = core         (the target)
 *       growth = core × 1.75
 *
 *   • Floor-first — the "no budget/time to model it" shortcut, anchored on the
 *     agency's survival number:
 *       anchor = floor
 *       core   = floor × 1.7
 *       growth = floor × 3
 *
 * The Floor Number is the agency's OWN independent survival input
 * (target income × 1.4, spread across client capacity), never derived from
 * Core. Anchor is always the lowest tier; any framing that inverts that
 * (e.g. anchor = core × 1.25) is wrong.
 *
 * All money is in the smallest currency unit (cents) to avoid float drift,
 * matching TenantBilling.monthlyBaseRate. The builder converts to/from whole
 * dollars at the input edge.
 */

import type { CarePackage, CarePackageTier } from '@/types/tenant'

// ── Playbook multipliers (relative to Core) ──
export const CORE_TO_ANCHOR = 0.6
export const CORE_TO_GROWTH = 1.75

// ── Playbook multipliers (relative to Floor) ──
export const FLOOR_TO_CORE = 1.7
export const FLOOR_TO_GROWTH = 3

// Overhead multiplier applied to target income when deriving the Floor Number.
export const FLOOR_OVERHEAD_MULTIPLIER = 1.4

/** Ordered tiers, lowest → highest, with client-facing copy for smart defaults. */
export const TIER_META: Record<CarePackageTier, { label: string; blurb: string; order: number }> = {
  anchor: {
    label: 'Anchor',
    blurb: 'A low-commitment starting point to build trust.',
    order: 0,
  },
  core: {
    label: 'Core',
    blurb: 'The right fit for most families — our recommended plan.',
    order: 1,
  },
  growth: {
    label: 'Growth',
    blurb: 'Full-service care with priority access and more hands-on support.',
    order: 2,
  },
}

export const TIER_ORDER: CarePackageTier[] = ['anchor', 'core', 'growth']

/** Round cents to the nearest whole dollar so prices read cleanly. */
function roundToDollar(cents: number): number {
  return Math.round(cents / 100) * 100
}

/** Derive the three tiers from a target Core price (in cents). */
export function deriveTiersFromCore(coreCents: number): Record<CarePackageTier, number> {
  const core = Math.max(0, Math.round(coreCents))
  return {
    anchor: roundToDollar(core * CORE_TO_ANCHOR),
    core: roundToDollar(core),
    growth: roundToDollar(core * CORE_TO_GROWTH),
  }
}

/** Derive the three tiers from the agency's Floor Number (in cents). */
export function deriveTiersFromFloor(floorCents: number): Record<CarePackageTier, number> {
  const floor = Math.max(0, Math.round(floorCents))
  return {
    anchor: roundToDollar(floor),
    core: roundToDollar(floor * FLOOR_TO_CORE),
    growth: roundToDollar(floor * FLOOR_TO_GROWTH),
  }
}

/**
 * Suggest a monthly Floor Number (cents/client/month) from the agency's own
 * survival inputs: target annual income, grossed up by overhead, spread across
 * how many clients they can realistically hold, per month.
 *
 *   floor = (targetAnnualIncome × 1.4) / clientCapacity / 12
 */
export function suggestMonthlyFloorCents(input: {
  targetAnnualIncomeCents: number
  clientCapacity: number
}): number {
  const { targetAnnualIncomeCents, clientCapacity } = input
  if (!clientCapacity || clientCapacity <= 0) return 0
  const grossed = Math.max(0, targetAnnualIncomeCents) * FLOOR_OVERHEAD_MULTIPLIER
  return roundToDollar(grossed / clientCapacity / 12)
}

// ── Money formatting / conversion at the UI edge ──

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100
}

/** Format cents as a currency string, e.g. 120000 → "$1,200". */
export function formatMoney(cents: number, currency = 'usd'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(cents) / 100)
  } catch {
    // Unknown currency code — fall back to a plain dollar rendering.
    return `$${Math.round(Math.round(cents) / 100).toLocaleString('en-US')}`
  }
}

/** Sort packages for display: explicit order, then price ascending. */
export function sortPackages(packages: CarePackage[]): CarePackage[] {
  return [...packages].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.monthlyPrice - b.monthlyPrice
  })
}

/**
 * Server-side validation + normalization of an incoming package payload.
 * Returns a normalized object (sans id/timestamps) or an error string. Keeps
 * the API route thin and guarantees no undefined/NaN reaches Firestore.
 */
export function normalizePackageInput(body: any):
  | { ok: true; value: Omit<CarePackage, 'id' | 'createdAt' | 'updatedAt'> }
  | { ok: false; error: string } {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) return { ok: false, error: 'Package name is required' }
  if (name.length > 120) return { ok: false, error: 'Package name is too long' }

  const monthlyPrice =
    typeof body?.monthlyPrice === 'number' && Number.isFinite(body.monthlyPrice) && body.monthlyPrice >= 0
      ? Math.round(body.monthlyPrice)
      : NaN
  if (Number.isNaN(monthlyPrice)) return { ok: false, error: 'A valid monthly price is required' }

  const tier: CarePackageTier | undefined = TIER_ORDER.includes(body?.tier) ? body.tier : undefined

  const toStringList = (v: any): string[] =>
    Array.isArray(v)
      ? v.map(x => (typeof x === 'string' ? x.trim() : '')).filter(Boolean).slice(0, 50)
      : []

  const caps = {
    revisions: numOrUndef(body?.caps?.revisions),
    visitsPerMonth: numOrUndef(body?.caps?.visitsPerMonth),
    responseTimeHours: numOrUndef(body?.caps?.responseTimeHours),
  }
  // Drop undefined cap keys so Firestore doesn't reject them.
  const cleanCaps: Record<string, number> = {}
  for (const [k, val] of Object.entries(caps)) if (val !== undefined) cleanCaps[k] = val

  return {
    ok: true,
    value: {
      name,
      tier,
      monthlyPrice,
      currency: typeof body?.currency === 'string' && body.currency ? body.currency.toLowerCase() : 'usd',
      included: toStringList(body?.included),
      excluded: toStringList(body?.excluded),
      caps: cleanCaps,
      active: body?.active !== false, // default active
      order: typeof body?.order === 'number' && Number.isFinite(body.order) ? body.order : (tier ? TIER_META[tier].order : 99),
    },
  }
}

function numOrUndef(v: any): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined
}
