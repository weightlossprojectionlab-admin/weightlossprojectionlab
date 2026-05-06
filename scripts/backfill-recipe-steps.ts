/**
 * scripts/backfill-recipe-steps.ts
 *
 * Backfill missing recipeSteps + cookingTips on bundled
 * MEAL_SUGGESTIONS that don't yet have them, by writing Firestore
 * overlay docs at recipes/{recipeId}. The mergeRecipesWithMedia
 * helper already overlays these fields onto the bundled recipe at
 * read time, so we only need to write the deltas.
 *
 * Idempotent — skips recipes that already have steps in source OR
 * in an existing Firestore overlay (length-checked).
 *
 * Run: tsx scripts/backfill-recipe-steps.ts
 *
 * Optional env:
 *   DRY_RUN=1       — log what would be generated, don't write
 *   LIMIT=N         — process at most N recipes
 *   ONLY_ID=foo     — process only the recipe with this id
 *   FORCE=1         — re-generate even when steps appear populated
 *
 * Cost: one Gemini call per recipe. 17 recipes ~= $0.10-0.50.
 */
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  const { adminDb } = await import('../lib/firebase-admin')
  const { Timestamp } = await import('firebase-admin/firestore')
  const { MEAL_SUGGESTIONS } = await import('../lib/meal-suggestions')
  const { generateRecipeSteps } = await import('../lib/ai-recipe-generator')

  const DRY_RUN = process.env.DRY_RUN === '1'
  const FORCE = process.env.FORCE === '1'
  const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : Infinity
  const ONLY_ID = process.env.ONLY_ID

  console.log('[backfill-recipe-steps] starting', { DRY_RUN, FORCE, LIMIT, ONLY_ID })

  // Fetch all Firestore overlay docs once so we know which bundled
  // recipes already have steps overlaid.
  const snapshot = await adminDb.collection('recipes').get()
  const overlayById = new Map<string, FirebaseFirestore.DocumentData>()
  for (const d of snapshot.docs) overlayById.set(d.id, d.data())

  const candidates = MEAL_SUGGESTIONS.filter((r) => {
    if (ONLY_ID && r.id !== ONLY_ID) return false
    // ALWAYS preserve hand-crafted hardcoded steps. Even with
    // FORCE=1, we don't overwrite curated source-of-truth content
    // with Gemini output — the bundled recipes whose source has
    // steps (br001-br006 etc.) are hand-written and trusted.
    if (r.recipeSteps && r.recipeSteps.length > 0) return false
    if (FORCE) return true
    // Skip if Firestore overlay already provides steps
    const overlay = overlayById.get(r.id)
    if (overlay?.recipeSteps?.length > 0) return false
    return true
  })

  console.log(`[backfill] ${candidates.length} candidate(s) need backfill`)

  let processed = 0
  let updated = 0
  let failed = 0

  for (const recipe of candidates) {
    if (processed >= LIMIT) {
      console.log(`[backfill] LIMIT (${LIMIT}) reached, stopping`)
      break
    }
    processed++

    console.log(`[backfill] generating ${recipe.id}: ${recipe.name}`)
    try {
      const result = await generateRecipeSteps({ recipe })

      const summary = `${result.recipeSteps.length} steps, ${result.cookingTips?.length || 0} tips`
      console.log(`[backfill]   → ${summary}`)

      if (DRY_RUN) {
        console.log(`[backfill]   DRY_RUN: would write to recipes/${recipe.id}`)
        result.recipeSteps.slice(0, 2).forEach((s, i) => {
          console.log(`[backfill]     step ${i + 1}: ${s.slice(0, 80)}...`)
        })
        updated++
        continue
      }

      // Persist to Firestore overlay. Use merge so we don't
      // clobber media or other fields the doc may already carry.
      // Generated nutrition + dietary tags are NOT written —
      // bundled source is authoritative for those; we only fill
      // the steps + tips gap.
      const ref = adminDb.collection('recipes').doc(recipe.id)
      await ref.set(
        {
          id: recipe.id,
          recipeSteps: result.recipeSteps,
          cookingTips: result.cookingTips || [],
          requiresCooking: result.requiresCooking,
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      )
      updated++
    } catch (err) {
      failed++
      console.error(`[backfill] FAILED ${recipe.id}:`, (err as Error).message)
    }
  }

  console.log('[backfill] done', { processed, updated, failed })
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('[backfill] fatal:', err)
  process.exit(1)
})
