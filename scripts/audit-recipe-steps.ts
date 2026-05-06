/**
 * scripts/audit-recipe-steps.ts
 *
 * One-shot audit: counts recipes (bundled MEAL_SUGGESTIONS +
 * Firestore /recipes) that are missing recipeSteps. Drives the
 * backfill scope decision.
 *
 * Run: tsx scripts/audit-recipe-steps.ts
 */
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function main() {
  const { adminDb } = await import('../lib/firebase-admin')
  const { MEAL_SUGGESTIONS } = await import('../lib/meal-suggestions')

  // Bundled recipes (MEAL_SUGGESTIONS) — count those missing
  // recipeSteps in the hardcoded source. May be overlaid by a
  // Firestore doc with the same id; we'll cross-reference below.
  const bundledMissingSteps = MEAL_SUGGESTIONS.filter(
    (r) => !r.recipeSteps || r.recipeSteps.length === 0,
  )
  const bundledHasSteps = MEAL_SUGGESTIONS.length - bundledMissingSteps.length

  // Firestore overlay/full docs
  const snapshot = await adminDb.collection('recipes').get()
  const firestoreDocs = snapshot.docs.map((d) => ({ id: d.id, data: d.data() }))

  // Build overlay map: bundled-id → Firestore overlay (which may
  // populate recipeSteps even if the bundled source doesn't)
  const overlayById = new Map<string, FirebaseFirestore.DocumentData>()
  for (const d of firestoreDocs) overlayById.set(d.id, d.data)

  let bundledStillMissing = 0
  let bundledOverlayProvides = 0
  for (const recipe of bundledMissingSteps) {
    const overlay = overlayById.get(recipe.id)
    if (overlay?.recipeSteps?.length > 0) bundledOverlayProvides++
    else bundledStillMissing++
  }

  // Firestore-only (full) recipes — name + status set, no bundled
  // counterpart. Count those missing recipeSteps directly.
  const bundledIds = new Set(MEAL_SUGGESTIONS.map((r) => r.id))
  const firestoreOnly = firestoreDocs.filter((d) => !bundledIds.has(d.id))
  const firestoreOnlyMissingSteps = firestoreOnly.filter(
    (d) => !d.data.recipeSteps?.length,
  )

  console.log('=== Recipe steps audit ===')
  console.log(`Bundled MEAL_SUGGESTIONS total: ${MEAL_SUGGESTIONS.length}`)
  console.log(`  with steps in source: ${bundledHasSteps}`)
  console.log(`  missing in source, overlaid by Firestore: ${bundledOverlayProvides}`)
  console.log(`  STILL missing (need backfill): ${bundledStillMissing}`)
  console.log()
  console.log(`Firestore-only full recipes total: ${firestoreOnly.length}`)
  console.log(`  missing recipeSteps (need backfill): ${firestoreOnlyMissingSteps.length}`)
  console.log()
  console.log(`TOTAL needing backfill: ${bundledStillMissing + firestoreOnlyMissingSteps.length}`)
  console.log()

  if (bundledStillMissing > 0) {
    console.log('Bundled missing (first 20):')
    let shown = 0
    for (const recipe of bundledMissingSteps) {
      const overlay = overlayById.get(recipe.id)
      if (overlay?.recipeSteps?.length > 0) continue
      console.log(`  - ${recipe.id}: ${recipe.name} (${recipe.mealType})`)
      shown++
      if (shown >= 20) break
    }
    if (bundledStillMissing > 20) console.log(`  ...and ${bundledStillMissing - 20} more`)
  }

  if (firestoreOnlyMissingSteps.length > 0) {
    console.log()
    console.log('Firestore-only missing (first 20):')
    for (const d of firestoreOnlyMissingSteps.slice(0, 20)) {
      console.log(`  - ${d.id}: ${d.data.name || '(no name)'}`)
    }
    if (firestoreOnlyMissingSteps.length > 20)
      console.log(`  ...and ${firestoreOnlyMissingSteps.length - 20} more`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('[audit] fatal:', err)
  process.exit(1)
})
