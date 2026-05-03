/**
 * scripts/import-usda-branded.ts
 *
 * Bulk-import USDA FoodData Central "Branded Foods" catalog into the
 * product_database Firestore collection.
 *
 * Usage:
 *   1. Download the Branded Foods CSV zip from:
 *      https://fdc.nal.usda.gov/download-datasets.html
 *      ("Branded Foods" → "Download CSV")
 *   2. Unzip somewhere (e.g. C:\usda-branded\)
 *   3. Run: npm run usda:import -- "C:\path\to\unzipped\dir"
 *
 * What it does:
 *   - Streams food.csv to build fdc_id → description map (~400k rows)
 *   - Streams branded_food.csv to build fdc_id → branded metadata map
 *   - Streams food_nutrient.csv (the big one — millions of rows) and
 *     keeps only target nutrients per fdc_id
 *   - For each branded food with a UPC AND a complete nutrition profile
 *     (energy + protein + carbs + fat present), upserts a doc into
 *     product_database keyed by UPC. Set with merge:true so re-runs
 *     update existing rows rather than creating duplicates.
 *
 * Defaults applied:
 *   - Filter: skips rows missing core nutrients (calories, protein, carbs, fat)
 *   - Images: leaves imageUrl empty — populated lazily via OFF on first
 *     end-user scan (existing /api/products/lookup hybrid path)
 *   - Idempotent: doc id = UPC, set with merge — re-run safely overwrites
 *
 * Cost estimate: ~400k Firestore writes ≈ $0.72 one-time, ~$1-2/month storage
 * Runtime estimate: 15-30 min depending on disk speed
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import csvParser from 'csv-parser'

// Load .env.local before lib/firebase-admin is imported, since it reads
// env vars at module init time. Next.js auto-loads these in app code,
// but scripts run via tsx don't get that for free.
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

// Dynamic import (after dotenv.config has run) so the admin module sees
// the credentials. ES module imports hoist to the top regardless of
// where they appear in source, so a static import of firebase-admin
// would race the dotenv call.
let adminDb: import('firebase-admin/firestore').Firestore

// USDA nutrient IDs (from FoodData Central nutrient.csv reference)
const NUTRIENT_IDS = {
  energyKcal: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
  fiber: 1079,
  sodium: 1093, // mg
  sugars: 2000,
  saturatedFat: 1257,
  cholesterol: 1253, // mg
  calcium: 1087, // mg
  iron: 1089, // mg
  potassium: 1092, // mg
  vitaminD: 1110, // IU
} as const

const TARGET_NUTRIENT_IDS = new Set<number>(Object.values(NUTRIENT_IDS))

interface FoodRow {
  fdc_id: string
  description: string
}

interface BrandedFoodRow {
  fdc_id: string
  brand_owner: string
  brand_name: string
  gtin_upc: string
  ingredients: string
  serving_size: string
  serving_size_unit: string
  household_serving_fulltext: string
  branded_food_category: string
}

interface NutrientRow {
  fdc_id: string
  nutrient_id: string
  amount: string
}

type NutrientMap = Map<string, Map<number, number>>

const csvDir = process.argv[2]
if (!csvDir) {
  console.error('Usage: npm run usda:import -- <path-to-unzipped-csv-dir>')
  process.exit(1)
}

if (!fs.existsSync(csvDir)) {
  console.error(`Directory not found: ${csvDir}`)
  process.exit(1)
}

const FOOD_CSV = path.join(csvDir, 'food.csv')
const BRANDED_CSV = path.join(csvDir, 'branded_food.csv')
const NUTRIENT_CSV = path.join(csvDir, 'food_nutrient.csv')

for (const f of [FOOD_CSV, BRANDED_CSV, NUTRIENT_CSV]) {
  if (!fs.existsSync(f)) {
    console.error(`Missing required CSV: ${f}`)
    console.error('Make sure you unzipped the full Branded Foods archive.')
    process.exit(1)
  }
}

function streamCsv<T>(file: string, onRow: (row: T) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(csvParser())
      .on('data', onRow)
      .on('end', () => resolve())
      .on('error', reject)
  })
}

async function main() {
  const startTime = Date.now()

  // Dynamically import after env vars are loaded
  const adminMod = await import('../lib/firebase-admin')
  adminDb = adminMod.adminDb

  // ── Pass 1: food.csv → fdc_id → description ─────────────────────────────
  console.log(`[USDA Import] Pass 1: loading descriptions from ${path.basename(FOOD_CSV)}`)
  const descByFdc = new Map<string, string>()
  let foodRows = 0
  await streamCsv<FoodRow>(FOOD_CSV, (row) => {
    foodRows++
    descByFdc.set(row.fdc_id, row.description)
    if (foodRows % 100_000 === 0) console.log(`  ${foodRows.toLocaleString()} food rows`)
  })
  console.log(`[USDA Import] Pass 1 done: ${foodRows.toLocaleString()} foods loaded`)

  // ── Pass 2: branded_food.csv → fdc_id → metadata ────────────────────────
  console.log(`[USDA Import] Pass 2: loading branded metadata from ${path.basename(BRANDED_CSV)}`)
  const brandedByFdc = new Map<string, BrandedFoodRow>()
  let brandedRows = 0
  await streamCsv<BrandedFoodRow>(BRANDED_CSV, (row) => {
    brandedRows++
    if (row.gtin_upc && row.gtin_upc.trim()) {
      brandedByFdc.set(row.fdc_id, row)
    }
    if (brandedRows % 100_000 === 0) console.log(`  ${brandedRows.toLocaleString()} branded rows`)
  })
  console.log(`[USDA Import] Pass 2 done: ${brandedRows.toLocaleString()} branded rows; ${brandedByFdc.size.toLocaleString()} have UPC`)

  // ── Pass 3: stream food_nutrient.csv with boundary-flush ────────────────
  //
  // food_nutrient.csv is sorted by fdc_id (USDA convention). We accumulate
  // nutrients for the current fdc_id, and as soon as fdc_id changes, we
  // flush the previous fdc_id's product to Firestore. This keeps memory
  // bounded — at any moment we hold only the current fdc_id's nutrients
  // (~13 entries) plus the in-flight batch. The earlier in-memory map of
  // 26M entries blew the V8 heap.
  console.log(`[USDA Import] Pass 3: streaming nutrients with boundary-flush from ${path.basename(NUTRIENT_CSV)}`)
  const collection = adminDb.collection('product_database')
  const stats = { written: 0, skippedNoNutrition: 0, skippedDuplicate: 0, errors: 0 }
  const seenUpcs = new Set<string>()
  const now = new Date()
  const BATCH_LIMIT = 500

  let batch = adminDb.batch()
  let batchSize = 0
  let nutrientRows = 0
  let kept = 0

  let currentFdcId: string | null = null
  let currentNutrients: Map<number, number> | null = null

  /**
   * Look up branded info + descriptions for the given fdc_id, build the
   * product record, and queue it on the active batch. Commits the batch
   * when it hits BATCH_LIMIT.
   */
  async function flushFdc(fdcId: string, nutMap: Map<number, number>) {
    const branded = brandedByFdc.get(fdcId)
    if (!branded) return // not a branded food (foundation foods etc.)

    const upc = branded.gtin_upc.trim()
    if (!upc) return

    if (seenUpcs.has(upc)) {
      stats.skippedDuplicate++
      return
    }

    const calories = nutMap.get(NUTRIENT_IDS.energyKcal)
    const protein = nutMap.get(NUTRIENT_IDS.protein)
    const carbs = nutMap.get(NUTRIENT_IDS.carbs)
    const fat = nutMap.get(NUTRIENT_IDS.fat)
    if (calories === undefined || protein === undefined || carbs === undefined || fat === undefined) {
      stats.skippedNoNutrition++
      return
    }

    seenUpcs.add(upc)

    const description = descByFdc.get(fdcId) || branded.brand_name || 'Unknown Product'
    const productName = description.length > 200 ? description.slice(0, 200) : description

    const nutrition: Record<string, number | string> = {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: Math.round((nutMap.get(NUTRIENT_IDS.fiber) ?? 0) * 10) / 10,
      sodium: Math.round(nutMap.get(NUTRIENT_IDS.sodium) ?? 0),
      servingSize: branded.household_serving_fulltext || branded.serving_size
        ? `${branded.serving_size}${branded.serving_size_unit}`.trim()
        : '',
    }
    const sugars = nutMap.get(NUTRIENT_IDS.sugars)
    const satFat = nutMap.get(NUTRIENT_IDS.saturatedFat)
    const chol = nutMap.get(NUTRIENT_IDS.cholesterol)
    const calcium = nutMap.get(NUTRIENT_IDS.calcium)
    const iron = nutMap.get(NUTRIENT_IDS.iron)
    const potassium = nutMap.get(NUTRIENT_IDS.potassium)
    const vitD = nutMap.get(NUTRIENT_IDS.vitaminD)
    if (sugars !== undefined) nutrition.sugars = Math.round(sugars * 10) / 10
    if (satFat !== undefined) nutrition.saturatedFat = Math.round(satFat * 10) / 10
    if (chol !== undefined) nutrition.cholesterol = Math.round(chol * 10) / 10
    if (calcium !== undefined) nutrition.calcium = Math.round(calcium * 10) / 10
    if (iron !== undefined) nutrition.iron = Math.round(iron * 10) / 10
    if (potassium !== undefined) nutrition.potassium = Math.round(potassium * 10) / 10
    if (vitD !== undefined) nutrition.vitaminD = Math.round(vitD * 10) / 10

    batch.set(
      collection.doc(upc),
      {
        barcode: upc,
        productName,
        brand: branded.brand_owner || branded.brand_name || '',
        imageUrl: '', // populated lazily via OFF on first end-user scan
        category: branded.branded_food_category || 'other',
        nutrition,
        quality: {
          verified: false,
          verificationCount: 0,
          dataSource: 'usda',
          confidence: 80,
        },
        stats: {
          totalScans: 0,
          uniqueUsers: 0,
          totalPurchases: 0,
          firstSeenAt: now,
          lastSeenAt: now,
        },
        usage: {
          linkedRecipes: 0,
          popularityScore: 0,
        },
        usdaFdcId: parseInt(fdcId, 10),
        ingredients: branded.ingredients || '',
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    )
    batchSize++
    stats.written++

    if (batchSize >= BATCH_LIMIT) {
      try {
        await batch.commit()
      } catch (err) {
        stats.errors++
        console.error('Batch commit failed:', (err as Error).message)
      }
      batch = adminDb.batch()
      batchSize = 0
      if (stats.written % 5_000 === 0) {
        console.log(`  ${stats.written.toLocaleString()} written so far`)
      }
    }
  }

  // Stream rows via async iteration — naturally serializes our boundary-
  // flush awaits without manual pause/resume gymnastics.
  const stream = fs.createReadStream(NUTRIENT_CSV).pipe(csvParser())
  for await (const row of stream as AsyncIterable<NutrientRow>) {
    nutrientRows++
    if (nutrientRows % 1_000_000 === 0) {
      console.log(`  ${nutrientRows.toLocaleString()} nutrient rows scanned, ${kept.toLocaleString()} relevant, ${stats.written.toLocaleString()} written`)
    }

    const fdcId = row.fdc_id

    // Boundary: fdc_id changed → flush previous fdc's accumulated nutrients.
    if (currentFdcId !== null && currentFdcId !== fdcId && currentNutrients) {
      try {
        await flushFdc(currentFdcId, currentNutrients)
      } catch (err) {
        console.error('Flush error:', (err as Error).message)
        stats.errors++
      }
      currentNutrients = null
    }

    currentFdcId = fdcId

    const nutrientId = parseInt(row.nutrient_id, 10)
    if (!TARGET_NUTRIENT_IDS.has(nutrientId)) continue
    if (!brandedByFdc.has(fdcId)) continue
    const amount = parseFloat(row.amount)
    if (Number.isNaN(amount)) continue

    if (!currentNutrients) currentNutrients = new Map()
    currentNutrients.set(nutrientId, amount)
    kept++
  }

  // Flush the final fdc_id
  if (currentFdcId !== null && currentNutrients) {
    try {
      await flushFdc(currentFdcId, currentNutrients)
    } catch (err) {
      stats.errors++
    }
  }

  // Final batch commit
  if (batchSize > 0) {
    try {
      await batch.commit()
    } catch (err) {
      stats.errors++
      console.error('Final batch commit failed:', (err as Error).message)
    }
  }

  console.log(`[USDA Import] Pass 3 done: ${nutrientRows.toLocaleString()} rows scanned, ${kept.toLocaleString()} nutrients kept`)

  const elapsed = Math.round((Date.now() - startTime) / 1000)
  console.log('\n[USDA Import] Complete')
  console.log(`  Written:                ${stats.written.toLocaleString()}`)
  console.log(`  Skipped (no nutrition): ${stats.skippedNoNutrition.toLocaleString()}`)
  console.log(`  Skipped (dup UPC):      ${stats.skippedDuplicate.toLocaleString()}`)
  console.log(`  Errors:                 ${stats.errors.toLocaleString()}`)
  console.log(`  Elapsed:                ${elapsed}s`)
  console.log('\n  Audit log will not be written from a CLI script — record this manually if needed.')
}

main().catch((err) => {
  console.error('[USDA Import] Fatal:', err)
  process.exit(1)
})
