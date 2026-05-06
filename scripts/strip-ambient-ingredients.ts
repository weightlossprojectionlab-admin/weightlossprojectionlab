/**
 * scripts/strip-ambient-ingredients.ts
 *
 * One-shot cleanup: walks recipe overlay docs in Firestore and
 * strips ambient-resource / equipment strings from the
 * `ingredients` array. These strings shouldn't appear as grocery
 * items in the missing-ingredients shopping flow but historically
 * were emitted by the Gemini recipe generator before the prompt
 * was updated.
 *
 * Idempotent — only writes when something was actually stripped.
 *
 * Run: tsx scripts/strip-ambient-ingredients.ts
 *
 * Optional env:
 *   DRY_RUN=1     — log what would be stripped, don't persist
 *   ONLY_ID=foo   — process only the recipe with this id
 */
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

/**
 * Ambient ingredient phrases. Match against the ingredient string
 * after lowercasing, trimming, and stripping leading quantity
 * ("1 cup", "2 tbsp", "1/4 tsp", "1 inch of"). Substring matching
 * after that — so "cold water" catches both "cold water" and
 * "1 inch of cold water" and "Cold water (about 4 cups)".
 *
 * Curated to AVOID false positives:
 *   - "salt" alone is grocery (recipe-component salt)
 *   - "salt to taste" is ambient (always have salt for seasoning)
 *   - "water" alone is ambient
 *   - "coconut water" is grocery (not stripped because the phrase
 *     "water" only matches when the ingredient AFTER quantity-strip
 *     equals "water" or starts with "water " or ends in
 *     " water" with cold/hot/warm/tap prefix)
 */
const AMBIENT_PHRASES = [
  // Water (specific forms only — not bare "water" since some
  // recipes ARE water-as-component like coconut water, rose water)
  'cold water',
  'hot water',
  'warm water',
  'tap water',
  'water for boiling',
  'water to cover',
  // Ice (always free)
  'ice',
  'ice cubes',
  'ice bath',
  // Salt + pepper "to taste" — keep "1 tsp salt" (grocery-ish)
  'salt to taste',
  'pepper to taste',
  'salt and pepper',
  'salt and pepper to taste',
  'kosher salt to taste',
  'black pepper to taste',
  'fresh ground pepper to taste',
  // Cooking-prep oils (when used for the pan, not the dish)
  'cooking spray',
  'oil for greasing',
  'oil for the pan',
  'oil for greasing the pan',
  'nonstick spray',
  'butter for greasing',
  // Equipment (not consumed)
  'aluminum foil',
  'foil',
  'parchment paper',
  'plastic wrap',
  'paper towel',
  'paper towels',
  'kitchen string',
  'toothpick',
  'toothpicks',
  'ziploc bag',
  'ziploc bags',
]

const QUANTITY_LEADING_REGEX =
  /^[\d./\s]+(?:cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?|inch(?:es)?|of)\s+/i

function normalize(ingredient: string): string {
  return ingredient
    .toLowerCase()
    .trim()
    .replace(QUANTITY_LEADING_REGEX, '') // strip leading quantity
    .replace(/[(),.]/g, '') // strip punctuation
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
}

function isAmbient(ingredient: string): { ambient: boolean; matched?: string } {
  const norm = normalize(ingredient)
  // Bare "water" alone — ambient (would be tap water)
  if (norm === 'water') return { ambient: true, matched: 'water' }
  for (const phrase of AMBIENT_PHRASES) {
    if (norm === phrase) return { ambient: true, matched: phrase }
    // Allow "X for greasing" style matches with phrase prefix
    if (norm.startsWith(phrase + ' ') || norm.endsWith(' ' + phrase)) {
      return { ambient: true, matched: phrase }
    }
  }
  return { ambient: false }
}

async function main() {
  const { adminDb } = await import('../lib/firebase-admin')
  const { Timestamp } = await import('firebase-admin/firestore')

  const DRY_RUN = process.env.DRY_RUN === '1'
  const ONLY_ID = process.env.ONLY_ID

  console.log('[strip-ambient] starting', { DRY_RUN, ONLY_ID })

  let query: FirebaseFirestore.Query = adminDb.collection('recipes')
  if (ONLY_ID) {
    const doc = await adminDb.collection('recipes').doc(ONLY_ID).get()
    if (!doc.exists) {
      console.log(`[strip-ambient] recipe not found: ${ONLY_ID}`)
      process.exit(1)
    }
    await processDoc(doc, DRY_RUN, Timestamp)
    process.exit(0)
  }

  const snapshot = await query.get()
  console.log(`[strip-ambient] scanning ${snapshot.size} recipe overlay docs`)

  let touched = 0
  let scanned = 0

  for (const doc of snapshot.docs) {
    scanned++
    const wasUpdated = await processDoc(doc, DRY_RUN, Timestamp)
    if (wasUpdated) touched++
  }

  console.log('[strip-ambient] done', { scanned, touched })
  process.exit(0)
}

async function processDoc(
  doc: FirebaseFirestore.DocumentSnapshot,
  dryRun: boolean,
  Timestamp: typeof import('firebase-admin/firestore').Timestamp,
): Promise<boolean> {
  const data = doc.data()
  if (!data) return false
  const ingredients: string[] = Array.isArray(data.ingredients) ? data.ingredients : []
  if (!ingredients.length) return false

  const stripped: string[] = []
  const kept: string[] = []
  for (const ing of ingredients) {
    const result = isAmbient(ing)
    if (result.ambient) stripped.push(`${ing} (matched: ${result.matched})`)
    else kept.push(ing)
  }

  if (stripped.length === 0) return false

  console.log(`[strip-ambient] ${doc.id}: stripped ${stripped.length}`)
  for (const s of stripped) console.log(`  − ${s}`)

  if (dryRun) {
    console.log(`  DRY_RUN: would write ${kept.length} kept ingredients`)
    return true
  }

  await doc.ref.update({
    ingredients: kept,
    updatedAt: Timestamp.now(),
  })
  return true
}

main().catch((err) => {
  console.error('[strip-ambient] fatal:', err)
  process.exit(1)
})
