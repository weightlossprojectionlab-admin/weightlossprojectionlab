/**
 * Deterministic allergen parser — the categorical (hard, safety-critical) half
 * of the item health-attribute enrichment. Maps messy product text OR
 * pre-tokenized catalog tags to a fixed lowercase canonical vocabulary that the
 * health-demand `unsafeFor` check consumes.
 *
 * Design priorities, in order:
 *   1. AVOID FALSE NEGATIVES — missing an allergen is the dangerous direction
 *      (do-no-harm). So "may contain" is folded in, and ambiguous staples like
 *      "flour" default to wheat unless explicitly qualified otherwise.
 *   2. Guard the well-known FALSE POSITIVES — almond/rice flour ≠ wheat; cocoa/
 *      shea/peanut butter ≠ milk; coconut ≠ tree nut; eggplant ≠ egg; and
 *      FREE-FROM claims ("gluten-free", "Sans gluten", "no milk") flag NOTHING.
 *
 * Pure + isomorphic. v2 (deferred): split DEFINITE ("Contains:") from ADVISORY
 * ("may contain" / shared-facility) confidence instead of folding them.
 */

export type CanonicalAllergen =
  | 'milk'
  | 'egg'
  | 'fish'
  | 'crustacean_shellfish'
  | 'tree_nut'
  | 'peanut'
  | 'wheat_gluten'
  | 'soy'
  | 'sesame'

/** Plain synonyms — matched as a whole word with an optional trailing plural. */
const PLAIN_SYNONYMS: Record<CanonicalAllergen, string[]> = {
  milk: ['milk', 'whey', 'casein', 'caseinate', 'lactose', 'cream', 'cheese', 'ghee', 'yogurt', 'dairy', 'buttermilk', 'butterfat', 'curd'],
  egg: ['egg', 'albumin', 'albumen', 'ovalbumin', 'meringue', 'mayonnaise'],
  fish: ['fish', 'cod', 'salmon', 'tuna', 'tilapia', 'anchovy', 'anchovies', 'haddock', 'pollock', 'sardine'],
  crustacean_shellfish: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'crawfish', 'crayfish', 'crustacean'],
  tree_nut: ['tree nut', 'nut', 'almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia', 'brazil nut', 'pine nut', 'filbert'],
  peanut: ['peanut', 'groundnut', 'arachis'],
  wheat_gluten: ['wheat', 'gluten', 'barley', 'rye', 'malt', 'semolina', 'spelt', 'farro', 'durum', 'triticale', 'couscous', 'seitan', 'bulgur'],
  soy: ['soy', 'soya', 'soybean', 'edamame', 'tofu', 'tempeh', 'miso'],
  sesame: ['sesame', 'tahini', 'benne'],
}

/** Ambiguous staples: flag the allergen UNLESS the immediately-preceding word disqualifies it. */
interface GuardedSynonym {
  allergen: CanonicalAllergen
  phrase: string
  exceptPrefix: string[]
}
const GUARDED_SYNONYMS: GuardedSynonym[] = [
  {
    allergen: 'wheat_gluten',
    phrase: 'flour',
    exceptPrefix: ['almond', 'rice', 'corn', 'coconut', 'oat', 'chickpea', 'tapioca', 'potato', 'soy', 'buckwheat', 'cassava', 'quinoa', 'nut', 'plantain'],
  },
  {
    allergen: 'milk',
    phrase: 'butter',
    exceptPrefix: ['cocoa', 'shea', 'peanut', 'almond', 'cashew', 'nut', 'sun', 'seed', 'apple', 'body'],
  },
]

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Blank out FREE-FROM / negation claims so a label that says an allergen is
 * ABSENT doesn't read as present. Without this, "gluten-free" / "Sans gluten"
 * (FR) / "no milk" / "dairy-free" all trip the allergen they're disclaiming —
 * the exact false positive the Nutella smoke test exposed.
 *
 * Deliberately narrow (only well-known free-from idioms) to avoid the opposite,
 * dangerous error: stripping a real warning. "May contain…" is NOT a negation
 * and is left intact (it's folded IN for safety elsewhere).
 */
function stripFreeFrom(text: string): string {
  return text
    .replace(/\b[a-z]+[\s-]free\b/g, ' ')              // gluten-free, dairy free, nut-free
    .replace(/\bfree\s+(?:from|of)\s+[a-z]+\b/g, ' ')  // free from milk, free of soy
    .replace(/\b(?:no|without|sans)\s+[a-z]+\b/g, ' ') // no milk, without nuts, sans gluten (FR)
    .replace(/\bnon[\s-]?[a-z]+\b/g, ' ')              // non-dairy, non dairy
}

/** Strip a catalog locale namespace + separators: "en:tree-nuts" → "tree nuts". */
function normalizeToken(tag: string): string {
  return tag.replace(/^[a-z]{2,3}:/i, '').replace(/[-_]+/g, ' ').trim()
}

/** Boundary-respecting sweep of one text blob → the allergens it declares. */
function sweep(raw: string): Set<CanonicalAllergen> {
  const text = ` ${stripFreeFrom(raw.toLowerCase())} `
  const found = new Set<CanonicalAllergen>()

  for (const allergen of Object.keys(PLAIN_SYNONYMS) as CanonicalAllergen[]) {
    for (const phrase of PLAIN_SYNONYMS[allergen]) {
      if (new RegExp(`\\b${escapeRe(phrase)}s?\\b`).test(text)) {
        found.add(allergen)
        break
      }
    }
  }

  for (const g of GUARDED_SYNONYMS) {
    const re = new RegExp(`(\\b\\w+\\s+)?\\b${escapeRe(g.phrase)}s?\\b`, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const prev = (m[1] ?? '').trim().split(/\s+/).pop() ?? ''
      if (!g.exceptPrefix.includes(prev)) {
        found.add(g.allergen)
        break
      }
    }
  }

  return found
}

/**
 * Parse a free-text ingredient/"Contains:" string OR a pre-tokenized tag array
 * into the canonical allergens present. Sorted + de-duplicated.
 */
export function parseAllergens(input: string | string[]): CanonicalAllergen[] {
  const blobs = Array.isArray(input) ? input.map(normalizeToken) : [input]
  const found = new Set<CanonicalAllergen>()
  for (const b of blobs) for (const a of sweep(b)) found.add(a)
  return [...found].sort()
}

/**
 * Canonicalize an OpenFoodFacts product's two allergen-bearing fields into one
 * sorted, de-duplicated tag set. The `allergens` field is comma-separated locale
 * tokens ("en:milk,en:soy"); `ingredients_text` is free prose. Union both so a
 * declared allergen OR an ingredient mention is caught (do-no-harm). Empty → [].
 *
 * The single home for "OFF product → allergenTags" — both the per-item ingestion
 * (addOrUpdateShoppingItem) and the shared catalog writer (updateGlobalProduct-
 * Database) call this so item rows and product_database never drift.
 */
export function allergensFromProductFields(
  allergens?: string,
  ingredientsText?: string,
): CanonicalAllergen[] {
  return [
    ...new Set([
      ...parseAllergens(allergens ? allergens.split(',') : []),
      ...(ingredientsText ? parseAllergens(ingredientsText) : []),
    ]),
  ].sort()
}

/**
 * Normalize a SINGLE allergen term (a member's foodAllergy, a catalog tag) to
 * its canonical token, or null. Reuses the same dictionary so the item side and
 * the member side speak one vocabulary — e.g. 'peanuts'→'peanut', 'dairy'→'milk',
 * 'shellfish'→'crustacean_shellfish'. (Restriction phrases like 'gluten-free' are
 * an avoid-intent and are mapped separately, not through here.)
 */
export function normalizeAllergen(term: string): CanonicalAllergen | null {
  const hits = sweep(normalizeToken(term))
  return hits.size ? [...hits][0] : null
}
