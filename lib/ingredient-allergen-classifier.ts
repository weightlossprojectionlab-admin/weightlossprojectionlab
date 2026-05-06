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

import { SchemaType } from '@google/generative-ai'
import type { AllergyTag } from './meal-suggestions'
import { logger } from './logger'
import { generateGeminiJSON } from '@/lib/ai/gemini-client'
import { ALLERGY_TAG_VALUES } from './allergen-pack'

// Re-export the pure pack/unpack utilities from allergen-pack for
// backwards compat with existing server-route imports. The actual
// definitions live in lib/allergen-pack.ts (a server-import-free module
// that client code can safely use without dragging firebase-admin into
// the browser bundle).
export {
  ALLERGY_TAG_VALUES,
  needsClassification,
  packIngredientAllergens,
  unpackIngredientAllergens,
} from './allergen-pack'
export type { IngredientAllergenEntry } from './allergen-pack'

const MODEL_ID = 'gemini-2.5-flash'

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

  // Reference impl for the shared Gemini client (T5.14). The client
  // owns SDK init, JSON.parse, and the gemini_invocations log;
  // classifier owns the prompt + the post-processing tag filter.
  // No Zod gate here — we deliberately allow unknown tags through
  // the boundary and filter them out below (Gemini sometimes emits
  // taxonomy variants like "tree-nuts" that we want to coerce).
  const parsed = await generateGeminiJSON<{ ingredientAllergens?: unknown }>({
    fnName: 'classifyIngredientAllergens',
    model: MODEL_ID,
    prompt,
    geminiSchema: classifierSchema,
    temperature: 0.1,
    inputSize: ingredients.length,
    metadata: { recipeAllergens },
  })

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
}

// needsClassification, packIngredientAllergens, unpackIngredientAllergens,
// IngredientAllergenEntry, and ALLERGY_TAG_VALUES live in lib/allergen-pack.ts
// and are re-exported above. Don't add their definitions back here — the
// pure utilities can't depend on this file (which imports gemini-client
// → gemini-invocations → firebase-admin → child_process), or client
// components break at build time with 'Module not found: child_process'.
