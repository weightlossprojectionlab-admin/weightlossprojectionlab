/**
 * Per-ingredient allergen classifier — Gemini-powered.
 *
 * Given a recipe's ingredient list and its recipe-level allergen
 * tags, returns a parallel array `AllergyTag[][]` mapping each
 * ingredient (by index) to the canonical allergen tags it carries.
 *
 * Why ML for this: keyword matching falls down on the long tail
 * ("creamy peanut butter" → nuts; "almond butter" → nuts;
 * "sunflower seed butter" → none; "tahini" → none even though it
 * looks nutty; "ghee" → dairy). An LLM grounded in the recipe's
 * declared allergen list does this with high precision.
 *
 * Used at recipe write time so the result is persisted on the
 * recipe doc (`ingredientAllergens` parallel to `ingredients`).
 * View paths read the cached field rather than re-classifying.
 *
 * SERVER-ONLY — uses GEMINI_API_KEY. Never import from client
 * components; route client requests through
 * /api/admin/recipes/classify-allergens.
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { AllergyTag } from './meal-suggestions'
import { logger } from './logger'

const ALLERGY_TAG_VALUES: AllergyTag[] = [
  'dairy', 'gluten', 'nuts', 'shellfish', 'soy', 'eggs', 'fish',
]

// Schema follows the @google/generative-ai shape. Inner items use
// SchemaType.STRING without enum constraint (the SDK's EnumStringSchema
// requires `format: 'enum'` and rejects empty allergen-tag arrays in
// some response shapes). We post-validate against ALLERGY_TAG_VALUES
// when parsing the response, so unknown tags get filtered out anyway.
const classifierSchema = {
  type: SchemaType.OBJECT as const,
  properties: {
    ingredientAllergens: {
      type: SchemaType.ARRAY as const,
      items: {
        type: SchemaType.ARRAY as const,
        items: {
          type: SchemaType.STRING as const,
        },
      },
    },
  },
  required: ['ingredientAllergens'],
}

/**
 * Classify per-ingredient allergen tags. Returns a parallel array
 * the same length as `ingredients`. Each inner array is the set of
 * AllergyTag values that ingredient carries (empty array = safe,
 * distinct from "classification failed").
 *
 * THROWS on hard failure (Gemini network/503, JSON parse error,
 * missing API key). Callers must decide how to handle:
 *   - Recipe-write paths: catch + continue with `undefined`
 *     (recipe persists without per-ingredient tags; recipe-level
 *     allergens still gate Cook Now).
 *   - Backfill: catch + skip the doc update so retry can succeed
 *     on the next run (don't poison the cache with empty arrays).
 *
 * The "no recipe allergens" early-return is treated as success
 * (returns all-empty arrays) — there's genuinely nothing to drill
 * down into, so no retry needed.
 */
export async function classifyIngredientAllergens(
  ingredients: string[],
  recipeAllergens: AllergyTag[],
): Promise<AllergyTag[][]> {
  if (!ingredients?.length) return []

  // No recipe-level allergens means there's nothing to drill down
  // into per ingredient. Save the round-trip; success path.
  if (!recipeAllergens?.length) {
    return ingredients.map(() => [])
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('[ingredient-allergen-classifier] GEMINI_API_KEY missing')
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: classifierSchema,
        temperature: 0.1,
      },
    })

    const numbered = ingredients
      .map((ing, i) => `${i + 1}. ${ing}`)
      .join('\n')

    const prompt = `You are a food-allergen classifier. For each ingredient, determine which of the following canonical allergen tags it carries. Only use tags from this set:

dairy — cow's milk, cheese, butter, cream, yogurt, whey, casein, ghee
gluten — wheat, barley, rye, conventional flour, breadcrumbs, soy sauce (contains wheat)
nuts — tree nuts AND peanuts (almond, cashew, walnut, pecan, hazelnut, pistachio, macadamia, brazil nut, peanut)
shellfish — shrimp, prawn, lobster, crab, oyster, clam, mussel, scallop, crayfish
soy — soybeans, tofu, tempeh, edamame, soy sauce, miso, soy lecithin
eggs — chicken eggs (whole, yolk, white), mayonnaise (contains eggs)
fish — finfish (salmon, tuna, cod, trout, tilapia, anchovy, sardine, etc.)

RECIPE-LEVEL ALLERGEN TAGS (already known): ${recipeAllergens.join(', ')}

These are the tags the recipe as a whole has been marked with. Use them as ground truth — at least one ingredient must carry each declared tag, but other ingredients may also carry tags not in this list (be honest, return them if present).

INGREDIENTS:
${numbered}

TASK:
For each numbered ingredient, return the allergen tags it carries.

Rules:
- Only consider intrinsic allergens of the ingredient itself, not cross-contamination risk.
- Plain "butter" is dairy. "Peanut butter" is nuts (NOT dairy — the word "butter" is just texture).
- "Almond butter" / "cashew butter" / "tahini" — only "tahini" is allergen-free; almond/cashew butter are nuts.
- "Sunflower seed butter" / "pumpkin seed butter" — no allergens.
- "Coconut" — NOT a tree nut for allergy purposes (FDA classifies it separately). Return empty.
- "Oats" alone — no allergens (gluten only if explicitly cross-contaminated, but treat as none unless the ingredient says "regular oats" or similar with wheat-flour context).
- "Soy sauce" — both soy AND gluten (contains wheat).
- "Worcestershire sauce" — fish (anchovies).
- Numbers/measurements/preparation words don't change the allergen ("1 cup melted butter" still = dairy).
- An ingredient with no allergens returns an empty array — do not invent tags.

Return strictly this shape:
{
  "ingredientAllergens": [
    [tag, tag, ...],   // for ingredient 1
    [tag, ...],         // for ingredient 2
    ...
  ]
}

The outer array MUST have exactly ${ingredients.length} entries (one per ingredient, in order).`

    const result = await model.generateContent(prompt)
    const response = result.response.text()
    const parsed = JSON.parse(response) as {
      ingredientAllergens?: unknown
    }

    const raw = parsed.ingredientAllergens
    if (!Array.isArray(raw)) {
      logger.warn('[ingredient-allergen-classifier] response missing ingredientAllergens array')
      return ingredients.map(() => [])
    }

    // Coerce: must be exactly the right length, each entry must be
    // a string array of valid AllergyTag values. Pad / truncate to
    // match. Filter unknown tags so a stray value doesn't propagate.
    const out: AllergyTag[][] = ingredients.map((_, i) => {
      const entry = raw[i]
      if (!Array.isArray(entry)) return []
      const tags = (entry as unknown[])
        .filter((t): t is AllergyTag =>
          typeof t === 'string' && (ALLERGY_TAG_VALUES as string[]).includes(t)
        )
      return Array.from(new Set(tags))
    })

    logger.info('[ingredient-allergen-classifier] classified', {
      ingredientCount: ingredients.length,
      taggedCount: out.filter((tags) => tags.length > 0).length,
      recipeAllergens,
    })

    return out
  } catch (err) {
    logger.error(
      '[ingredient-allergen-classifier] classification failed',
      err as Error,
    )
    throw err
  }
}

/**
 * Returns true when the cached `ingredientAllergens` is missing or
 * out-of-sync with the current `ingredients` (length mismatch =
 * stale = recompute).
 */
export function needsClassification(
  ingredients: string[] | undefined,
  ingredientAllergens: AllergyTag[][] | undefined,
): boolean {
  if (!ingredients?.length) return false
  if (!ingredientAllergens) return true
  return ingredientAllergens.length !== ingredients.length
}

/**
 * Firestore disallows nested arrays. Pack the per-ingredient
 * allergen list into an array of objects for persistence:
 *   [['gluten'], ['dairy'], []]
 *     ↓
 *   [{ tags: ['gluten'] }, { tags: ['dairy'] }, { tags: [] }]
 *
 * Pair with `unpackIngredientAllergens` on read.
 */
export interface IngredientAllergenEntry {
  tags: AllergyTag[]
}

export function packIngredientAllergens(
  tags: AllergyTag[][],
): IngredientAllergenEntry[] {
  return tags.map((t) => ({ tags: t }))
}

export function unpackIngredientAllergens(
  stored: unknown,
): AllergyTag[][] | undefined {
  if (!Array.isArray(stored)) return undefined
  return stored.map((entry) => {
    const tags = (entry as { tags?: unknown })?.tags
    if (!Array.isArray(tags)) return []
    return tags.filter((t): t is AllergyTag =>
      typeof t === 'string' && (ALLERGY_TAG_VALUES as string[]).includes(t),
    )
  })
}
