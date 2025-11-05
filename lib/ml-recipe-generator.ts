/**
 * ML-Powered Recipe Generator
 *
 * Generates recipes from product association data by analyzing
 * what products users frequently buy together.
 */

import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { RecipeIngredient } from './meal-suggestions'

interface ProductAssociation {
  barcode: string
  productName: string
  brand?: string
  category?: string
  relatedProducts: Array<{
    barcode: string
    productName: string
    brand?: string
    category?: string
    support: number
    confidence: number
    lift: number
    sessionCount: number
  }>
  analyzedAt: Date
  totalSessions: number
}

interface Product {
  barcode: string
  productName: string
  brand: string
  category: string
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    saturatedFat?: number
    transFat?: number
    fiber: number
    sugars?: number
    addedSugars?: number
    sodium: number
    cholesterol?: number
    vitaminD?: number
    calcium?: number
    iron?: number
    potassium?: number
    servingSize: string
  }
}

interface GeneratedRecipe {
  id: string
  name: string
  description: string
  mealType: string
  prepTime: number
  servingSize: number
  ingredientsV2: RecipeIngredient[]
  ingredients: string[]
  recipeSteps: string[]
  cookingTips: string[]
  calories: number
  macros: {
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  autoCalculatedNutrition: boolean
  dietaryTags: string[]
  allergens: string[]
  status: 'draft'
  generatedByAI: boolean
  mlGenerated: boolean
  mlSource: 'product_associations'
  mlConfidence: number
  requiresCooking: boolean
  createdAt: Date
  updatedAt: Date
  popularity: number
}

const MIN_LIFT_FOR_RECIPE = 1.5 // Only use strong associations
const MIN_INGREDIENTS = 2
const MAX_INGREDIENTS = 8
const RECIPES_PER_RUN = 50

/**
 * Determine meal type from product categories
 */
function determineMealType(products: Product[]): string {
  const categories = products.map(p => p.category.toLowerCase())

  // Breakfast indicators
  if (categories.includes('eggs') ||
      products.some(p => p.productName.toLowerCase().includes('cereal')) ||
      products.some(p => p.productName.toLowerCase().includes('oatmeal')) ||
      products.some(p => p.productName.toLowerCase().includes('yogurt'))) {
    return 'breakfast'
  }

  // Lunch/Dinner indicators
  if (categories.includes('meat') || categories.includes('seafood')) {
    return Math.random() > 0.5 ? 'lunch' : 'dinner'
  }

  // Snack indicators
  if (products.length <= 2 &&
      (categories.includes('beverages') ||
       products.some(p => p.productName.toLowerCase().includes('bar')))) {
    return 'snack'
  }

  // Default distribution
  const rand = Math.random()
  if (rand < 0.3) return 'breakfast'
  if (rand < 0.6) return 'lunch'
  if (rand < 0.9) return 'dinner'
  return 'snack'
}

/**
 * Determine if recipe requires cooking
 */
function requiresCooking(products: Product[]): boolean {
  const categories = products.map(p => p.category.toLowerCase())
  const names = products.map(p => p.productName.toLowerCase())

  // Requires cooking
  if (categories.includes('meat') ||
      categories.includes('seafood') ||
      categories.includes('eggs') ||
      names.some(n => n.includes('pasta') || n.includes('rice'))) {
    return true
  }

  // No cooking needed
  if (categories.every(c => ['produce', 'dairy', 'beverages', 'bakery'].includes(c))) {
    return false
  }

  return true
}

/**
 * Generate recipe name from products
 */
function generateRecipeName(products: Product[], mealType: string): string {
  const mainProducts = products.slice(0, 3)

  // Extract key ingredients
  const keyIngredients = mainProducts.map(p => {
    const name = p.productName
      .replace(p.brand || '', '')
      .replace(/organic/gi, '')
      .replace(/natural/gi, '')
      .trim()
    return name.split(' ')[0] || name
  })

  // Recipe name templates
  const templates = [
    `${keyIngredients.join(' & ')} ${capitalize(mealType)}`,
    `Simple ${keyIngredients.join(' and ')}`,
    `${keyIngredients[0]} with ${keyIngredients.slice(1).join(' and ')}`,
    `Healthy ${keyIngredients.join(' ')} Bowl`,
    `Quick ${keyIngredients.join(' ')} Recipe`
  ]

  return templates[Math.floor(Math.random() * templates.length)]
}

/**
 * Generate recipe description
 */
function generateDescription(products: Product[], mealType: string, requiresCooking: boolean): string {
  const cookingStyle = requiresCooking ? 'cooked' : 'no-cook'
  const healthBenefits = []

  // Analyze nutrition
  const totalProtein = products.reduce((sum, p) => sum + (p.nutrition.protein || 0), 0)
  const totalFiber = products.reduce((sum, p) => sum + (p.nutrition.fiber || 0), 0)

  if (totalProtein > 20) healthBenefits.push('high-protein')
  if (totalFiber > 5) healthBenefits.push('high-fiber')

  const benefits = healthBenefits.length > 0 ? ` This ${healthBenefits.join(', ')} recipe` : ' This recipe'

  return `A delicious ${cookingStyle} ${mealType} made with ingredients frequently bought together by our users.${benefits} is based on real shopping patterns and designed for convenience.`
}

/**
 * Generate cooking steps
 */
function generateSteps(products: Product[], requiresCooking: boolean, mealType: string): string[] {
  const steps: string[] = []

  // Prep step
  const prepItems = products
    .filter(p => p.category === 'produce')
    .map(p => p.productName.split(' ')[0])

  if (prepItems.length > 0) {
    steps.push(`Prepare ingredients: wash and chop ${prepItems.join(', ')}.`)
  }

  if (requiresCooking) {
    // Cooking steps
    const meatProduct = products.find(p => ['meat', 'seafood'].includes(p.category))
    if (meatProduct) {
      steps.push(`Cook ${meatProduct.productName.toLowerCase()} according to package directions or until fully cooked.`)
    }

    const eggProduct = products.find(p => p.category === 'eggs')
    if (eggProduct) {
      steps.push(`In a pan, cook eggs to your preferred style (scrambled, fried, or poached).`)
    }

    steps.push(`Combine all cooked ingredients in a serving dish.`)
  } else {
    // No-cook assembly
    steps.push(`Combine all ingredients in a bowl or plate.`)
  }

  // Final step
  const toppings = products.filter(p => ['dairy', 'pantry'].includes(p.category))
  if (toppings.length > 0) {
    steps.push(`Top with ${toppings.map(p => p.productName.toLowerCase()).join(' and ')}.`)
  }

  steps.push(`Serve immediately and enjoy!`)

  return steps
}

/**
 * Generate cooking tips
 */
function generateTips(products: Product[], mealType: string): string[] {
  const tips: string[] = []

  // Category-specific tips
  if (products.some(p => p.category === 'produce')) {
    tips.push('Use fresh, in-season produce for best flavor.')
  }

  if (products.some(p => p.category === 'meat')) {
    tips.push('Let meat rest for 5 minutes after cooking for optimal tenderness.')
  }

  // General tips
  tips.push('Adjust seasoning to taste with salt and pepper.')
  tips.push('This recipe can be easily scaled for meal prep.')

  return tips
}

/**
 * Determine dietary tags
 */
function determineDietaryTags(products: Product[]): string[] {
  const tags: string[] = []
  const categories = products.map(p => p.category.toLowerCase())

  // Check for dietary restrictions
  const hasMeat = categories.includes('meat')
  const hasSeafood = categories.includes('seafood')
  const hasDairy = categories.includes('dairy')
  const hasEggs = categories.includes('eggs')

  if (!hasMeat && !hasSeafood) {
    tags.push('vegetarian')
  }

  if (!hasMeat && !hasSeafood && !hasDairy && !hasEggs) {
    tags.push('vegan')
  }

  // Nutrition-based tags
  const totalProtein = products.reduce((sum, p) => sum + (p.nutrition.protein || 0), 0)
  const totalCarbs = products.reduce((sum, p) => sum + (p.nutrition.carbs || 0), 0)
  const totalCalories = products.reduce((sum, p) => sum + (p.nutrition.calories || 0), 0)

  if (totalProtein > 25) tags.push('high-protein')
  if (totalCarbs < 20) tags.push('low-carb')
  if (totalCalories < 400) tags.push('low-calorie')

  return tags
}

/**
 * Determine allergens
 */
function determineAllergens(products: Product[]): string[] {
  const allergens: string[] = []
  const categories = products.map(p => p.category.toLowerCase())
  const names = products.map(p => p.productName.toLowerCase())

  if (categories.includes('dairy')) allergens.push('dairy')
  if (categories.includes('eggs')) allergens.push('eggs')
  if (categories.includes('seafood')) allergens.push('fish')
  if (names.some(n => n.includes('soy'))) allergens.push('soy')
  if (names.some(n => n.includes('wheat') || n.includes('bread'))) allergens.push('gluten')
  if (names.some(n => n.includes('nut') || n.includes('almond') || n.includes('peanut'))) allergens.push('tree nuts')

  return Array.from(new Set(allergens))
}

/**
 * Calculate nutrition per serving
 */
function calculateNutrition(products: Product[], servingSize: number): {
  calories: number
  macros: { protein: number; carbs: number; fat: number; fiber: number }
} {
  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  let totalFiber = 0

  products.forEach(product => {
    totalCalories += product.nutrition.calories || 0
    totalProtein += product.nutrition.protein || 0
    totalCarbs += product.nutrition.carbs || 0
    totalFat += product.nutrition.fat || 0
    totalFiber += product.nutrition.fiber || 0
  })

  return {
    calories: Math.round(totalCalories / servingSize),
    macros: {
      protein: Math.round((totalProtein / servingSize) * 10) / 10,
      carbs: Math.round((totalCarbs / servingSize) * 10) / 10,
      fat: Math.round((totalFat / servingSize) * 10) / 10,
      fiber: Math.round((totalFiber / servingSize) * 10) / 10
    }
  }
}

/**
 * Build a recipe from a product association
 */
async function buildRecipe(
  mainProduct: Product,
  relatedProducts: Product[],
  avgLift: number
): Promise<GeneratedRecipe | null> {
  try {
    const allProducts = [mainProduct, ...relatedProducts]

    // Validate ingredient count
    if (allProducts.length < MIN_INGREDIENTS || allProducts.length > MAX_INGREDIENTS) {
      return null
    }

    // Determine recipe properties
    const mealType = determineMealType(allProducts)
    const needsCooking = requiresCooking(allProducts)
    const servingSize = 2

    // Generate recipe content
    const name = generateRecipeName(allProducts, mealType)
    const description = generateDescription(allProducts, mealType, needsCooking)
    const steps = generateSteps(allProducts, needsCooking, mealType)
    const tips = generateTips(allProducts, mealType)
    const dietaryTags = determineDietaryTags(allProducts)
    const allergens = determineAllergens(allProducts)

    // Build ingredients
    const ingredientsV2: RecipeIngredient[] = allProducts.map(product => ({
      productBarcode: product.barcode,
      productName: product.productName,
      productBrand: product.brand,
      ingredientText: `${product.productName}`,
      quantity: 1,
      unit: 'serving',
      nutrition: {
        calories: product.nutrition.calories,
        protein: product.nutrition.protein,
        carbs: product.nutrition.carbs,
        fat: product.nutrition.fat,
        saturatedFat: product.nutrition.saturatedFat,
        transFat: product.nutrition.transFat,
        fiber: product.nutrition.fiber,
        sugars: product.nutrition.sugars,
        addedSugars: product.nutrition.addedSugars,
        sodium: product.nutrition.sodium,
        cholesterol: product.nutrition.cholesterol,
        vitaminD: product.nutrition.vitaminD,
        calcium: product.nutrition.calcium,
        iron: product.nutrition.iron,
        potassium: product.nutrition.potassium
      }
    }))

    const ingredients = allProducts.map(p => p.productName)

    // Calculate nutrition
    const nutrition = calculateNutrition(allProducts, servingSize)

    // Generate recipe ID
    const recipeId = `ml-recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    return {
      id: recipeId,
      name,
      description,
      mealType,
      prepTime: needsCooking ? 30 : 10,
      servingSize,
      ingredientsV2,
      ingredients,
      recipeSteps: steps,
      cookingTips: tips,
      calories: nutrition.calories,
      macros: nutrition.macros,
      autoCalculatedNutrition: true,
      dietaryTags,
      allergens,
      status: 'draft',
      generatedByAI: true,
      mlGenerated: true,
      mlSource: 'product_associations',
      mlConfidence: Math.min(avgLift / 3, 1), // Normalize lift to 0-1
      requiresCooking: needsCooking,
      createdAt: new Date(),
      updatedAt: new Date(),
      popularity: 0
    }
  } catch (error) {
    logger.error('Error building recipe', error as Error, { mainProduct: mainProduct.barcode })
    return null
  }
}

/**
 * Generate recipes from product associations
 */
export async function generateRecipesFromAssociations(
  limit: number = RECIPES_PER_RUN
): Promise<{ generated: number; skipped: number; recipes: GeneratedRecipe[] }> {
  logger.info('Starting ML recipe generation from product associations...')

  // Fetch product associations
  const associationsSnapshot = await adminDb
    .collection('product_associations')
    .orderBy('analyzedAt', 'desc')
    .limit(100)
    .get()

  if (associationsSnapshot.empty) {
    logger.warn('No product associations found. Run analysis first.')
    return { generated: 0, skipped: 0, recipes: [] }
  }

  const associations: ProductAssociation[] = associationsSnapshot.docs.map(doc => doc.data() as ProductAssociation)
  logger.info(`Found ${associations.length} product associations`)

  const generatedRecipes: GeneratedRecipe[] = []
  let skipped = 0

  for (const association of associations) {
    if (generatedRecipes.length >= limit) break

    // Filter for strong associations
    const strongRelated = association.relatedProducts.filter(r => r.lift >= MIN_LIFT_FOR_RECIPE)

    if (strongRelated.length < MIN_INGREDIENTS - 1) {
      skipped++
      continue
    }

    // Fetch main product details
    const mainProductDoc = await adminDb.collection('product_database').doc(association.barcode).get()
    if (!mainProductDoc.exists) {
      skipped++
      continue
    }
    const mainProduct = mainProductDoc.data() as Product

    // Fetch related product details
    const relatedProducts: Product[] = []
    for (const related of strongRelated.slice(0, MAX_INGREDIENTS - 1)) {
      const relatedDoc = await adminDb.collection('product_database').doc(related.barcode).get()
      if (relatedDoc.exists) {
        relatedProducts.push(relatedDoc.data() as Product)
      }
    }

    if (relatedProducts.length < MIN_INGREDIENTS - 1) {
      skipped++
      continue
    }

    // Calculate average lift
    const avgLift = strongRelated.reduce((sum, r) => sum + r.lift, 0) / strongRelated.length

    // Build recipe
    const recipe = await buildRecipe(mainProduct, relatedProducts, avgLift)

    if (recipe) {
      generatedRecipes.push(recipe)
      logger.info(`Generated recipe: ${recipe.name} (${recipe.ingredientsV2.length} ingredients, lift: ${avgLift.toFixed(2)})`)
    } else {
      skipped++
    }
  }

  logger.info(`Generated ${generatedRecipes.length} recipes, skipped ${skipped}`)
  return { generated: generatedRecipes.length, skipped, recipes: generatedRecipes }
}

/**
 * Save generated recipes to Firestore
 */
export async function saveGeneratedRecipes(recipes: GeneratedRecipe[]): Promise<void> {
  logger.info(`Saving ${recipes.length} generated recipes to Firestore...`)

  const batch = adminDb.batch()
  let batchCount = 0

  for (const recipe of recipes) {
    const docRef = adminDb.collection('recipes').doc(recipe.id)
    batch.set(docRef, recipe)
    batchCount++

    if (batchCount >= 500) {
      await batch.commit()
      logger.info(`Committed batch of ${batchCount} recipes`)
      batchCount = 0
    }
  }

  if (batchCount > 0) {
    await batch.commit()
    logger.info(`Committed final batch of ${batchCount} recipes`)
  }

  logger.info(`Saved ${recipes.length} recipes to Firestore`)
}

// Utility functions
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
