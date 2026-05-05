/**
 * scripts/backfill-ingredient-allergens.ts
 *
 * One-shot backfill: walks the `recipes` collection and computes
 * per-ingredient allergen tags (Family-meal Commit D) for any
 * recipe that's missing the `ingredientAllergens` field or whose
 * cached array is out-of-sync with `ingredients`.
 *
 * Idempotent — re-running skips recipes already populated with a
 * length-matched array.
 *
 * Run: tsx scripts/backfill-ingredient-allergens.ts
 *
 * Optional env:
 *   DRY_RUN=1      — log proposed updates, don't persist.
 *   LIMIT=N        — process at most N recipes (default: all).
 *   ONLY_ID=foo    — process only the recipe with this id.
 *   FORCE=1        — re-classify even when cache appears populated
 *                    (use after a transient classifier failure
 *                    poisoned the cache with empty arrays).
 *
 * Cost note: each recipe = one Gemini call. The classifier skips
 * recipes whose recipe-level `allergens` array is empty (nothing
 * to drill down into), so the actual call count is bounded by the
 * number of allergen-tagged recipes.
 */

import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  const { adminDb } = await import('../lib/firebase-admin')
  const { Timestamp } = await import('firebase-admin/firestore')
  const {
    classifyIngredientAllergens,
    needsClassification,
    packIngredientAllergens,
    unpackIngredientAllergens,
  } = await import('../lib/ingredient-allergen-classifier')

  const DRY_RUN = process.env.DRY_RUN === '1'
  const FORCE = process.env.FORCE === '1'
  const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity
  const ONLY_ID = process.env.ONLY_ID

  console.log('[backfill-ingredient-allergens] starting', { DRY_RUN, FORCE, LIMIT, ONLY_ID })

  let query = adminDb.collection('recipes') as FirebaseFirestore.Query

  if (ONLY_ID) {
    const doc = await adminDb.collection('recipes').doc(ONLY_ID).get()
    if (!doc.exists) {
      console.log(`[backfill] recipe not found: ${ONLY_ID}`)
      process.exit(1)
    }
    try {
      await processRecipe(
        doc,
        classifyIngredientAllergens,
        needsClassification,
        packIngredientAllergens,
        unpackIngredientAllergens,
        DRY_RUN,
        FORCE,
        Timestamp,
      )
      process.exit(0)
    } catch (err) {
      console.error(`[backfill] FAILED ${doc.id}:`, err)
      process.exit(1)
    }
  }

  const snapshot = await query.get()
  console.log(`[backfill] found ${snapshot.size} recipes`)

  let processed = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (const doc of snapshot.docs) {
    if (processed >= LIMIT) {
      console.log(`[backfill] LIMIT (${LIMIT}) reached, stopping`)
      break
    }
    processed++

    try {
      const wasUpdated = await processRecipe(
        doc,
        classifyIngredientAllergens,
        needsClassification,
        packIngredientAllergens,
        unpackIngredientAllergens,
        DRY_RUN,
        FORCE,
        Timestamp,
      )
      if (wasUpdated) updated++
      else skipped++
    } catch (err) {
      failed++
      console.error(`[backfill] FAILED ${doc.id}:`, err)
    }
  }

  console.log('[backfill] done', { processed, updated, skipped, failed })
  process.exit(failed > 0 ? 1 : 0)
}

async function processRecipe(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
  classify: typeof import('../lib/ingredient-allergen-classifier').classifyIngredientAllergens,
  needs: typeof import('../lib/ingredient-allergen-classifier').needsClassification,
  pack: typeof import('../lib/ingredient-allergen-classifier').packIngredientAllergens,
  unpack: typeof import('../lib/ingredient-allergen-classifier').unpackIngredientAllergens,
  dryRun: boolean,
  force: boolean,
  Timestamp: typeof import('firebase-admin/firestore').Timestamp,
): Promise<boolean> {
  const data = doc.data()
  if (!data) return false

  const ingredients: string[] = Array.isArray(data.ingredients) ? data.ingredients : []
  const recipeAllergens: string[] = Array.isArray(data.allergens) ? data.allergens : []
  const cached = unpack(data.ingredientAllergens)

  if (!ingredients.length) {
    console.log(`[backfill] skip ${doc.id} (no ingredients)`)
    return false
  }

  if (!force && !needs(ingredients, cached as never)) {
    console.log(`[backfill] skip ${doc.id} (already populated)`)
    return false
  }

  console.log(`[backfill] classifying ${doc.id} (${ingredients.length} ingredients, allergens: ${recipeAllergens.join(',') || 'none'})`)

  const ingredientAllergens = await classify(
    ingredients,
    recipeAllergens as never,
  )

  const summary = ingredientAllergens
    .map((tags, i) => (tags.length > 0 ? `[${i + 1}] ${tags.join(',')}` : null))
    .filter((s) => s !== null)

  console.log(`[backfill]   → ${summary.length} tagged: ${summary.join(' | ') || '(none)'}`)

  if (dryRun) {
    console.log(`[backfill]   DRY_RUN: would write ingredientAllergens`)
    return true
  }

  await doc.ref.update({
    ingredientAllergens: pack(ingredientAllergens),
    updatedAt: Timestamp.now(),
  })
  return true
}

main().catch((err) => {
  console.error('[backfill] fatal:', err)
  process.exit(1)
})
