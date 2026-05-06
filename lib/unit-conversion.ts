/**
 * Within-dimension unit conversion.
 *
 * Used by Phase 2c's recipe-driven auto-deduction: a recipe ingredient
 * of "2 tbsp olive oil" must convert to the inventory row's tracking
 * unit (e.g., 16 fl oz bottle) before remainingAmount can be decremented.
 *
 * Three dimensions:
 *   - volume: tsp ↔ tbsp ↔ fl oz ↔ cup ↔ pt ↔ qt ↔ gal ↔ ml ↔ l
 *   - weight: oz ↔ lbs ↔ g ↔ kg
 *   - count:  count, can, bottle, bag, package, container, head, bunch
 *
 * Cross-dimension (volume ↔ weight) requires density, which varies per
 * product (1 cup of flour ≠ 1 cup of water in grams). Skipped here.
 * Callers should fall back to count-based consume when convertUnit
 * returns null.
 *
 * Pure deterministic functions; safe to import from server or client.
 */
import type { QuantityUnit } from '@/types/shopping'

type Dimension = 'volume' | 'weight' | 'count'

/** Conversion factor: 1 unit = N base units (ml for volume, g for weight). */
const FACTORS: Record<QuantityUnit, { dim: Dimension; toBase: number }> = {
  // Volume — base ml
  ml: { dim: 'volume', toBase: 1 },
  l: { dim: 'volume', toBase: 1000 },
  tsp: { dim: 'volume', toBase: 4.92892 },
  tbsp: { dim: 'volume', toBase: 14.7868 },
  'fl oz': { dim: 'volume', toBase: 29.5735 },
  cup: { dim: 'volume', toBase: 236.588 },
  pt: { dim: 'volume', toBase: 473.176 },
  qt: { dim: 'volume', toBase: 946.353 },
  gal: { dim: 'volume', toBase: 3785.41 },

  // Weight — base g
  g: { dim: 'weight', toBase: 1 },
  kg: { dim: 'weight', toBase: 1000 },
  oz: { dim: 'weight', toBase: 28.3495 },
  lbs: { dim: 'weight', toBase: 453.592 },

  // Count — dimensionless, all 1:1 with each other
  count: { dim: 'count', toBase: 1 },
  each: { dim: 'count', toBase: 1 },
  bunch: { dim: 'count', toBase: 1 },
  head: { dim: 'count', toBase: 1 },
  bag: { dim: 'count', toBase: 1 },
  package: { dim: 'count', toBase: 1 },
  can: { dim: 'count', toBase: 1 },
  bottle: { dim: 'count', toBase: 1 },
  container: { dim: 'count', toBase: 1 },
}

/**
 * Convert `amount` from `fromUnit` to `toUnit`. Returns the converted
 * amount, or null when:
 *   - fromUnit or toUnit isn't a known QuantityUnit
 *   - the units belong to different dimensions (e.g., volume to weight)
 *
 * Same-dimension count conversions return the input as-is — semantically
 * "1 can" → "1 bottle" doesn't make physical sense but in this app the
 * count units are interchangeable scalars.
 */
export function convertUnit(
  amount: number,
  fromUnit: QuantityUnit | string | undefined,
  toUnit: QuantityUnit | string | undefined
): number | null {
  if (!fromUnit || !toUnit) return null
  const from = FACTORS[fromUnit as QuantityUnit]
  const to = FACTORS[toUnit as QuantityUnit]
  if (!from || !to) return null
  if (from.dim !== to.dim) return null
  if (from.dim === 'count') return amount
  return (amount * from.toBase) / to.toBase
}

/** True when both units exist and share a dimension. */
export function unitsCompatible(
  a: QuantityUnit | string | undefined,
  b: QuantityUnit | string | undefined
): boolean {
  if (!a || !b) return false
  const fa = FACTORS[a as QuantityUnit]
  const fb = FACTORS[b as QuantityUnit]
  return !!fa && !!fb && fa.dim === fb.dim
}

/** Returns the dimension of a unit, or null when the unit isn't known. */
export function unitDimension(unit: QuantityUnit | string | undefined): Dimension | null {
  if (!unit) return null
  return FACTORS[unit as QuantityUnit]?.dim ?? null
}
