/**
 * Member Recipe Engine
 *
 * Generates personalized, medically-safe recipe suggestions for family members based on:
 * 1. Medical safety (conditions, vitals, medications) - PRIORITY #1
 * 2. Household inventory availability
 * 3. Expiring ingredients (reduce waste)
 * 4. Dietary preferences
 * 5. Member-specific goals
 *
 * DRY: Reuses meal-suggestions.ts, medical-recipe-engine.ts, and inventory hooks
 */

import type { MealSuggestion, MealType, SuggestionFilters } from './meal-suggestions'
import { getMealSuggestions, MEAL_SUGGESTIONS } from './meal-suggestions'
import {
  evaluateRecipeSafety,
  buildMedicalConstraints,
  filterSafeRecipes,
  type MedicalRecipeConstraints,
  type MedicalRecipeSafetyResult
} from './medical-recipe-engine'
import type { PatientProfile, PatientMedication, VitalSign } from '@/types/medical'
import type { ShoppingItem } from '@/types/shopping'
import { logger } from './logger'

// ==================== TYPES ====================

export interface MemberRecipeSuggestion extends MealSuggestion {
  // Medical safety
  safetyResult: MedicalRecipeSafetyResult
  medicalBadges: string[]

  // Inventory availability
  inventoryAvailability: {
    availableCount: number
    totalCount: number
    percentage: number
    missingIngredients: string[]
    expiringIngredients: Array<{
      name: string
      daysUntilExpiry: number
    }>
  }

  // Overall score
  priorityScore: number // 0-100, combines safety + availability + urgency
  urgency: 'critical' | 'high' | 'medium' | 'low'
}

export interface MemberRecipeEngineOptions {
  // Member profile
  patient: PatientProfile
  medications: PatientMedication[]
  recentVitals: VitalSign[]
  questionnaireResponses?: Record<string, any>

  // Inventory
  householdInventory: ShoppingItem[]

  // Filters
  mealType: MealType
  maxResults?: number
  availableRecipes?: MealSuggestion[] // Custom recipe set (e.g., from Firestore)

  // Preferences
  prioritizeExpiring?: boolean // Suggest recipes using expiring items
  minAvailability?: number // Minimum % inventory availability (default: 0)
}

// ==================== MAIN ENGINE ====================

/**
 * Generate personalized recipe suggestions for a family member
 */
export async function getMemberRecipeSuggestions(
  options: MemberRecipeEngineOptions
): Promise<MemberRecipeSuggestion[]> {
  const {
    patient,
    medications,
    recentVitals,
    questionnaireResponses,
    householdInventory,
    mealType,
    maxResults = 10,
    availableRecipes,
    prioritizeExpiring = true,
    minAvailability = 0
  } = options

  logger.info('[Member Recipe Engine] Generating suggestions', {
    patientId: patient.id,
    mealType,
    inventoryItems: householdInventory.length,
    medications: medications.length
  })

  // Step 1: Build medical constraints
  const constraints = buildMedicalConstraints(
    patient,
    medications,
    recentVitals,
    questionnaireResponses
  )

  // Step 2: Get base recipe set using existing meal-suggestions logic (DRY)
  const baseFilters: SuggestionFilters = {
    mealType,
    userId: patient.userId,
    dietaryPreferences: [], // TODO: Fetch health conditions from separate collection
    allergies: constraints.allergens,
    calorieMin: constraints.calorieTarget ? constraints.calorieTarget / 3 * 0.7 : undefined,
    calorieMax: constraints.calorieTarget ? constraints.calorieTarget / 3 * 1.3 : undefined,
    maxResults: 50, // Get more recipes to filter
    recipes: availableRecipes // Use custom recipes if provided
  }

  const baseRecipes = getMealSuggestions(baseFilters)

  // Step 3: Analyze medical safety (but don't filter out - show warnings instead)
  // We want to show ALL recipes with inventory badges, even if they have warnings
  const analyzedRecipes = baseRecipes.map(recipe => ({
    recipe,
    safetyResult: evaluateRecipeSafety(recipe, constraints)
  }))

  const fullySafeCount = analyzedRecipes.filter(r => r.safetyResult.isSafe && r.safetyResult.warnings.length === 0).length

  logger.info('[Member Recipe Engine] Recipe safety analysis complete', {
    patientId: patient.id,
    totalRecipes: baseRecipes.length,
    fullySafe: fullySafeCount,
    withWarnings: analyzedRecipes.filter(r => r.safetyResult.warnings.length > 0).length,
    unsafe: analyzedRecipes.filter(r => !r.safetyResult.isSafe).length
  })

  // Step 4: Enhance with inventory availability
  const enhancedRecipes = analyzedRecipes.map(({ recipe, safetyResult }) => {
    const inventoryData = calculateInventoryAvailability(recipe, householdInventory)
    const priorityScore = calculatePriorityScore(
      safetyResult,
      inventoryData,
      prioritizeExpiring
    )
    const urgency = calculateUrgency(inventoryData)

    const suggestion: MemberRecipeSuggestion = {
      ...recipe,
      safetyResult, // Add the safety result
      medicalBadges: safetyResult.badges.map(b => b.label),
      inventoryAvailability: inventoryData,
      priorityScore,
      urgency
    }

    return suggestion
  })

  // Step 5: Filter by minimum availability
  const filteredRecipes = enhancedRecipes.filter(r =>
    r.inventoryAvailability.percentage >= minAvailability
  )

  // Step 6: Sort by priority score (safety + availability + urgency)
  const sortedRecipes = filteredRecipes.sort((a, b) => {
    // Prioritize critical urgency (expiring soon)
    if (a.urgency === 'critical' && b.urgency !== 'critical') return -1
    if (b.urgency === 'critical' && a.urgency !== 'critical') return 1

    // Then by priority score
    return b.priorityScore - a.priorityScore
  })

  // Step 7: Limit results
  const finalRecipes = sortedRecipes.slice(0, maxResults)

  logger.info('[Member Recipe Engine] Suggestions generated', {
    patientId: patient.id,
    totalAnalyzed: analyzedRecipes.length,
    afterInventoryFilter: filteredRecipes.length,
    final: finalRecipes.length,
    fullySafe: finalRecipes.filter(r => r.safetyResult.isSafe && r.safetyResult.warnings.length === 0).length,
    withWarnings: finalRecipes.filter(r => r.safetyResult.warnings.length > 0).length
  })

  return finalRecipes
}

// ==================== INVENTORY MATCHING ====================

/**
 * Calculate how many recipe ingredients are available in household inventory
 */
function calculateInventoryAvailability(
  recipe: MealSuggestion,
  inventory: ShoppingItem[]
): MemberRecipeSuggestion['inventoryAvailability'] {
  const totalIngredients = recipe.ingredients.length
  let availableCount = 0
  const missingIngredients: string[] = []
  const expiringIngredients: Array<{ name: string; daysUntilExpiry: number }> = []

  const now = new Date()

  recipe.ingredients.forEach(ingredient => {
    const normalizedIngredient = ingredient.toLowerCase()

    // Find matching inventory item
    const match = inventory.find(item => {
      const normalizedProduct = item.productName.toLowerCase()

      // Simple matching: check if product name is in ingredient or vice versa
      return (
        normalizedIngredient.includes(normalizedProduct) ||
        normalizedProduct.includes(normalizedIngredient) ||
        ingredientMatchesProduct(normalizedIngredient, normalizedProduct)
      )
    })

    if (match && match.inStock) {
      availableCount++

      // Check if expiring soon
      if (match.expiresAt) {
        const expiryDate = new Date(match.expiresAt)
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

        if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
          expiringIngredients.push({
            name: match.productName,
            daysUntilExpiry
          })
        }
      }
    } else {
      missingIngredients.push(ingredient)
    }
  })

  const percentage = totalIngredients > 0
    ? Math.round((availableCount / totalIngredients) * 100)
    : 0

  return {
    availableCount,
    totalCount: totalIngredients,
    percentage,
    missingIngredients,
    expiringIngredients
  }
}

/**
 * Enhanced ingredient matching logic
 */
function ingredientMatchesProduct(ingredient: string, product: string): boolean {
  // Extract key words from both
  const ingredientWords = ingredient
    .replace(/[0-9]/g, '') // Remove numbers
    .replace(/\b(cup|cups|tbsp|tsp|oz|lb|lbs|g|kg|ml|l)\b/gi, '') // Remove units
    .split(/\s+/)
    .filter(w => w.length > 2) // Ignore small words

  const productWords = product.split(/\s+/).filter(w => w.length > 2)

  // Check if any significant words match
  return ingredientWords.some(iw =>
    productWords.some(pw => pw.includes(iw) || iw.includes(pw))
  )
}

// ==================== SCORING ====================

/**
 * Calculate overall priority score combining safety, availability, and urgency
 */
function calculatePriorityScore(
  safetyResult: MedicalRecipeSafetyResult,
  inventoryData: MemberRecipeSuggestion['inventoryAvailability'],
  prioritizeExpiring: boolean
): number {
  // Safety is most important (60% weight)
  const safetyScore = safetyResult.score * 0.6

  // Inventory availability (30% weight)
  const availabilityScore = inventoryData.percentage * 0.3

  // Expiring ingredients urgency (10% weight)
  let expiryBonus = 0
  if (prioritizeExpiring && inventoryData.expiringIngredients.length > 0) {
    // Higher bonus for items expiring sooner
    const avgDaysUntilExpiry = inventoryData.expiringIngredients.reduce(
      (sum, item) => sum + item.daysUntilExpiry,
      0
    ) / inventoryData.expiringIngredients.length

    if (avgDaysUntilExpiry <= 1) {
      expiryBonus = 10 // Critical - expires today/tomorrow
    } else if (avgDaysUntilExpiry <= 3) {
      expiryBonus = 7 // High urgency
    } else if (avgDaysUntilExpiry <= 7) {
      expiryBonus = 4 // Medium urgency
    }
  }

  return Math.min(100, safetyScore + availabilityScore + expiryBonus)
}

/**
 * Calculate urgency based on expiring ingredients
 */
function calculateUrgency(
  inventoryData: MemberRecipeSuggestion['inventoryAvailability']
): MemberRecipeSuggestion['urgency'] {
  if (inventoryData.expiringIngredients.length === 0) {
    return 'low'
  }

  const earliestExpiry = Math.min(
    ...inventoryData.expiringIngredients.map(i => i.daysUntilExpiry)
  )

  if (earliestExpiry <= 1) return 'critical' // Expires today/tomorrow
  if (earliestExpiry <= 3) return 'high' // Expires in 3 days
  if (earliestExpiry <= 7) return 'medium' // Expires in a week

  return 'low'
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get missing ingredients as shopping list items
 */
export function getMissingIngredientsForRecipe(
  recipe: MemberRecipeSuggestion,
  householdId: string,
  memberId: string
): Array<{
  productName: string
  quantity: number
  unit: string
  reason: string
}> {
  return recipe.inventoryAvailability.missingIngredients.map(ingredient => {
    // Parse ingredient string to extract quantity and unit
    const parts = ingredient.split(' ')
    const quantity = parseFloat(parts[0]) || 1
    const unit = isNaN(parseFloat(parts[0])) ? 'count' : (parts[1] || 'count')
    const name = isNaN(parseFloat(parts[0]))
      ? ingredient
      : parts.slice(unit === 'count' ? 1 : 2).join(' ')

    return {
      productName: name,
      quantity,
      unit,
      reason: `For recipe: ${recipe.name}`
    }
  })
}

/**
 * Generate daily meal plan for a member
 */
export async function generateDailyMealPlan(
  patient: PatientProfile,
  medications: PatientMedication[],
  recentVitals: VitalSign[],
  householdInventory: ShoppingItem[],
  questionnaireResponses?: Record<string, any>
): Promise<{
  breakfast: MemberRecipeSuggestion[]
  lunch: MemberRecipeSuggestion[]
  dinner: MemberRecipeSuggestion[]
  snacks: MemberRecipeSuggestion[]
}> {
  const baseOptions = {
    patient,
    medications,
    recentVitals,
    householdInventory,
    questionnaireResponses,
    maxResults: 3,
    prioritizeExpiring: true
  }

  const [breakfast, lunch, dinner, snacks] = await Promise.all([
    getMemberRecipeSuggestions({ ...baseOptions, mealType: 'breakfast' }),
    getMemberRecipeSuggestions({ ...baseOptions, mealType: 'lunch' }),
    getMemberRecipeSuggestions({ ...baseOptions, mealType: 'dinner' }),
    getMemberRecipeSuggestions({ ...baseOptions, mealType: 'snack' })
  ])

  return { breakfast, lunch, dinner, snacks }
}
