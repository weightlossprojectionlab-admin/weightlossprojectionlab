/**
 * One-shot: seed the user's shopping list with the 6 real-UPC items
 * that match what's printed on public/sprouts-receipt-*.html. After running
 * this:
 *
 *   1. Open /shopping/active on your phone — items appear in "Pending"
 *   2. Tap (or barcode-scan) each one to mark "Found in cart"
 *   3. Checkout → snap the test receipt
 *   4. Server log should show knownItemCount: 6 and Gemini should
 *      match each printed line back to the cart entry by UPC equality
 *      (UPCs are real product_database entries)
 *
 * Idempotent: if a doc with the same UPC already exists for the user,
 * we skip it rather than insert a duplicate.
 *
 * Run:
 *   npx tsx scripts/seed-test-shopping-list.ts            # dry-run
 *   npx tsx scripts/seed-test-shopping-list.ts --live     # write
 *
 * Cleanup:
 *   npx tsx scripts/seed-test-shopping-list.ts --delete --live
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const TARGET_USER_ID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'
const SEED_MARKER = 'test-receipt-seed' // tag on each doc so cleanup is surgical

// Real UPCs confirmed in product_database via the pull script.
// `displayName` is what we add to the shopping list (what the user
// sees + what we pass to Gemini as knownItems[].name). It mirrors
// the cleaned-up cart-row name the in-store flow would normally show.
// `receiptName` is what the synthetic receipt prints — a typical
// abbreviated POS line. Gemini's job is to match these to the
// displayName via UPC equality.
const SEED_ITEMS = [
  {
    upc: '016000275645',
    displayName: 'Toasted Whole Grain Oat Cereal',
    receiptName: 'OAT CEREAL',
    priceCents: 499,
    category: 'pantry' as const,
  },
  {
    upc: '078742433042',
    displayName: 'Sweetened Condensed Milk',
    receiptName: 'COND MILK',
    priceCents: 249,
    category: 'pantry' as const,
  },
  {
    upc: '021130049134',
    displayName: 'Large Eggs',
    receiptName: 'LG EGGS',
    priceCents: 549,
    category: 'eggs' as const,
  },
  {
    upc: '767119318395',
    displayName: 'Avocado',
    receiptName: 'AVOCADO',
    priceCents: 199,
    quantity: 2,
    category: 'produce' as const,
  },
  {
    upc: '00795709020021',
    displayName: 'Aussie Smooth Whole Milk Yogurt 32oz',
    receiptName: 'AUSSIE YOGURT 32OZ',
    priceCents: 599,
    category: 'dairy' as const,
  },
  {
    upc: '00041143090541',
    displayName: 'Chocolate Peanut Butter Yogurt Raisins',
    receiptName: 'CHOC PB YOG RSN',
    priceCents: 649,
    category: 'snacks' as const,
  },
]

const LIVE = process.argv.includes('--live')
const DELETE = process.argv.includes('--delete')

async function main() {
  const { adminDb } = await import('../lib/firebase-admin')
  const itemsCol = adminDb.collection('shopping_items')

  console.log(`\nMode: ${LIVE ? (DELETE ? 'LIVE DELETE' : 'LIVE SEED') : 'DRY RUN'}`)
  console.log(`Target userId: ${TARGET_USER_ID}`)

  // Important: `shopping_items.householdId` is NOT the id of a doc in
  // the `households` collection. Per hooks/useShopping.ts:111 the
  // shopping-list query is `where('householdId', '==', userId)` —
  // i.e. shopping_items.householdId is the OWNER's user id (used as a
  // caregiver-access scope key). The "household" concept in the
  // shopping schema predates the canonical Household doc shipped on
  // 2026-05-11; the backfill at scripts/migrate-backfill-shopping-
  // householdid.ts normalized every existing item to set
  // householdId == userId. So that's what we set here too.
  const householdId = TARGET_USER_ID
  console.log('\n--- Shopping-list scope ---')
  console.log(`  householdId = ${householdId} (= TARGET_USER_ID; see useShopping query)`)

  // --- Cleanup path ---
  if (DELETE) {
    console.log('\n--- Deleting seeded test items ---')
    const snap = await itemsCol
      .where('userId', '==', TARGET_USER_ID)
      .where('manualIngredientName', '==', SEED_MARKER)
      .get()
    console.log(`  Matched ${snap.size} seeded items`)
    if (snap.size === 0) {
      console.log('  Nothing to delete.')
      return
    }
    if (!LIVE) {
      console.log('  (dry run — pass --live to actually delete)')
      return
    }
    let batch = adminDb.batch()
    for (const doc of snap.docs) batch.delete(doc.ref)
    await batch.commit()
    console.log(`  ✓ Deleted ${snap.size} items`)
    return
  }

  // --- Seed path ---
  console.log('\n--- Items to seed ---')
  for (const it of SEED_ITEMS) {
    console.log(`  ${it.upc.padEnd(15)} ${it.displayName.slice(0, 40).padEnd(40)} qty=${it.quantity ?? 1}`)
  }

  if (!LIVE) {
    console.log('\n(dry run — pass --live to actually seed)')
    return
  }

  console.log('\n--- Seeding ---')
  let inserted = 0
  let skipped = 0
  const now = new Date()
  const FieldValue = (await import('firebase-admin/firestore')).Timestamp
  for (const it of SEED_ITEMS) {
    // Skip if there's already a needed (not-yet-purchased) row with
    // this barcode for the user — idempotent reruns.
    const existing = await itemsCol
      .where('userId', '==', TARGET_USER_ID)
      .where('barcode', '==', it.upc)
      .where('needed', '==', true)
      .limit(1)
      .get()
    if (!existing.empty) {
      console.log(`  skip  ${it.upc}  ${it.displayName.slice(0, 40)} (already on list)`)
      skipped++
      continue
    }
    const docRef = itemsCol.doc()
    await docRef.set({
      userId: TARGET_USER_ID,
      householdId: householdId ?? null,
      barcode: it.upc,
      productName: it.displayName,
      brand: '',
      imageUrl: '',
      category: it.category,
      isManual: true,
      // Tag for cleanup. We re-use manualIngredientName since it's a
      // free-text field already on the schema and the in-store flow
      // doesn't render it prominently.
      manualIngredientName: SEED_MARKER,
      recipeIds: [],
      primaryRecipeId: null,
      inStock: false,
      quantity: it.quantity ?? 1,
      unit: 'item',
      displayQuantity: `${it.quantity ?? 1}`,
      location: 'pantry',
      expiresAt: null,
      isPerishable: ['produce', 'eggs', 'dairy', 'meat', 'seafood', 'bakery'].includes(it.category),
      typicalShelfLife: null,
      needed: true,
      priority: 'medium',
      lastPurchased: null,
      preferredStore: null,
      source: 'manual',
      purchaseHistory: [],
      createdAt: FieldValue.fromDate(now),
      updatedAt: FieldValue.fromDate(now),
    })
    console.log(`  ✓     ${it.upc}  ${it.displayName.slice(0, 40)}`)
    inserted++
  }
  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}.`)
  if (inserted > 0) {
    console.log('\nNext step: open /shopping/active on your phone — items should appear in Pending.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
