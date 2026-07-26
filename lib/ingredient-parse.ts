/**
 * Rules-based ingredient-line parser — turns free-typed text like
 * "1/2 cup rolled oats" into structured { quantity, unit, name }.
 *
 * Deliberately NOT an LLM/API call: it runs client-side, offline, with
 * zero Gemini/USDA quota cost (rule-first-then-ML). It powers the
 * manual meal-log "Ingredients breakdown" input, where a user types or
 * pastes a recalled ingredient list and we store it structured on
 * MealLog.sourceRefs.cookedIngredients (ingredientText + optional
 * quantity/unit). A later phase can match `name` against the product /
 * USDA nutrition data to estimate macros — this parser just splits the
 * text so that lookup has something clean to work with.
 *
 * Mirrors the smaller `parseIngredient` helper in components/ui/RecipeModal.tsx
 * but returns a numeric quantity + separated unit (the shape the
 * RecipeIngredient / CookedIngredient types actually want).
 */

/** Known measurement units (lowercased). Order-independent — matched as a
 *  whole leading token after the quantity. */
const UNITS = new Set([
  'cup', 'cups', 'tbsp', 'tbsps', 'tablespoon', 'tablespoons',
  'tsp', 'tsps', 'teaspoon', 'teaspoons', 'oz', 'ounce', 'ounces',
  'lb', 'lbs', 'pound', 'pounds', 'g', 'gram', 'grams', 'kg',
  'mg', 'ml', 'l', 'liter', 'liters', 'litre', 'litres',
  'clove', 'cloves', 'slice', 'slices', 'can', 'cans', 'jar', 'jars',
  'stick', 'sticks', 'piece', 'pieces', 'serving', 'servings',
  'handful', 'handfuls', 'pinch', 'pinches', 'dash', 'dashes',
  'scoop', 'scoops', 'packet', 'packets', 'bunch', 'bunches',
  'stalk', 'stalks', 'strip', 'strips', 'fillet', 'fillets',
])

/** Unicode single-char fractions → their ascii "n/d" form. */
const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6',
  '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
}

/** One parsed ingredient. `ingredientText` is the canonical display string
 *  (what the user typed, trimmed); `name` is the ingredient with the
 *  quantity/unit stripped, for later nutrition matching. */
export interface ParsedIngredient {
  ingredientText: string
  quantity?: number
  unit?: string
  name: string
}

/** Convert a numeric token that may be a whole, decimal, fraction, or
 *  mixed number ("1 1/2") into a number. Returns undefined if unparseable. */
function toNumber(token: string): number | undefined {
  const t = token.trim()
  if (!t) return undefined
  // Mixed number: "1 1/2"
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) {
    const whole = Number(mixed[1])
    const num = Number(mixed[2])
    const den = Number(mixed[3])
    if (den === 0) return whole
    return whole + num / den
  }
  // Simple fraction: "3/4"
  const frac = t.match(/^(\d+)\/(\d+)$/)
  if (frac) {
    const den = Number(frac[2])
    if (den === 0) return undefined
    return Number(frac[1]) / den
  }
  // Decimal or whole
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

/** Parse a single ingredient line into structured parts. Never throws;
 *  an unrecognizable line still yields { ingredientText, name } with no
 *  quantity/unit so it can still be saved verbatim. */
export function parseIngredientLine(raw: string): ParsedIngredient | null {
  const ingredientText = raw.trim()
  if (!ingredientText) return null

  // Normalize unicode fractions to ascii (e.g. "½ cup" → "1/2 cup"), and
  // glued forms like "1½" → "1 1/2".
  let work = ingredientText
  for (const [uni, asc] of Object.entries(UNICODE_FRACTIONS)) {
    work = work.replace(new RegExp(`(\\d)${uni}`, 'g'), `$1 ${asc}`).replace(new RegExp(uni, 'g'), asc)
  }

  // Leading quantity: mixed ("1 1/2"), fraction ("3/4"), decimal, or whole.
  const qtyMatch = work.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+)\s*(.*)$/)
  let quantity: number | undefined
  let rest = work
  if (qtyMatch) {
    quantity = toNumber(qtyMatch[1])
    rest = qtyMatch[2].trim()
  }

  // Optional unit as the next whole token.
  let unit: string | undefined
  const tokens = rest.split(/\s+/)
  if (tokens.length > 1) {
    const maybeUnit = tokens[0].toLowerCase().replace(/\.$/, '')
    if (UNITS.has(maybeUnit)) {
      unit = maybeUnit
      rest = tokens.slice(1).join(' ')
    }
  }

  const name = rest.trim() || ingredientText
  return { ingredientText, quantity, unit, name }
}

/** Split a batch entry (comma- and/or newline-separated) into individual
 *  parsed ingredients. Empty fragments are dropped. Lets a user paste
 *  "2 eggs, 1 tbsp butter, 1/2 cup oats" and get three rows. */
export function parseIngredientList(raw: string): ParsedIngredient[] {
  return raw
    .split(/[\n,]+/)
    .map((frag) => parseIngredientLine(frag))
    .filter((x): x is ParsedIngredient => x !== null)
}
