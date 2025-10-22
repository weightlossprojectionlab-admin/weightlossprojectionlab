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
 * Convert decimal to fraction string
 * Converts 0.5 → "1/2", 1.5 → "1 1/2", etc.
 */
export function decimalToFraction(decimal: number): string {
  // Handle whole numbers
  if (decimal % 1 === 0) {
    return decimal.toString()
  }

  const whole = Math.floor(decimal)
  const fraction = decimal - whole

  // Common fractions mapping
  const fractions: { [key: string]: string } = {
    '0.25': '1/4',
    '0.33': '1/3',
    '0.333': '1/3',
    '0.5': '1/2',
    '0.66': '2/3',
    '0.666': '2/3',
    '0.67': '2/3',
    '0.75': '3/4'
  }

  // Round to 2 decimals for lookup
  const roundedFraction = fraction.toFixed(2)

  if (fractions[roundedFraction]) {
    if (whole > 0) {
      return `${whole} ${fractions[roundedFraction]}`
    }
    return fractions[roundedFraction]
  }

  // If no common fraction found, round to 1 decimal
  return decimal.toFixed(1)
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
 * Scale a parsed ingredient by a multiplier
 */
export function scaleIngredient(parsed: ParsedIngredient, multiplier: number): string {
  if (!parsed.scalable || parsed.quantity === null) {
    // Return original if not scalable
    return parsed.original
  }

  const scaledQuantity = parsed.quantity * multiplier
  const scaledQuantityStr = decimalToFraction(scaledQuantity)

  // Reconstruct the ingredient string
  const parts = [scaledQuantityStr]
  if (parsed.unit) parts.push(parsed.unit)
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
