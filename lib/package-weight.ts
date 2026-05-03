/**
 * Parser for USDA's `package_weight` free-text field.
 *
 * USDA's FoodData Central branded_food.csv stores total-package weight as
 * a free-text string with wildly inconsistent formatting:
 *
 *   "20 OZ"        -> 20 oz
 *   "1 LB"         -> 1 lbs
 *   "16 FL OZ"     -> 16 fl oz
 *   "1.75 LITER"   -> 1.75 l
 *   "500 ML"       -> 500 ml
 *   "12 CT"        -> 12 count
 *   "1 oz (28g)"   -> 1 oz   (parenthetical metric ignored)
 *   ""             -> null   (no data)
 *
 * Phase 2a uses this at import time to seed `containerSize` +
 * `containerUnit` on each product_database doc. Phase 2b will use the
 * same field on the inventory row to compute "% remaining" → pill color.
 *
 * Pure function; no Firestore / no I/O. Safe to import on both the
 * client and the server.
 */
import type { QuantityUnit } from '@/types/shopping'

export interface ParsedPackageWeight {
  size: number
  unit: QuantityUnit
}

/**
 * Map of input tokens (uppercased) to the QuantityUnit enum value.
 * Covers USDA's serving_size_unit codes (GRM, MLT) AND human-typed
 * forms in package_weight (G, GRAMS, ML, FL OZ, etc.).
 */
const UNIT_TOKENS: Record<string, QuantityUnit> = {
  // Weight
  G: 'g',
  GR: 'g',
  GRM: 'g',
  GRAM: 'g',
  GRAMS: 'g',
  KG: 'kg',
  KGM: 'kg',
  KILOGRAM: 'kg',
  KILOGRAMS: 'kg',
  OZ: 'oz',
  OUNCE: 'oz',
  OUNCES: 'oz',
  LB: 'lbs',
  LBS: 'lbs',
  POUND: 'lbs',
  POUNDS: 'lbs',
  // Volume
  ML: 'ml',
  MLT: 'ml',
  MILLILITER: 'ml',
  MILLILITERS: 'ml',
  L: 'l',
  LTR: 'l',
  LITER: 'l',
  LITERS: 'l',
  LITRE: 'l',
  LITRES: 'l',
  'FL OZ': 'fl oz',
  FLOZ: 'fl oz',
  'FLUID OUNCE': 'fl oz',
  'FLUID OUNCES': 'fl oz',
  GAL: 'gal',
  GALLON: 'gal',
  GALLONS: 'gal',
  QT: 'qt',
  QUART: 'qt',
  QUARTS: 'qt',
  PT: 'pt',
  PINT: 'pt',
  PINTS: 'pt',
  CUP: 'cup',
  CUPS: 'cup',
  TBSP: 'tbsp',
  TABLESPOON: 'tbsp',
  TABLESPOONS: 'tbsp',
  TSP: 'tsp',
  TEASPOON: 'tsp',
  TEASPOONS: 'tsp',
  // Count
  CT: 'count',
  CNT: 'count',
  COUNT: 'count',
  EACH: 'count',
  EA: 'count',
  PACK: 'package',
  PACKAGE: 'package',
  PKG: 'package',
  CAN: 'can',
  CANS: 'can',
  BOTTLE: 'bottle',
  BOTTLES: 'bottle',
  BAG: 'bag',
  BAGS: 'bag',
}

/**
 * Parse a USDA package_weight (or serving_size_unit) string into a
 * structured {size, unit}. Returns null when the input is empty,
 * unrecognizable, or has no numeric portion.
 */
export function parsePackageWeight(raw: string): ParsedPackageWeight | null {
  if (!raw) return null
  // Drop parenthetical sub-expressions (e.g., "1 oz (28g)" → "1 oz")
  const cleaned = raw.replace(/\([^)]*\)/g, '').trim().toUpperCase()
  if (!cleaned) return null

  // Match: optional "1 1/2"-style mixed number, or plain decimal/integer
  // followed by whitespace + unit token. Allows comma decimal (rare in
  // USDA but cheap to support).
  const match = cleaned.match(/^([0-9]+(?:[.,][0-9]+)?)\s*([A-Z][A-Z\s]*)$/)
  if (!match) return null

  const size = parseFloat(match[1].replace(',', '.'))
  if (!isFinite(size) || size <= 0) return null

  const unitToken = match[2].trim().replace(/\s+/g, ' ')
  const unit = UNIT_TOKENS[unitToken]
  if (!unit) return null

  return { size, unit }
}

/**
 * Format a ParsedPackageWeight back to a short display string for UI.
 * Round to a sensible precision per unit family.
 */
export function formatPackageWeight(parsed: ParsedPackageWeight | null): string {
  if (!parsed) return ''
  const isWhole = Math.abs(parsed.size - Math.round(parsed.size)) < 1e-9
  const value = isWhole ? parsed.size.toString() : parsed.size.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  return `${value} ${parsed.unit}`
}
