/**
 * Unit Conversion Utility
 *
 * Converts between different units of measurement for quantity comparison
 * Supports weight, volume, and count-based units
 *
 * Examples:
 * ```typescript
 * // Convert 2 lbs to oz
 * convertUnit(2, 'lbs', 'oz') // Returns 32
 *
 * // Compare quantities
 * compareQuantities(2, 'lbs', 32, 'oz') // Returns 0 (equal)
 *
 * // Check if we have enough
 * hasEnough(2, 'lbs', 1.5, 'lbs') // Returns false
 *
 * // Calculate deficit
 * calculateDeficit(2, 'lbs', 1.5, 'lbs') // Returns { quantity: 0.5, unit: 'lbs' }
 * ```
 */

import type { QuantityUnit } from '@/types/shopping'

/**
 * Unit types for conversion compatibility
 */
type UnitType = 'weight' | 'volume' | 'count' | 'unknown'

/**
 * Base units for normalization
 */
const BASE_UNITS = {
  weight: 'oz' as const,  // Ounces as base for weight
  volume: 'ml' as const,  // Milliliters as base for volume
  count: 'count' as const // Count as base for countable items
}

/**
 * Conversion factors to base units
 */
const WEIGHT_CONVERSIONS: Record<string, number> = {
  // To ounces
  'oz': 1,
  'lbs': 16,      // 1 lb = 16 oz
  'g': 0.035274,  // 1 g = 0.035274 oz
  'kg': 35.274    // 1 kg = 35.274 oz
}

const VOLUME_CONVERSIONS: Record<string, number> = {
  // To milliliters
  'ml': 1,
  'l': 1000,           // 1 L = 1000 ml
  'tsp': 4.92892,      // 1 tsp = 4.929 ml
  'tbsp': 14.7868,     // 1 tbsp = 14.787 ml
  'fl oz': 29.5735,    // 1 fl oz = 29.574 ml
  'cup': 236.588,      // 1 cup = 236.588 ml
  'pt': 473.176,       // 1 pt = 473.176 ml
  'qt': 946.353,       // 1 qt = 946.353 ml
  'gal': 3785.41       // 1 gal = 3785.41 ml
}

/**
 * Get the type of a unit
 */
export function getUnitType(unit?: QuantityUnit): UnitType {
  if (!unit) return 'count'

  if (unit in WEIGHT_CONVERSIONS) return 'weight'
  if (unit in VOLUME_CONVERSIONS) return 'volume'

  // Count-based units
  const countUnits: QuantityUnit[] = [
    'count', 'bunch', 'head', 'bag', 'package', 'can', 'bottle', 'container'
  ]
  if (countUnits.includes(unit)) return 'count'

  return 'unknown'
}

/**
 * Check if two units are compatible for conversion
 */
export function areUnitsCompatible(unit1?: QuantityUnit, unit2?: QuantityUnit): boolean {
  const type1 = getUnitType(unit1)
  const type2 = getUnitType(unit2)

  // Both unknown or different types = not compatible
  if (type1 === 'unknown' || type2 === 'unknown') return false

  return type1 === type2
}

/**
 * Convert quantity from one unit to another
 * Returns null if units are not compatible
 */
export function convertUnit(
  quantity: number,
  fromUnit?: QuantityUnit,
  toUnit?: QuantityUnit
): number | null {
  // If units are the same or both undefined, no conversion needed
  if (fromUnit === toUnit || (!fromUnit && !toUnit)) {
    return quantity
  }

  // Check compatibility
  if (!areUnitsCompatible(fromUnit, toUnit)) {
    return null
  }

  const unitType = getUnitType(fromUnit)

  // Handle weight conversions
  if (unitType === 'weight') {
    const fromFactor = WEIGHT_CONVERSIONS[fromUnit || 'oz']
    const toFactor = WEIGHT_CONVERSIONS[toUnit || 'oz']

    if (!fromFactor || !toFactor) return null

    // Convert to base unit (oz) then to target unit
    const inBaseUnit = quantity * fromFactor
    return inBaseUnit / toFactor
  }

  // Handle volume conversions
  if (unitType === 'volume') {
    const fromFactor = VOLUME_CONVERSIONS[fromUnit || 'ml']
    const toFactor = VOLUME_CONVERSIONS[toUnit || 'ml']

    if (!fromFactor || !toFactor) return null

    // Convert to base unit (ml) then to target unit
    const inBaseUnit = quantity * fromFactor
    return inBaseUnit / toFactor
  }

  // Count-based units can't be converted between each other
  // (e.g., can't convert "3 cans" to "2 bottles")
  if (unitType === 'count') {
    if (fromUnit === toUnit) return quantity
    return null
  }

  return null
}

/**
 * Normalize quantity to base unit for comparison
 * Returns { quantity, unit } in base units
 */
export function normalizeToBaseUnit(
  quantity: number,
  unit?: QuantityUnit
): { quantity: number; unit: string } {
  const unitType = getUnitType(unit)

  if (unitType === 'weight') {
    const factor = WEIGHT_CONVERSIONS[unit || 'oz']
    return {
      quantity: quantity * (factor || 1),
      unit: BASE_UNITS.weight
    }
  }

  if (unitType === 'volume') {
    const factor = VOLUME_CONVERSIONS[unit || 'ml']
    return {
      quantity: quantity * (factor || 1),
      unit: BASE_UNITS.volume
    }
  }

  // Count-based units stay as-is
  return {
    quantity,
    unit: unit || BASE_UNITS.count
  }
}

/**
 * Compare two quantities with units
 * Returns:
 *   < 0 if quantity1 < quantity2
 *   = 0 if quantity1 = quantity2
 *   > 0 if quantity1 > quantity2
 *   null if units are incompatible
 */
export function compareQuantities(
  quantity1: number,
  unit1: QuantityUnit | undefined,
  quantity2: number,
  unit2: QuantityUnit | undefined
): number | null {
  // Check compatibility
  if (!areUnitsCompatible(unit1, unit2)) {
    return null
  }

  // Normalize both to base units
  const normalized1 = normalizeToBaseUnit(quantity1, unit1)
  const normalized2 = normalizeToBaseUnit(quantity2, unit2)

  // Compare base quantities
  return normalized1.quantity - normalized2.quantity
}

/**
 * Calculate how much more is needed
 * Returns { quantity, unit } or null if incompatible
 */
export function calculateDeficit(
  needed: number,
  neededUnit: QuantityUnit | undefined,
  have: number,
  haveUnit: QuantityUnit | undefined
): { quantity: number; unit: QuantityUnit } | null {
  // Check compatibility
  if (!areUnitsCompatible(neededUnit, haveUnit)) {
    return null
  }

  // Normalize both to base units
  const normalizedNeeded = normalizeToBaseUnit(needed, neededUnit)
  const normalizedHave = normalizeToBaseUnit(have, haveUnit)

  const deficit = normalizedNeeded.quantity - normalizedHave.quantity

  // If we have enough or more, no deficit
  if (deficit <= 0) {
    return {
      quantity: 0,
      unit: neededUnit || 'count'
    }
  }

  // Convert deficit back to needed unit
  const deficitInNeededUnit = convertUnit(
    deficit,
    normalizedNeeded.unit as QuantityUnit,
    neededUnit
  )

  if (deficitInNeededUnit === null) {
    return null
  }

  return {
    quantity: Math.round(deficitInNeededUnit * 100) / 100, // Round to 2 decimals
    unit: neededUnit || 'count'
  }
}

/**
 * Check if we have enough of an item
 */
export function hasEnough(
  needed: number,
  neededUnit: QuantityUnit | undefined,
  have: number,
  haveUnit: QuantityUnit | undefined
): boolean | null {
  const comparison = compareQuantities(have, haveUnit, needed, neededUnit)

  if (comparison === null) {
    return null // Incompatible units
  }

  return comparison >= 0 // Have >= needed
}

/**
 * Format a quantity comparison for display
 * Example: "Need 2 lbs, have 1.5 lbs, need 0.5 lbs more"
 */
export function formatQuantityComparison(
  needed: number,
  neededUnit: QuantityUnit | undefined,
  have: number,
  haveUnit: QuantityUnit | undefined
): string {
  const enough = hasEnough(needed, neededUnit, have, haveUnit)

  if (enough === null) {
    return 'Units not comparable'
  }

  if (enough) {
    return `Have ${have} ${haveUnit || 'items'} (need ${needed} ${neededUnit || 'items'})`
  }

  const deficit = calculateDeficit(needed, neededUnit, have, haveUnit)

  if (!deficit) {
    return `Need ${needed} ${neededUnit || 'items'}, have ${have} ${haveUnit || 'items'}`
  }

  return `Need ${needed} ${neededUnit || 'items'}, have ${have} ${haveUnit || 'items'}, need ${deficit.quantity} ${deficit.unit} more`
}
