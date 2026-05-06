/**
 * Ingredient Parser
 *
 * Parses ingredient strings and extracts quantities, units, and ingredient names.
 * Supports common formats like "1 cup milk", "2 tbsp honey", "1/2 lb chicken"
 */

export interface ParsedIngredient {
  original: string
  quantity: number | null
  quantityString: string // Original quantity representation (e.g., "1/2", "2", "1 1/2")
  unit: string | null
  ingredient: string
  scalable: boolean
}

// Common cooking units
const UNITS = [
  // Volume
  'cup', 'cups', 'c',
  'tablespoon', 'tablespoons', 'tbsp', 'tbs', 'tb',
  'teaspoon', 'teaspoons', 'tsp', 'ts',
  'fluid ounce', 'fluid ounces', 'fl oz', 'oz',
  'pint', 'pints', 'pt',
  'quart', 'quarts', 'qt',
  'gallon', 'gallons', 'gal',
  'milliliter', 'milliliters', 'ml',
  'liter', 'liters', 'l',

  // Weight
  'pound', 'pounds', 'lb', 'lbs',
  'ounce', 'ounces', 'oz',
  'gram', 'grams', 'g',
  'kilogram', 'kilograms', 'kg',

  // Other
  'piece', 'pieces', 'pc',
  'slice', 'slices',
  'clove', 'cloves',
  'can', 'cans',
  'package', 'packages', 'pkg',
  'bunch', 'bunches',
  'head', 'heads',
  'pinch', 'pinches',
  'dash', 'dashes',
  'whole', 'halves', 'half',
  'to taste'
]

// Create a regex pattern for units
const UNIT_PATTERN = UNITS.join('|')

/**
 * Parse a fraction string to decimal
 * Supports: "1/2", "1 1/2", "2/3", etc.
 */
function parseFraction(fractionStr: string): number | null {
  fractionStr = fractionStr.trim()

  // Check for mixed number (e.g., "1 1/2")
  const mixedMatch = fractionStr.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1])
    const numerator = parseInt(mixedMatch[2])
    const denominator = parseInt(mixedMatch[3])
    return whole + (numerator / denominator)
  }

  // Check for simple fraction (e.g., "1/2")
  const fractionMatch = fractionStr.match(/^(\d+)\/(\d+)$/)
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1])
    const denominator = parseInt(fractionMatch[2])
    return numerator / denominator
  }

  // Check for decimal
  const decimal = parseFloat(fractionStr)
  if (!isNaN(decimal)) {
    return decimal
  }

  return null
}

/**
 * Convert decimal to fraction string for cooking measurements.
 *
 * Examples:
 *   0.5  → "1/2"
 *   1.5  → "1 1/2"
 *   0.125 → "1/8"   (was "0.1" before — broke at non-base servings)
 *   0.375 → "3/8"
 *   0.0625 → "1/16"
 *
 * Tolerance-based match (TOL = 0.01) handles JS floating-point
 * imprecision: 0.125 + 0.125 + 0.125 actually computes to
 * 0.37500000000000006 in IEEE-754, which would miss an exact-match
 * "0.38" lookup.
 */
const COOKING_FRACTIONS: Array<{ value: number; label: string }> = [
  { value: 1 / 16, label: '1/16' },
  { value: 1 / 8, label: '1/8' },
  { value: 3 / 16, label: '3/16' },
  { value: 1 / 4, label: '1/4' },
  { value: 1 / 3, label: '1/3' },
  { value: 3 / 8, label: '3/8' },
  { value: 1 / 2, label: '1/2' },
  { value: 5 / 8, label: '5/8' },
  { value: 2 / 3, label: '2/3' },
  { value: 3 / 4, label: '3/4' },
  { value: 7 / 8, label: '7/8' },
]
const FRACTION_TOLERANCE = 0.01

export function decimalToFraction(decimal: number): string {
  // Handle whole numbers
  if (decimal % 1 === 0) {
    return decimal.toString()
  }

  const whole = Math.floor(decimal)
  const fraction = decimal - whole

  const match = COOKING_FRACTIONS.find(
    (f) => Math.abs(fraction - f.value) < FRACTION_TOLERANCE,
  )

  if (match) {
    return whole > 0 ? `${whole} ${match.label}` : match.label
  }

  // No common fraction within tolerance — fall back to a 1-decimal
  // approximation. This is the case the user sees as "0.1 cup"; the
  // unit-normalization step in scaleIngredient should have already
  // promoted to a smaller unit (tbsp / tsp) before reaching this
  // branch in the common cases.
  return decimal.toFixed(1)
}

/**
 * Normalize a (quantity, unit) pair into the most-readable
 * representation by promoting to a smaller unit when the original
 * quantity has gotten impractically small (e.g., scaling 1 cup
 * down to 1/8 of a serving = 1/8 cup → "2 tbsp" instead).
 *
 * Conversions (US customary, the dominant cooking system in
 * MEAL_SUGGESTIONS):
 *   1 cup = 16 tbsp
 *   1 tbsp = 3 tsp
 *   1 lb = 16 oz
 *
 * Doesn't touch units it doesn't recognize. Doesn't go in the
 * other direction (small → large promotion) because that produces
 * uglier output for cooks ("0.5 cup" reads better than "8 tbsp").
 */
function normalizeQuantityUnit(
  quantity: number,
  unit: string | null | undefined,
): { quantity: number; unit: string | null | undefined } {
  if (!unit) return { quantity, unit }
  const u = unit.toLowerCase()

  // Volume: cup → tbsp when < 1/4 cup
  if ((u === 'cup' || u === 'cups') && quantity < 0.25) {
    return normalizeQuantityUnit(quantity * 16, 'tbsp')
  }
  // Volume: tbsp → tsp when < 1 tbsp
  if (
    (u === 'tbsp' || u === 'tablespoon' || u === 'tablespoons') &&
    quantity < 1
  ) {
    return { quantity: quantity * 3, unit: 'tsp' }
  }
  // Mass: lb → oz when < 1/4 lb
  if (
    (u === 'lb' || u === 'lbs' || u === 'pound' || u === 'pounds') &&
    quantity < 0.25
  ) {
    return { quantity: quantity * 16, unit: 'oz' }
  }

  return { quantity, unit }
}

/**
 * Parse an ingredient string into structured data
 */
export function parseIngredient(ingredientStr: string): ParsedIngredient {
  const original = ingredientStr
  let remaining = ingredientStr.trim()

  // Try to extract quantity
  // Matches: "1", "1/2", "1 1/2", "2.5"
  const quantityMatch = remaining.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)\s+/)

  let quantity: number | null = null
  let quantityString = ''

  if (quantityMatch) {
    quantityString = quantityMatch[1]
    quantity = parseFraction(quantityString)
    remaining = remaining.slice(quantityMatch[0].length).trim()
  }

  // Try to extract unit
  const unitRegex = new RegExp(`^(${UNIT_PATTERN})\\b`, 'i')
  const unitMatch = remaining.match(unitRegex)

  let unit: string | null = null
  if (unitMatch) {
    unit = unitMatch[1].toLowerCase()
    remaining = remaining.slice(unitMatch[0].length).trim()
  }

  // Remaining text is the ingredient name
  const ingredient = remaining || original

  // Determine if ingredient is scalable
  // Ingredients without quantities or with "to taste" are not scalable
  const scalable = quantity !== null && !ingredientStr.toLowerCase().includes('to taste')

  return {
    original,
    quantity,
    quantityString,
    unit,
    ingredient,
    scalable
  }
}

/**
 * Scale a parsed ingredient by a multiplier.
 *
 * Two-stage formatting after scaling:
 *  1. Normalize unit — promote to a smaller cooking unit when the
 *     scaled quantity becomes impractically small (cup → tbsp,
 *     tbsp → tsp, lb → oz). Cooks read "2 tbsp" more naturally
 *     than "1/8 cup".
 *  2. Format the (possibly converted) quantity as a fraction with
 *     tolerance-based matching that handles eighths and sixteenths.
 */
export function scaleIngredient(parsed: ParsedIngredient, multiplier: number): string {
  if (!parsed.scalable || parsed.quantity === null) {
    // Return original if not scalable
    return parsed.original
  }

  const rawScaled = parsed.quantity * multiplier
  const { quantity: normalizedQuantity, unit: normalizedUnit } =
    normalizeQuantityUnit(rawScaled, parsed.unit)

  const scaledQuantityStr = decimalToFraction(normalizedQuantity)

  // Reconstruct the ingredient string
  const parts = [scaledQuantityStr]
  if (normalizedUnit) parts.push(normalizedUnit)
  parts.push(parsed.ingredient)

  return parts.join(' ')
}

/**
 * Parse and scale an ingredient string in one step
 */
export function parseAndScaleIngredient(ingredientStr: string, multiplier: number): string {
  const parsed = parseIngredient(ingredientStr)
  return scaleIngredient(parsed, multiplier)
}

/**
 * Batch parse and scale multiple ingredients
 */
export function scaleIngredients(ingredients: string[], multiplier: number): string[] {
  return ingredients.map(ing => parseAndScaleIngredient(ing, multiplier))
}
